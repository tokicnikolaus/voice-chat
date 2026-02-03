package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	"github.com/livekit/protocol/webhook"

	"voice-chat/internal/domain/repository"
	"voice-chat/internal/infrastructure/notification"
	"voice-chat/internal/infrastructure/persistence"
	"voice-chat/pkg/config"
)

// LiveKitWebhookHandler handles incoming webhooks from LiveKit
type LiveKitWebhookHandler struct {
	roomRepo      repository.RoomRepository
	analyticsRepo *persistence.InMemoryAnalyticsRepository
	notifyService *notification.NotificationService
	tokenProvider *auth.SimpleKeyProvider
	config        *config.Config
}

// NewLiveKitWebhookHandler creates a new webhook handler
func NewLiveKitWebhookHandler(
	roomRepo repository.RoomRepository,
	analyticsRepo *persistence.InMemoryAnalyticsRepository,
	notifyService *notification.NotificationService,
	cfg *config.Config,
) *LiveKitWebhookHandler {
	return &LiveKitWebhookHandler{
		roomRepo:      roomRepo,
		analyticsRepo: analyticsRepo,
		notifyService: notifyService,
		tokenProvider: auth.NewSimpleKeyProvider(cfg.LiveKitAPIKey, cfg.LiveKitAPISecret),
		config:        cfg,
	}
}

// HandleWebhook processes incoming LiveKit webhook events
func (h *LiveKitWebhookHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	// Verify webhook signature and parse event
	event, err := webhook.ReceiveWebhookEvent(r, h.tokenProvider)
	if err != nil {
		log.Printf("Failed to verify webhook: %v", err)
		http.Error(w, "Invalid webhook signature", http.StatusUnauthorized)
		return
	}

	// Log the event
	log.Printf("LiveKit webhook received: %s", event.Event)

	// Handle different event types
	switch event.Event {
	case "room_started":
		h.handleRoomStarted(event)
	case "room_finished":
		h.handleRoomFinished(event)
	case "participant_joined":
		h.handleParticipantJoined(event)
	case "participant_left":
		h.handleParticipantLeft(event)
	case "track_published":
		h.handleTrackPublished(event)
	case "track_unpublished":
		h.handleTrackUnpublished(event)
	default:
		log.Printf("Unhandled LiveKit webhook event: %s", event.Event)
	}

	// Acknowledge receipt
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "received"})
}

// handleRoomStarted is called when a LiveKit room is created
func (h *LiveKitWebhookHandler) handleRoomStarted(event *livekit.WebhookEvent) {
	room := event.Room
	if room == nil {
		log.Printf("Room started event missing room data")
		return
	}

	log.Printf("LiveKit room started: %s (sid: %s)", room.Name, room.Sid)

	// Start analytics session for this room
	_, err := h.analyticsRepo.StartRoomSession(room.Sid, room.Name, "livekit")
	if err != nil {
		log.Printf("Failed to start room session: %v", err)
	}
}

// handleRoomFinished is called when a LiveKit room is closed (empty)
func (h *LiveKitWebhookHandler) handleRoomFinished(event *livekit.WebhookEvent) {
	room := event.Room
	if room == nil {
		log.Printf("Room finished event missing room data")
		return
	}

	log.Printf("LiveKit room finished: %s (sid: %s)", room.Name, room.Sid)

	// Get session analytics before ending
	session, _ := h.analyticsRepo.GetRoomSession(room.Sid)

	// End the analytics session
	if err := h.analyticsRepo.EndRoomSession(room.Sid); err != nil {
		log.Printf("Failed to end room session: %v", err)
	}

	// Calculate duration and stats
	var duration time.Duration
	var peakParticipants, totalJoins int
	if session != nil {
		duration = session.Duration()
		peakParticipants = session.PeakParticipants
		totalJoins = session.TotalJoins
	}

	// Notify about room closure with analytics
	h.notifyService.NotifyRoomClosed(room.Sid, room.Name, duration, peakParticipants, totalJoins)

	// Also notify room empty
	h.notifyService.NotifyRoomEmpty(room.Sid, room.Name, duration)
}

// handleParticipantJoined is called when a user joins a LiveKit room
func (h *LiveKitWebhookHandler) handleParticipantJoined(event *livekit.WebhookEvent) {
	room := event.Room
	participant := event.Participant

	if room == nil || participant == nil {
		log.Printf("Participant joined event missing data")
		return
	}

	log.Printf("Participant joined: %s (%s) in room %s",
		participant.Name, participant.Identity, room.Name)

	// Start participant session
	_, err := h.analyticsRepo.StartParticipantSession(
		participant.Identity,
		participant.Name,
		room.Sid,
		room.Name,
	)
	if err != nil {
		log.Printf("Failed to start participant session: %v", err)
	}

	// Update room session metrics
	if err := h.analyticsRepo.RecordParticipantJoin(room.Sid, int(room.NumParticipants)); err != nil {
		log.Printf("Failed to record participant join: %v", err)
	}
}

