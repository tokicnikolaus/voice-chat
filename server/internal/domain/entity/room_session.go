package entity

import (
	"time"
)

// RoomSession tracks the lifecycle of a room for analytics
type RoomSession struct {
	ID              string
	RoomID          string
	RoomName        string
	StartedAt       time.Time
	EndedAt         *time.Time // nil if still active
	PeakParticipants int
	TotalJoins      int
	TotalLeaves     int
	CreatedBy       string
}

// NewRoomSession creates a new room session for tracking
func NewRoomSession(id, roomID, roomName, createdBy string) *RoomSession {
	return &RoomSession{
		ID:              id,
		RoomID:          roomID,
		RoomName:        roomName,
		StartedAt:       time.Now(),
		EndedAt:         nil,
		PeakParticipants: 0,
		TotalJoins:      0,
		TotalLeaves:     0,
		CreatedBy:       createdBy,
	}
}

// End marks the session as ended
func (s *RoomSession) End() {
	now := time.Now()
	s.EndedAt = &now
}

// Duration returns how long the room was active
func (s *RoomSession) Duration() time.Duration {
	if s.EndedAt != nil {
		return s.EndedAt.Sub(s.StartedAt)
	}
	return time.Since(s.StartedAt)
}

// IsActive returns true if the session is still ongoing
func (s *RoomSession) IsActive() bool {
	return s.EndedAt == nil
}

// RecordJoin increments join count and updates peak if needed
func (s *RoomSession) RecordJoin(currentParticipants int) {
	s.TotalJoins++
	if currentParticipants > s.PeakParticipants {
		s.PeakParticipants = currentParticipants
	}
}

// RecordLeave increments leave count
func (s *RoomSession) RecordLeave() {
	s.TotalLeaves++
}

// ParticipantSession tracks individual participant time in a room
type ParticipantSession struct {
	ID          string
	UserID      string
	UserName    string
	RoomID      string
	RoomName    string
	JoinedAt    time.Time
	LeftAt      *time.Time // nil if still in room
	LeaveReason string     // "voluntary", "kicked", "disconnected", "room_closed"
}

// NewParticipantSession creates a new participant session
func NewParticipantSession(id, userID, userName, roomID, roomName string) *ParticipantSession {
	return &ParticipantSession{
		ID:          id,
		UserID:      userID,
		UserName:    userName,
		RoomID:      roomID,
		RoomName:    roomName,
		JoinedAt:    time.Now(),
		LeftAt:      nil,
		LeaveReason: "",
	}
}

// End marks the participant session as ended
func (p *ParticipantSession) End(reason string) {
	now := time.Now()
	p.LeftAt = &now
	p.LeaveReason = reason
}

// Duration returns how long the participant was in the room
func (p *ParticipantSession) Duration() time.Duration {
	if p.LeftAt != nil {
		return p.LeftAt.Sub(p.JoinedAt)
	}
	return time.Since(p.JoinedAt)
}

// RoomAnalytics contains aggregated analytics for reporting
type RoomAnalytics struct {
	TotalRoomsCreated    int                    `json:"total_rooms_created"`
	TotalRoomsClosed     int                    `json:"total_rooms_closed"`
	AverageRoomDuration  time.Duration          `json:"average_room_duration_seconds"`
	TotalParticipantTime time.Duration          `json:"total_participant_time_seconds"`
	RoomDurations        map[string]RoomDurationStats `json:"room_durations"`
}

// RoomDurationStats contains duration stats for a specific room
type RoomDurationStats struct {
	RoomName         string        `json:"room_name"`
	TotalDuration    time.Duration `json:"total_duration_seconds"`
	SessionCount     int           `json:"session_count"`
	AverageDuration  time.Duration `json:"average_duration_seconds"`
	PeakParticipants int           `json:"peak_participants"`
}
