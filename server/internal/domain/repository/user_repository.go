package repository

import (
	"voice-chat/internal/domain/entity"
)

// UserRepository defines the interface for user persistence operations
type UserRepository interface {
	// Create stores a new user
	Create(user *entity.User) error

	// GetByID retrieves a user by their ID
	GetByID(id string) (*entity.User, error)

	// GetByName retrieves users by name (may return multiple with same name)
	GetByName(name string) ([]*entity.User, error)

	// GetAll retrieves all connected users
	GetAll() ([]*entity.User, error)

	// GetByRoom retrieves all users in a specific room
	GetByRoom(roomID string) ([]*entity.User, error)

	// Update updates an existing user
	Update(user *entity.User) error

	// Delete removes a user by ID
	Delete(id string) error

	// ExistsInRoom checks if a user with the given name exists in a room
	ExistsInRoom(name string, roomID string) bool

	// Count returns the total number of connected users
	Count() int
}
