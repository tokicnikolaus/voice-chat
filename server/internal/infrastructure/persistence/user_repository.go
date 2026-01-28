package persistence

import (
	"errors"
	"sync"

	"voice-chat/internal/domain/entity"
)

var ErrUserNotFound = errors.New("user not found")

// InMemoryUserRepository is an in-memory implementation of UserRepository
type InMemoryUserRepository struct {
	users map[string]*entity.User // id -> user
	mu    sync.RWMutex
}

// NewInMemoryUserRepository creates a new InMemoryUserRepository
func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{
		users: make(map[string]*entity.User),
	}
}

// Create stores a new user
func (r *InMemoryUserRepository) Create(user *entity.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.users[user.ID] = user
	return nil
}

// GetByID retrieves a user by their ID
func (r *InMemoryUserRepository) GetByID(id string) (*entity.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, exists := r.users[id]
	if !exists {
		return nil, ErrUserNotFound
	}
	return user, nil
}

// GetByName retrieves users by name
func (r *InMemoryUserRepository) GetByName(name string) ([]*entity.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]*entity.User, 0)
	for _, user := range r.users {
		if user.Name == name {
			users = append(users, user)
		}
	}
	return users, nil
}

// GetAll retrieves all connected users
func (r *InMemoryUserRepository) GetAll() ([]*entity.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]*entity.User, 0, len(r.users))
	for _, user := range r.users {
		users = append(users, user)
	}
	return users, nil
}

// GetByRoom retrieves all users in a specific room
func (r *InMemoryUserRepository) GetByRoom(roomID string) ([]*entity.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]*entity.User, 0)
	for _, user := range r.users {
		if user.RoomID == roomID {
			users = append(users, user)
		}
	}
	return users, nil
}

// Update updates an existing user
func (r *InMemoryUserRepository) Update(user *entity.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.users[user.ID]; !exists {
		return ErrUserNotFound
	}
	r.users[user.ID] = user
	return nil
}

// Delete removes a user by ID
func (r *InMemoryUserRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.users[id]; !exists {
		return ErrUserNotFound
	}
	delete(r.users, id)
	return nil
}

// ExistsInRoom checks if a user with the given name exists in a room
func (r *InMemoryUserRepository) ExistsInRoom(name string, roomID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, user := range r.users {
		if user.Name == name && user.RoomID == roomID {
			return true
		}
	}
	return false
}

// Count returns the total number of connected users
func (r *InMemoryUserRepository) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return len(r.users)
}
