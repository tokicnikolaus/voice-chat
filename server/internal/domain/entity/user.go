package entity

import (
	"time"
)

// VoiceMode represents the user's voice transmission mode
type VoiceMode string

const (
	VoiceModePTT VoiceMode = "ptt" // Push-to-talk
	VoiceModeVAD VoiceMode = "vad" // Voice activity detection
)

// User represents a connected user in the voice chat system
type User struct {
	ID        string
	Name      string
	RoomID    string
	VoiceMode VoiceMode
	IsMuted   bool
	IsAdmin   bool
	IsStealth bool // Admin-only: invisible in participant list
	JoinedAt  time.Time
	IP        string
}

// NewUser creates a new user with the given parameters
func NewUser(id, name, ip string, voiceMode VoiceMode) *User {
	return &User{
		ID:        id,
		Name:      name,
		VoiceMode: voiceMode,
		IsMuted:   false,
		IsAdmin:   false,
		IsStealth: false,
		JoinedAt:  time.Now(),
		IP:        ip,
	}
}

// SetRoom assigns the user to a room
func (u *User) SetRoom(roomID string) {
	u.RoomID = roomID
}

// LeaveRoom removes the user from their current room
func (u *User) LeaveRoom() {
	u.RoomID = ""
}

// Mute sets the user's muted state
func (u *User) Mute() {
	u.IsMuted = true
}

// Unmute removes the user's muted state
func (u *User) Unmute() {
	u.IsMuted = false
}

// ToggleMute toggles the user's muted state
func (u *User) ToggleMute() {
	u.IsMuted = !u.IsMuted
}

// SetVoiceMode changes the user's voice mode
func (u *User) SetVoiceMode(mode VoiceMode) {
	u.VoiceMode = mode
}

// IsInRoom checks if the user is currently in a room
func (u *User) IsInRoom() bool {
	return u.RoomID != ""
}

// CanBeSeenBy checks if this user should be visible to another user
func (u *User) CanBeSeenBy(viewer *User) bool {
	if u.IsStealth && !viewer.IsAdmin {
		return false
	}
	return true
}
