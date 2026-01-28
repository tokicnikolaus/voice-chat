package entity

import (
	"errors"
	"sync"
	"time"
)

var (
	ErrRoomFull          = errors.New("room is at capacity")
	ErrUserAlreadyInRoom = errors.New("user is already in this room")
	ErrUserNotInRoom     = errors.New("user is not in this room")
	ErrRoomClosed        = errors.New("room is closed")
)

// RoomType represents the type of room
type RoomType string

const (
	RoomTypePublic  RoomType = "public"  // Visible in room list
	RoomTypePrivate RoomType = "private" // Hidden, join by name only
)

// Room represents a voice chat room
type Room struct {
	ID           string
	Name         string
	Type         RoomType
	Capacity     int
	Participants map[string]*User // userID -> User
	CreatedBy    string           // "admin" or userID
	CreatedAt    time.Time
	LastActivity time.Time
	IsClosed     bool
	mu           sync.RWMutex // protects Participants map
}

const DefaultRoomCapacity = 15

// NewRoom creates a new room with default settings
func NewRoom(id, name string, roomType RoomType, createdBy string) *Room {
	now := time.Now()
	return &Room{
		ID:           id,
		Name:         name,
		Type:         roomType,
		Capacity:     DefaultRoomCapacity,
		Participants: make(map[string]*User),
		CreatedBy:    createdBy,
		CreatedAt:    now,
		LastActivity: now,
		IsClosed:     false,
	}
}

// NewRoomWithCapacity creates a new room with custom capacity
func NewRoomWithCapacity(id, name string, roomType RoomType, createdBy string, capacity int) *Room {
	room := NewRoom(id, name, roomType, createdBy)
	room.Capacity = capacity
	return room
}

// AddParticipant adds a user to the room
func (r *Room) AddParticipant(user *User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.IsClosed {
		return ErrRoomClosed
	}

	if _, exists := r.Participants[user.ID]; exists {
		return ErrUserAlreadyInRoom
	}

	if len(r.Participants) >= r.Capacity {
		return ErrRoomFull
	}

	r.Participants[user.ID] = user
	user.SetRoom(r.ID)
	r.LastActivity = time.Now()
	return nil
}

// RemoveParticipant removes a user from the room
func (r *Room) RemoveParticipant(userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, exists := r.Participants[userID]
	if !exists {
		return ErrUserNotInRoom
	}

	user.LeaveRoom()
	delete(r.Participants, userID)
	r.LastActivity = time.Now()
	return nil
}

// GetParticipant returns a participant by ID
func (r *Room) GetParticipant(userID string) (*User, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, exists := r.Participants[userID]
	return user, exists
}

// GetVisibleParticipants returns participants visible to a specific viewer
func (r *Room) GetVisibleParticipants(viewer *User) []*User {
	r.mu.RLock()
	defer r.mu.RUnlock()

	visible := make([]*User, 0)
	for _, participant := range r.Participants {
		if participant.CanBeSeenBy(viewer) {
			visible = append(visible, participant)
		}
	}
	return visible
}

// GetAllParticipants returns all participants (for admin views)
func (r *Room) GetAllParticipants() []*User {
	r.mu.RLock()
	defer r.mu.RUnlock()

	participants := make([]*User, 0, len(r.Participants))
	for _, p := range r.Participants {
		participants = append(participants, p)
	}
	return participants
}

// ParticipantCount returns the number of participants
func (r *Room) ParticipantCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return len(r.Participants)
}

// VisibleParticipantCount returns count of non-stealth participants
func (r *Room) VisibleParticipantCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	count := 0
	for _, p := range r.Participants {
		if !p.IsStealth {
			count++
		}
	}
	return count
}

// IsEmpty checks if the room has no participants
func (r *Room) IsEmpty() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return len(r.Participants) == 0
}

// IsFull checks if the room is at capacity
func (r *Room) IsFull() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return len(r.Participants) >= r.Capacity
}

// CanJoin checks if a user can join this room
func (r *Room) CanJoin() bool {
	return !r.IsClosed && !r.IsFull()
}

// Close marks the room as closed
func (r *Room) Close() {
	r.IsClosed = true
}

// SetCapacity changes the room's capacity
func (r *Room) SetCapacity(capacity int) {
	r.Capacity = capacity
}

// IsPublic checks if the room is publicly visible
func (r *Room) IsPublic() bool {
	return r.Type == RoomTypePublic
}

// IsAdminCreated checks if the room was created by an admin
func (r *Room) IsAdminCreated() bool {
	return r.CreatedBy == "admin"
}

// HasUser checks if a specific user is in the room
func (r *Room) HasUser(userID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	_, exists := r.Participants[userID]
	return exists
}

// TimeSinceLastActivity returns duration since last activity
func (r *Room) TimeSinceLastActivity() time.Duration {
	return time.Since(r.LastActivity)
}
