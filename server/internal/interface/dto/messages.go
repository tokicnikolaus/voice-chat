package dto

import (
	"encoding/json"
	"time"

	"voice-chat/internal/domain/entity"
	"voice-chat/internal/usecase/room"
)

// Message represents a WebSocket message
type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// JoinRoomRequest represents a request to join a room
type JoinRoomRequest struct {
	RoomName  string `json:"room_name"`
	UserName  string `json:"user_name"`
	VoiceMode string `json:"voice_mode"` // "ptt" or "vad"
}

// JoinRoomResponse represents the response after joining a room
type JoinRoomResponse struct {
	RoomID       string             `json:"room_id"`
	RoomName     string             `json:"room_name"`
	UserID       string             `json:"user_id"`
	UserName     string             `json:"user_name"`
	LiveKitToken string             `json:"livekit_token"`
	LiveKitURL   string             `json:"livekit_url"`
	Participants []*ParticipantDTO  `json:"participants"`
	IsNewRoom    bool               `json:"is_new_room"`
}

// ParticipantDTO represents a participant in a room
type ParticipantDTO struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	IsMuted  bool   `json:"is_muted"`
	IsAdmin  bool   `json:"is_admin"`
}

// LeaveRoomRequest represents a request to leave a room
type LeaveRoomRequest struct {
	RoomID string `json:"room_id"`
}

// GetRoomRequest represents a request to get room info
type GetRoomRequest struct {
	RoomName string `json:"room_name"`
	RoomID   string `json:"room_id,omitempty"`
}

// RoomInfoResponse represents room information
type RoomInfoResponse struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Type         string            `json:"type"`
	Capacity     int               `json:"capacity"`
	Participants []*ParticipantDTO `json:"participants"`
	CanJoin      bool              `json:"can_join"`
	IsClosed     bool              `json:"is_closed"`
}

// RoomListResponse represents a list of rooms
type RoomListResponse struct {
	Rooms []*RoomSummaryDTO `json:"rooms"`
}

// RoomSummaryDTO represents a room summary
type RoomSummaryDTO struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Type             string `json:"type"`
	ParticipantCount int    `json:"participant_count"`
	Capacity         int    `json:"capacity"`
	IsFull           bool   `json:"is_full"`
}

// CreateRoomRequest represents a request to create a room (admin)
type CreateRoomRequest struct {
	Name     string `json:"name"`
	Type     string `json:"type"` // "public" or "private"
	Capacity int    `json:"capacity,omitempty"`
}

// UserJoinedEvent represents a user joined event
type UserJoinedEvent struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	RoomID   string `json:"room_id"`
}

// UserLeftEvent represents a user left event
type UserLeftEvent struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	RoomID   string `json:"room_id"`
}

// UserMutedEvent represents a user muted/unmuted event
type UserMutedEvent struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	IsMuted  bool   `json:"is_muted"`
}

// MuteSelfRequest represents a self-mute request
type MuteSelfRequest struct {
	Muted bool `json:"muted"`
}

// AdminAuthRequest represents an admin authentication request
type AdminAuthRequest struct {
	Password string `json:"password"`
}

// AdminAuthResponse represents the admin auth result
type AdminAuthResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// AdminMuteRequest represents an admin mute request
type AdminMuteRequest struct {
	UserID string `json:"user_id"`
	RoomID string `json:"room_id"`
}

// AdminKickRequest represents an admin kick request
type AdminKickRequest struct {
	UserID string `json:"user_id"`
	RoomID string `json:"room_id"`
	Reason string `json:"reason,omitempty"`
}

// AdminBanRequest represents an admin ban request
type AdminBanRequest struct {
	UserID   string `json:"user_id"`
	Reason   string `json:"reason,omitempty"`
	Duration int    `json:"duration_minutes"` // Duration in minutes
}

// AdminCloseRoomRequest represents a request to close a room
type AdminCloseRoomRequest struct {
	RoomID string `json:"room_id"`
}

