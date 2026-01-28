package entity

import (
	"time"
)

// ActivityType represents the type of logged activity
type ActivityType string

const (
	ActivityTypeUserJoin     ActivityType = "user_join"
	ActivityTypeUserLeave    ActivityType = "user_leave"
	ActivityTypeRoomCreate   ActivityType = "room_create"
	ActivityTypeRoomClose    ActivityType = "room_close"
	ActivityTypeAdminMute    ActivityType = "admin_mute"
	ActivityTypeAdminKick    ActivityType = "admin_kick"
	ActivityTypeAdminBan     ActivityType = "admin_ban"
	ActivityTypeAdminStealth ActivityType = "admin_stealth"
)

// ActivityLog represents a logged activity for analytics
type ActivityLog struct {
	ID        string
	Type      ActivityType
	UserID    string
	UserName  string
	RoomID    string
	RoomName  string
	Details   map[string]interface{}
	Timestamp time.Time
	IP        string
}

// NewActivityLog creates a new activity log entry
func NewActivityLog(id string, activityType ActivityType, userID, userName, roomID, roomName, ip string) *ActivityLog {
	return &ActivityLog{
		ID:        id,
		Type:      activityType,
		UserID:    userID,
		UserName:  userName,
		RoomID:    roomID,
		RoomName:  roomName,
		Details:   make(map[string]interface{}),
		Timestamp: time.Now(),
		IP:        ip,
	}
}

// AddDetail adds a detail to the log entry
func (a *ActivityLog) AddDetail(key string, value interface{}) {
	a.Details[key] = value
}

// Stats represents aggregated statistics
type Stats struct {
	ActiveRooms     int                `json:"active_rooms"`
	TotalUsers      int                `json:"total_users"`
	UsersPerRoom    map[string]int     `json:"users_per_room"`
	PeakUsersToday  int                `json:"peak_users_today"`
	TotalJoinsToday int                `json:"total_joins_today"`
	RoomStats       map[string]*RoomStats `json:"room_stats"`
}

// RoomStats represents statistics for a single room
type RoomStats struct {
	RoomID       string    `json:"room_id"`
	RoomName     string    `json:"room_name"`
	CurrentUsers int       `json:"current_users"`
	TotalJoins   int       `json:"total_joins"`
	CreatedAt    time.Time `json:"created_at"`
}

// NewStats creates a new Stats instance
func NewStats() *Stats {
	return &Stats{
		UsersPerRoom: make(map[string]int),
		RoomStats:    make(map[string]*RoomStats),
	}
}
