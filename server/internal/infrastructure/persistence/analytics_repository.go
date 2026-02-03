package persistence

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"voice-chat/internal/domain/entity"
)

// InMemoryAnalyticsRepository implements AnalyticsRepository with in-memory storage
type InMemoryAnalyticsRepository struct {
	roomSessions        map[string]*entity.RoomSession        // roomID -> current session
	roomSessionHistory  []*entity.RoomSession                 // historical sessions
	participantSessions map[string]*entity.ParticipantSession // "userID:roomID" -> session
	participantHistory  []*entity.ParticipantSession          // historical sessions
	mu                  sync.RWMutex
}

// NewInMemoryAnalyticsRepository creates a new analytics repository
func NewInMemoryAnalyticsRepository() *InMemoryAnalyticsRepository {
	return &InMemoryAnalyticsRepository{
		roomSessions:        make(map[string]*entity.RoomSession),
		roomSessionHistory:  make([]*entity.RoomSession, 0),
		participantSessions: make(map[string]*entity.ParticipantSession),
		participantHistory:  make([]*entity.ParticipantSession, 0),
	}
}

// StartRoomSession creates a new room session
func (r *InMemoryAnalyticsRepository) StartRoomSession(roomID, roomName, createdBy string) (*entity.RoomSession, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Check if there's already an active session
	if existing, ok := r.roomSessions[roomID]; ok && existing.IsActive() {
		return existing, nil // Return existing active session
	}

	session := entity.NewRoomSession(uuid.New().String(), roomID, roomName, createdBy)
	r.roomSessions[roomID] = session
	return session, nil
}

// EndRoomSession marks a room session as ended
func (r *InMemoryAnalyticsRepository) EndRoomSession(roomID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	session, ok := r.roomSessions[roomID]
	if !ok {
		return fmt.Errorf("no active session for room %s", roomID)
	}

	session.End()
	r.roomSessionHistory = append(r.roomSessionHistory, session)
	delete(r.roomSessions, roomID)
	return nil
}

// GetRoomSession returns the current session for a room
func (r *InMemoryAnalyticsRepository) GetRoomSession(roomID string) (*entity.RoomSession, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	session, ok := r.roomSessions[roomID]
	if !ok {
		return nil, fmt.Errorf("no active session for room %s", roomID)
	}
	return session, nil
}

// GetActiveRoomSessions returns all active room sessions
func (r *InMemoryAnalyticsRepository) GetActiveRoomSessions() ([]*entity.RoomSession, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	sessions := make([]*entity.RoomSession, 0, len(r.roomSessions))
	for _, s := range r.roomSessions {
		sessions = append(sessions, s)
	}
	return sessions, nil
}

// GetRoomSessionHistory returns historical sessions for a room
func (r *InMemoryAnalyticsRepository) GetRoomSessionHistory(roomID string, since time.Time) ([]*entity.RoomSession, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*entity.RoomSession, 0)
	for _, s := range r.roomSessionHistory {
		if s.RoomID == roomID && s.StartedAt.After(since) {
			result = append(result, s)
		}
	}
	return result, nil
}

// StartParticipantSession creates a new participant session
func (r *InMemoryAnalyticsRepository) StartParticipantSession(userID, userName, roomID, roomName string) (*entity.ParticipantSession, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	key := fmt.Sprintf("%s:%s", userID, roomID)

	// End any existing session first
	if existing, ok := r.participantSessions[key]; ok {
		existing.End("reconnected")
		r.participantHistory = append(r.participantHistory, existing)
	}

	session := entity.NewParticipantSession(uuid.New().String(), userID, userName, roomID, roomName)
	r.participantSessions[key] = session
	return session, nil
}

// EndParticipantSession marks a participant session as ended
func (r *InMemoryAnalyticsRepository) EndParticipantSession(userID, roomID, reason string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	key := fmt.Sprintf("%s:%s", userID, roomID)
	session, ok := r.participantSessions[key]
	if !ok {
		return fmt.Errorf("no active session for user %s in room %s", userID, roomID)
	}

	session.End(reason)
	r.participantHistory = append(r.participantHistory, session)
	delete(r.participantSessions, key)
	return nil
}

// GetParticipantSession returns the current session for a participant in a room
func (r *InMemoryAnalyticsRepository) GetParticipantSession(userID, roomID string) (*entity.ParticipantSession, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	key := fmt.Sprintf("%s:%s", userID, roomID)
	session, ok := r.participantSessions[key]
	if !ok {
		return nil, fmt.Errorf("no active session for user %s in room %s", userID, roomID)
	}
	return session, nil
}

// GetActiveParticipantSessions returns all active participant sessions for a room
func (r *InMemoryAnalyticsRepository) GetActiveParticipantSessions(roomID string) ([]*entity.ParticipantSession, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*entity.ParticipantSession, 0)
	for _, s := range r.participantSessions {
		if s.RoomID == roomID {
			result = append(result, s)
		}
	}
	return result, nil
}