// AdminJoinStealthRequest represents a stealth join request
type AdminJoinStealthRequest struct {
	RoomID string `json:"room_id"`
}

// StatsResponse represents admin statistics
type StatsResponse struct {
	ActiveRooms     int                   `json:"active_rooms"`
	TotalUsers      int                   `json:"total_users"`
	PeakUsersToday  int                   `json:"peak_users_today"`
	TotalJoinsToday int                   `json:"total_joins_today"`
	Rooms           []*RoomStatsDTO       `json:"rooms"`
	RecentActivity  []*ActivityLogDTO     `json:"recent_activity"`
	ActiveBans      int                   `json:"active_bans"`
}

// RoomStatsDTO represents room statistics
type RoomStatsDTO struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Participants int    `json:"participants"`
	Capacity     int    `json:"capacity"`
	IsPublic     bool   `json:"is_public"`
	IsClosed     bool   `json:"is_closed"`
}

// ActivityLogDTO represents an activity log entry
type ActivityLogDTO struct {
	Type      string                 `json:"type"`
	UserName  string                 `json:"user_name"`
	RoomName  string                 `json:"room_name"`
	Details   map[string]interface{} `json:"details,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// ErrorResponse represents an error message
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ConnectedResponse represents the initial connection response
type ConnectedResponse struct {
	Message string `json:"message"`
	UserID  string `json:"user_id"`
}

// UserKickedEvent represents a kick notification
type UserKickedEvent struct {
	Reason string `json:"reason"`
}

// UserBannedEvent represents a ban notification
type UserBannedEvent struct {
	Reason   string `json:"reason"`
	Duration int    `json:"duration_minutes"`
}

// RoomClosedEvent represents a room closed notification
type RoomClosedEvent struct {
	RoomID   string `json:"room_id"`
	RoomName string `json:"room_name"`
}

// ToParticipantDTO converts a User entity to ParticipantDTO
func ToParticipantDTO(user *entity.User) *ParticipantDTO {
	return &ParticipantDTO{
		ID:      user.ID,
		Name:    user.Name,
		IsMuted: user.IsMuted,
		IsAdmin: user.IsAdmin,
	}
}

// ToParticipantDTOs converts a slice of User entities to ParticipantDTOs
func ToParticipantDTOs(users []*entity.User) []*ParticipantDTO {
	dtos := make([]*ParticipantDTO, len(users))
	for i, user := range users {
		dtos[i] = ToParticipantDTO(user)
	}
	return dtos
}

// ToRoomSummaryDTO converts a room.Summary to RoomSummaryDTO
func ToRoomSummaryDTO(summary *room.RoomSummary) *RoomSummaryDTO {
	return &RoomSummaryDTO{
		ID:               summary.ID,
		Name:             summary.Name,
		Type:             string(summary.Type),
		ParticipantCount: summary.ParticipantCount,
		Capacity:         summary.Capacity,
		IsFull:           summary.IsFull,
	}
}

// ToRoomInfoDTOs converts a slice of room.Summary to RoomSummaryDTOs
func ToRoomInfoDTOs(summaries []*room.RoomSummary) []*RoomSummaryDTO {
	dtos := make([]*RoomSummaryDTO, len(summaries))
	for i, summary := range summaries {
		dtos[i] = ToRoomSummaryDTO(summary)
	}
	return dtos
}

// ToRoomInfoDTO converts a room.GetRoomOutput to RoomInfoResponse
func ToRoomInfoDTO(output *room.GetRoomOutput) *RoomInfoResponse {
	participants := make([]*ParticipantDTO, len(output.Participants))
	for i, p := range output.Participants {
		participants[i] = &ParticipantDTO{
			ID:      p.ID,
			Name:    p.Name,
			IsMuted: p.IsMuted,
			IsAdmin: p.IsAdmin,
		}
	}
	return &RoomInfoResponse{
		ID:           output.ID,
		Name:         output.Name,
		Type:         string(output.Type),
		Capacity:     output.Capacity,
		Participants: participants,
		CanJoin:      output.CanJoin,
		IsClosed:     output.IsClosed,
	}
}
