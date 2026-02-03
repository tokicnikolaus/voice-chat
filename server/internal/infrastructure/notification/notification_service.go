package notification

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// EventType represents the type of notification event
type EventType string

const (
	EventUserDisconnected EventType = "user_disconnected"
	EventUserLeftRoom     EventType = "user_left_room"
	EventRoomCreated      EventType = "room_created"
	EventRoomClosed       EventType = "room_closed"
	EventRoomEmpty        EventType = "room_empty"
)

// NotificationEvent represents an event to be sent to webhooks
type NotificationEvent struct {
	Type      EventType              `json:"type"`
	Timestamp time.Time              `json:"timestamp"`
	UserID    string                 `json:"user_id,omitempty"`
	UserName  string                 `json:"user_name,omitempty"`
	RoomID    string                 `json:"room_id,omitempty"`
	RoomName  string                 `json:"room_name,omitempty"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// WebhookEndpoint represents an external webhook URL
type WebhookEndpoint struct {
	Name   string
	URL    string
	Secret string
}

// NotificationService handles sending notifications via webhooks
type NotificationService struct {
	// Webhook endpoints for external notifications
	webhookEndpoints []WebhookEndpoint
	// HTTP client for webhook calls
	httpClient *http.Client
	mu         sync.RWMutex
}

// NewNotificationService creates a new notification service
func NewNotificationService() *NotificationService {
	return &NotificationService{
		webhookEndpoints: make([]WebhookEndpoint, 0),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// AddWebhookEndpoint adds an external webhook endpoint
func (s *NotificationService) AddWebhookEndpoint(name, url, secret string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if exists and update
	for i, ep := range s.webhookEndpoints {
		if ep.Name == name {
			s.webhookEndpoints[i] = WebhookEndpoint{Name: name, URL: url, Secret: secret}
			log.Printf("Updated webhook endpoint: %s -> %s", name, url)
			return
		}
	}
	s.webhookEndpoints = append(s.webhookEndpoints, WebhookEndpoint{
		Name:   name,
		URL:    url,
		Secret: secret,
	})
	log.Printf("Added webhook endpoint: %s -> %s", name, url)
}

// RemoveWebhookEndpoint removes a webhook endpoint
func (s *NotificationService) RemoveWebhookEndpoint(name string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, ep := range s.webhookEndpoints {
		if ep.Name == name {
			s.webhookEndpoints = append(s.webhookEndpoints[:i], s.webhookEndpoints[i+1:]...)
			log.Printf("Removed webhook endpoint: %s", name)
			return
		}
	}
}

// GetWebhookEndpoints returns all configured webhook endpoints
func (s *NotificationService) GetWebhookEndpoints() []WebhookEndpoint {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]WebhookEndpoint, len(s.webhookEndpoints))
	copy(result, s.webhookEndpoints)
	return result
}

// NotifyUserDisconnected sends notification when a user disconnects from a room
// This is triggered by LiveKit webhook when participant_left event is received
func (s *NotificationService) NotifyUserDisconnected(userID, userName, roomID, roomName string, remainingParticipants []string) {
	event := NotificationEvent{
		Type:      EventUserDisconnected,
		Timestamp: time.Now(),
		UserID:    userID,
		UserName:  userName,
		RoomID:    roomID,
		RoomName:  roomName,
		Details: map[string]interface{}{
			"remaining_participants": remainingParticipants,
			"remaining_count":        len(remainingParticipants),
		},
	}

	log.Printf("User %s disconnected from room %s, %d participants remaining",
		userName, roomName, len(remainingParticipants))

	s.sendToWebhooks(event)
}

// NotifyUserLeftRoom sends notification when a user voluntarily leaves a room
func (s *NotificationService) NotifyUserLeftRoom(userID, userName, roomID, roomName, reason string, remainingParticipants []string) {
	event := NotificationEvent{
		Type:      EventUserLeftRoom,
		Timestamp: time.Now(),
		UserID:    userID,
		UserName:  userName,
		RoomID:    roomID,
		RoomName:  roomName,
		Details: map[string]interface{}{
			"reason":                 reason,
			"remaining_participants": remainingParticipants,
			"remaining_count":        len(remainingParticipants),
		},
	}

	log.Printf("User %s left room %s (reason: %s), %d participants remaining",
		userName, roomName, reason, len(remainingParticipants))

	s.sendToWebhooks(event)
}

// NotifyRoomEmpty sends notification when a room becomes empty
func (s *NotificationService) NotifyRoomEmpty(roomID, roomName string, duration time.Duration) {
	event := NotificationEvent{
		Type:      EventRoomEmpty,
		Timestamp: time.Now(),
		RoomID:    roomID,
		RoomName:  roomName,
		Details: map[string]interface{}{
			"duration_seconds": duration.Seconds(),
			"duration_human":   formatDuration(duration),
		},
	}

	log.Printf("Room %s is now empty after %s", roomName, formatDuration(duration))
	s.sendToWebhooks(event)
}

// NotifyRoomClosed sends notification when a room is closed with analytics
func (s *NotificationService) NotifyRoomClosed(roomID, roomName string, duration time.Duration, peakParticipants, totalJoins int) {
	event := NotificationEvent{
		Type:      EventRoomClosed,
		Timestamp: time.Now(),
		RoomID:    roomID,
		RoomName:  roomName,
		Details: map[string]interface{}{
			"duration_seconds":  duration.Seconds(),
			"duration_human":    formatDuration(duration),
			"peak_participants": peakParticipants,
			"total_joins":       totalJoins,
		},
	}

	log.Printf("Room %s closed - duration: %s, peak: %d, total joins: %d",
		roomName, formatDuration(duration), peakParticipants, totalJoins)

	s.sendToWebhooks(event)
}

// sendToWebhooks sends an event to all registered webhook endpoints
func (s *NotificationService) sendToWebhooks(event NotificationEvent) {
	s.mu.RLock()
	endpoints := make([]WebhookEndpoint, len(s.webhookEndpoints))
	copy(endpoints, s.webhookEndpoints)
	s.mu.RUnlock()

	if len(endpoints) == 0 {
		return
	}

	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("Failed to marshal notification event: %v", err)
		return
	}

	for _, endpoint := range endpoints {
		go s.sendWebhook(endpoint, payload)
	}
}

// sendWebhook sends a single webhook request
func (s *NotificationService) sendWebhook(endpoint WebhookEndpoint, payload []byte) {
	req, err := http.NewRequest("POST", endpoint.URL, bytes.NewBuffer(payload))
	if err != nil {
		log.Printf("Failed to create webhook request for %s: %v", endpoint.Name, err)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Source", "voice-chat-server")
	req.Header.Set("X-Event-Timestamp", time.Now().UTC().Format(time.RFC3339))

	// Add HMAC signature if secret is configured
	if endpoint.Secret != "" {
		signature := computeHMAC(payload, endpoint.Secret)
		req.Header.Set("X-Webhook-Signature", signature)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		log.Printf("Failed to send webhook to %s: %v", endpoint.Name, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("Webhook %s returned error status: %d", endpoint.Name, resp.StatusCode)
	}
}

// computeHMAC computes HMAC-SHA256 signature
func computeHMAC(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return fmt.Sprintf("sha256=%s", hex.EncodeToString(mac.Sum(nil)))
}

// formatDuration formats duration in human-readable format
func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm %ds", int(d.Minutes()), int(d.Seconds())%60)
	}
	return fmt.Sprintf("%dh %dm", int(d.Hours()), int(d.Minutes())%60)
}
