package persistence

import (
	"errors"
	"sync"
	"time"

	"voice-chat/internal/domain/entity"
)

var ErrRoomNotFound = errors.New("room not found")

// InMemoryRoomRepository is an in-memory implementation of RoomRepository
type InMemoryRoomRepository struct {
	rooms map[string]*entity.Room // id -> room
	names map[string]string       // name -> id (for quick lookup by name)
	mu    sync.RWMutex
}

// NewInMemoryRoomRepository creates a new InMemoryRoomRepository
func NewInMemoryRoomRepository() *InMemoryRoomRepository {
	return &InMemoryRoomRepository{
		rooms: make(map[string]*entity.Room),
		names: make(map[string]string),
	}
}

// Create stores a new room
func (r *InMemoryRoomRepository) Create(room *entity.Room) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.rooms[room.ID] = room
	r.names[room.Name] = room.ID
	return nil
}

// GetByID retrieves a room by its ID
func (r *InMemoryRoomRepository) GetByID(id string) (*entity.Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	room, exists := r.rooms[id]
	if !exists {
		return nil, ErrRoomNotFound
	}
	return room, nil
}

// GetByName retrieves a room by its name
func (r *InMemoryRoomRepository) GetByName(name string) (*entity.Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	id, exists := r.names[name]
	if !exists {
		return nil, ErrRoomNotFound
	}
	room, exists := r.rooms[id]
	if !exists {
		return nil, ErrRoomNotFound
	}
	return room, nil
}

// GetAll retrieves all rooms
func (r *InMemoryRoomRepository) GetAll() ([]*entity.Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	rooms := make([]*entity.Room, 0, len(r.rooms))
	for _, room := range r.rooms {
		rooms = append(rooms, room)
	}
	return rooms, nil
}

// GetPublicRooms retrieves all public rooms
func (r *InMemoryRoomRepository) GetPublicRooms() ([]*entity.Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	rooms := make([]*entity.Room, 0)
	for _, room := range r.rooms {
		if room.IsPublic() && !room.IsClosed {
			rooms = append(rooms, room)
		}
	}
	return rooms, nil
}

// Update updates an existing room
func (r *InMemoryRoomRepository) Update(room *entity.Room) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.rooms[room.ID]; !exists {
		return ErrRoomNotFound
	}
	r.rooms[room.ID] = room
	return nil
}

// Delete removes a room by ID
func (r *InMemoryRoomRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	room, exists := r.rooms[id]
	if !exists {
		return ErrRoomNotFound
	}

	delete(r.names, room.Name)
	delete(r.rooms, id)
	return nil
}

// Exists checks if a room with the given name exists
func (r *InMemoryRoomRepository) Exists(name string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	_, exists := r.names[name]
	return exists
}

// GetEmptyRoomsSince retrieves rooms that have been empty since the given duration
func (r *InMemoryRoomRepository) GetEmptyRoomsSince(minutes int) ([]*entity.Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	threshold := time.Duration(minutes) * time.Minute
	emptyRooms := make([]*entity.Room, 0)

	for _, room := range r.rooms {
		if room.IsEmpty() && room.TimeSinceLastActivity() > threshold && !room.IsAdminCreated() {
			emptyRooms = append(emptyRooms, room)
		}
	}

	return emptyRooms, nil
}