// handleParticipantLeft is called when a user leaves/disconnects from a LiveKit room
func (h *LiveKitWebhookHandler) handleParticipantLeft(event *livekit.WebhookEvent) {
	room := event.Room
	participant := event.Participant

	if room == nil || participant == nil {
		log.Printf("Participant left event missing data")
		return
	}

	log.Printf("Participant left: %s (%s) from room %s, %d remaining",
		participant.Name, participant.Identity, room.Name, room.NumParticipants)

	// End participant session
	reason := "disconnected"
	if err := h.analyticsRepo.EndParticipantSession(participant.Identity, room.Sid, reason); err != nil {
		log.Printf("Failed to end participant session: %v", err)
	}

	// Update room session metrics
	if err := h.analyticsRepo.RecordParticipantLeave(room.Sid); err != nil {
		log.Printf("Failed to record participant leave: %v", err)
	}

	// Get remaining participants from our app's room data
	remainingParticipants := h.getRemainingParticipants(room.Name, participant.Identity)

	// Send notification about user disconnecting - other users in room will be notified
	h.notifyService.NotifyUserDisconnected(
		participant.Identity,
		participant.Name,
		room.Sid,
		room.Name,
		remainingParticipants,
	)
}

// getRemainingParticipants gets the list of remaining participant names in a room
func (h *LiveKitWebhookHandler) getRemainingParticipants(roomName, excludeUserID string) []string {
	appRoom, err := h.roomRepo.GetByName(roomName)
	if err != nil || appRoom == nil {
		return []string{}
	}

	participants := appRoom.GetAllParticipants()
	remaining := make([]string, 0, len(participants))
	for _, p := range participants {
		if p.ID != excludeUserID {
			remaining = append(remaining, p.Name)
		}
	}
	return remaining
}

// handleTrackPublished is called when a participant publishes a track (audio/video)
func (h *LiveKitWebhookHandler) handleTrackPublished(event *livekit.WebhookEvent) {
	room := event.Room
	participant := event.Participant
	track := event.Track

	if room == nil || participant == nil || track == nil {
		return
	}

	log.Printf("Track published: %s by %s in %s (type: %s)",
		track.Sid, participant.Identity, room.Name, track.Type)
}

// handleTrackUnpublished is called when a participant unpublishes a track
func (h *LiveKitWebhookHandler) handleTrackUnpublished(event *livekit.WebhookEvent) {
	room := event.Room
	participant := event.Participant
	track := event.Track

	if room == nil || participant == nil || track == nil {
		return
	}

	log.Printf("Track unpublished: %s by %s in %s",
		track.Sid, participant.Identity, room.Name)
}

// GetAnalytics returns the current analytics data (HTTP endpoint)
func (h *LiveKitWebhookHandler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	// Get analytics for last 24 hours
	since := time.Now().Add(-24 * time.Hour)
	analytics, err := h.analyticsRepo.GetRoomAnalytics(since)
	if err != nil {
		http.Error(w, "Failed to get analytics", http.StatusInternalServerError)
		return
	}

	// Get active sessions
	activeSessions, _ := h.analyticsRepo.GetActiveRoomSessions()

	// Format active sessions for JSON
	activeSessionsData := make([]map[string]interface{}, 0, len(activeSessions))
	for _, s := range activeSessions {
		activeSessionsData = append(activeSessionsData, map[string]interface{}{
			"room_id":           s.RoomID,
			"room_name":         s.RoomName,
			"started_at":        s.StartedAt,
			"duration_seconds":  s.Duration().Seconds(),
			"peak_participants": s.PeakParticipants,
			"total_joins":       s.TotalJoins,
		})
	}

	response := map[string]interface{}{
		"period":          "last_24_hours",
		"generated_at":    time.Now(),
		"active_sessions": activeSessionsData,
		"summary": map[string]interface{}{
			"total_rooms_closed":        analytics.TotalRoomsClosed,
			"average_room_duration_sec": analytics.AverageRoomDuration.Seconds(),
			"total_participant_time_sec": analytics.TotalParticipantTime.Seconds(),
		},
		"room_stats": analytics.RoomDurations,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
