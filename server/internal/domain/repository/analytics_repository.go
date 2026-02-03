package repository

import (
	"time"
	"voice-chat/internal/domain/entity"
)

// AnalyticsRepository defines methods for room and participant analytics
type AnalyticsRepository interface {
	// Room sessions
	StartRoomSession(roomID, roomName, createdBy string) (*entity.RoomSession, error)
	EndRoomSession(roomID string) error
	GetRoomSession(roomID string) (*entity.RoomSession, error)
	GetActiveRoomSessions() ([]*entity.RoomSession, error)
	GetRoomSessionHistory(roomID string, since time.Time) ([]*entity.RoomSession, error)

	// Participant sessions
	StartParticipantSession(userID, userName, roomID, roomName string) (*entity.ParticipantSession, error)
	EndParticipantSession(userID, roomID, reason string) error
	GetParticipantSession(userID, roomID string) (*entity.ParticipantSession, error)
	GetActiveParticipantSessions(roomID string) ([]*entity.ParticipantSession, error)
	GetUserSessionHistory(userID string, since time.Time) ([]*entity.ParticipantSession, error)

	// Analytics queries
	GetRoomAnalytics(since time.Time) (*entity.RoomAnalytics, error)
	GetRoomDuration(roomID string) (time.Duration, error)
	GetAverageSessionDuration(since time.Time) (time.Duration, error)

	// Update metrics
	RecordParticipantJoin(roomID string, currentCount int) error
	RecordParticipantLeave(roomID string) error

	// Cleanup
	Cleanup(hoursToKeep int) int
}
