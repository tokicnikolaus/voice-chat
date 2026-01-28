package repository

import (
	"voice-chat/internal/domain/entity"
)

// RoomRepository defines the interface for room persistence operations
type RoomRepository interface {
	// Create stores a new room
	Create(room *entity.Room) error

	// GetByID retrieves a room by its ID
	GetByID(id string) (*entity.Room, error)

	// GetByName retrieves a room by its name
	GetByName(name string) (*entity.Room, error)

	// GetAll retrieves all rooms
	GetAll() ([]*entity.Room, error)

	// GetPublicRooms retrieves all public (visible) rooms
	GetPublicRooms() ([]*entity.Room, error)

	// Update updates an existing room
	Update(room *entity.Room) error

	// Delete removes a room by ID
	Delete(id string) error

	// Exists checks if a room with the given name exists
	Exists(name string) bool

	// GetEmptyRoomsSince retrieves rooms that have been empty since the given duration
	GetEmptyRoomsSince(minutes int) ([]*entity.Room, error)
}