// GetUserSessionHistory returns historical sessions for a user
func (r *InMemoryAnalyticsRepository) GetUserSessionHistory(userID string, since time.Time) ([]*entity.ParticipantSession, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*entity.ParticipantSession, 0)
	for _, s := range r.participantHistory {
		if s.UserID == userID && s.JoinedAt.After(since) {
			result = append(result, s)
		}
	}
	return result, nil
}

// GetRoomAnalytics returns aggregated analytics
func (r *InMemoryAnalyticsRepository) GetRoomAnalytics(since time.Time) (*entity.RoomAnalytics, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	analytics := &entity.RoomAnalytics{
		RoomDurations: make(map[string]entity.RoomDurationStats),
	}

	var totalDuration time.Duration
	sessionCount := 0

	// Process historical sessions
	for _, s := range r.roomSessionHistory {
		if s.StartedAt.After(since) {
			analytics.TotalRoomsClosed++
			duration := s.Duration()
			totalDuration += duration
			sessionCount++

			// Update room-specific stats
			if stats, ok := analytics.RoomDurations[s.RoomName]; ok {
				stats.TotalDuration += duration
				stats.SessionCount++
				if s.PeakParticipants > stats.PeakParticipants {
					stats.PeakParticipants = s.PeakParticipants
				}
			} else {
				analytics.RoomDurations[s.RoomName] = entity.RoomDurationStats{
					RoomName:         s.RoomName,
					TotalDuration:    duration,
					SessionCount:     1,
					PeakParticipants: s.PeakParticipants,
				}
			}
		}
	}

	// Include active sessions
	for _, s := range r.roomSessions {
		analytics.TotalRoomsCreated++
		duration := s.Duration()
		totalDuration += duration
		sessionCount++
	}

	if sessionCount > 0 {
		analytics.AverageRoomDuration = totalDuration / time.Duration(sessionCount)
	}

	// Calculate average durations per room
	for name, stats := range analytics.RoomDurations {
		if stats.SessionCount > 0 {
			stats.AverageDuration = stats.TotalDuration / time.Duration(stats.SessionCount)
			analytics.RoomDurations[name] = stats
		}
	}

	// Calculate total participant time
	for _, s := range r.participantHistory {
		if s.JoinedAt.After(since) {
			analytics.TotalParticipantTime += s.Duration()
		}
	}
	for _, s := range r.participantSessions {
		analytics.TotalParticipantTime += s.Duration()
	}

	return analytics, nil
}

// GetRoomDuration returns the total duration for a specific room
func (r *InMemoryAnalyticsRepository) GetRoomDuration(roomID string) (time.Duration, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var total time.Duration

	// Current session
	if s, ok := r.roomSessions[roomID]; ok {
		total += s.Duration()
	}

	// Historical sessions
	for _, s := range r.roomSessionHistory {
		if s.RoomID == roomID {
			total += s.Duration()
		}
	}

	return total, nil
}

// GetAverageSessionDuration returns the average session duration
func (r *InMemoryAnalyticsRepository) GetAverageSessionDuration(since time.Time) (time.Duration, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var total time.Duration
	count := 0

	for _, s := range r.roomSessionHistory {
		if s.StartedAt.After(since) {
			total += s.Duration()
			count++
		}
	}

	if count == 0 {
		return 0, nil
	}

	return total / time.Duration(count), nil
}

// RecordParticipantJoin updates room session metrics when someone joins
func (r *InMemoryAnalyticsRepository) RecordParticipantJoin(roomID string, currentCount int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	session, ok := r.roomSessions[roomID]
	if !ok {
		return fmt.Errorf("no active session for room %s", roomID)
	}

	session.RecordJoin(currentCount)
	return nil
}

// RecordParticipantLeave updates room session metrics when someone leaves
func (r *InMemoryAnalyticsRepository) RecordParticipantLeave(roomID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	session, ok := r.roomSessions[roomID]
	if !ok {
		return fmt.Errorf("no active session for room %s", roomID)
	}

	session.RecordLeave()
	return nil
}

// Cleanup removes old session data
func (r *InMemoryAnalyticsRepository) Cleanup(hoursToKeep int) int {
	r.mu.Lock()
	defer r.mu.Unlock()

	cutoff := time.Now().Add(-time.Duration(hoursToKeep) * time.Hour)
	removed := 0

	// Clean room session history
	newRoomHistory := make([]*entity.RoomSession, 0)
	for _, s := range r.roomSessionHistory {
		if s.EndedAt != nil && s.EndedAt.After(cutoff) {
			newRoomHistory = append(newRoomHistory, s)
		} else if s.EndedAt != nil {
			removed++
		}
	}
	r.roomSessionHistory = newRoomHistory

	// Clean participant history
	newParticipantHistory := make([]*entity.ParticipantSession, 0)
	for _, s := range r.participantHistory {
		if s.LeftAt != nil && s.LeftAt.After(cutoff) {
			newParticipantHistory = append(newParticipantHistory, s)
		} else if s.LeftAt != nil {
			removed++
		}
	}
	r.participantHistory = newParticipantHistory

	return removed
}
