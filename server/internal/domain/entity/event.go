package entity

import (
	"time"
)

// EventType represents the type of WebSocket event
type EventType string

const (
	// Client -> Server events
	EventTypeJoinRoom      EventType = "join_room"
	EventTypeLeaveRoom     EventType = "leave_room"
	EventTypeGetRooms      EventType = "get_rooms"
	EventTypeGetRoom       EventType = "get_room"
	EventTypeCreateRoom    EventType = "create_room"
	EventTypeUpdateProfile EventType = "update_profile"
	EventTypeMuteSelf      EventType = "mute_self"
	EventTypeUnmuteSelf    EventType = "unmute_self"

	// Server -> Client events
	EventTypeRoomJoined       EventType = "room_joined"
	EventTypeRoomLeft         EventType = "room_left"
	EventTypeRoomList         EventType = "room_list"
	EventTypeRoomInfo         EventType = "room_info"
	EventTypeRoomCreated      EventType = "room_created"
	EventTypeUserJoined       EventType = "user_joined"
	EventTypeUserLeft         EventType = "user_left"
	EventTypeUserMuted        EventType = "user_muted"
	EventTypeUserUnmuted      EventType = "user_unmuted"
	EventTypeLiveKitToken     EventType = "livekit_token"
	EventTypeError            EventType = "error"
	EventTypeConnected        EventType = "connected"
	EventTypeParticipantsList EventType = "participants_list"

	// Admin events
	EventTypeAdminAuth        EventType = "admin_auth"
	EventTypeAdminAuthResult  EventType = "admin_auth_result"
	EventTypeAdminMuteUser    EventType = "admin_mute_user"
	EventTypeAdminKickUser    EventType = "admin_kick_user"
	EventTypeAdminBanUser     EventType = "admin_ban_user"
	EventTypeAdminCloseRoom   EventType = "admin_close_room"
	EventTypeAdminCreateRoom  EventType = "admin_create_room"
	EventTypeAdminGetStats    EventType = "admin_get_stats"
	EventTypeAdminStats       EventType = "admin_stats"
	EventTypeAdminJoinStealth EventType = "admin_join_stealth"
	EventTypeUserKicked       EventType = "user_kicked"
	EventTypeUserBanned       EventType = "user_banned"
	EventTypeRoomClosed       EventType = "room_closed"
)

// Event represents a WebSocket message
type Event struct {
	Type      EventType   `json:"type"`
	Payload   interface{} `json:"payload,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// NewEvent creates a new event with the current timestamp
func NewEvent(eventType EventType, payload interface{}) *Event {
	return &Event{
		Type:      eventType,
		Payload:   payload,
		Timestamp: time.Now(),
	}
}

// ErrorPayload represents an error message payload
type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// NewErrorEvent creates a new error event
func NewErrorEvent(code, message string) *Event {
	return NewEvent(EventTypeError, ErrorPayload{
		Code:    code,
		Message: message,
	})
}
