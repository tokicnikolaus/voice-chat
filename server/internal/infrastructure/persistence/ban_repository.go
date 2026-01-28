package persistence

import (
	"errors"
	"sync"

	"voice-chat/internal/domain/entity"
)

var ErrBanNotFound = errors.New("ban not found")

// InMemoryBanRepository is an in-memory implementation of BanRepository
type InMemoryBanRepository struct {
	bans  map[string]*entity.Ban // id -> ban
	ipMap map[string]string      // ip -> ban id
	mu    sync.RWMutex
}

// NewInMemoryBanRepository creates a new InMemoryBanRepository
func NewInMemoryBanRepository() *InMemoryBanRepository {
	return &InMemoryBanRepository{
		bans:  make(map[string]*entity.Ban),
		ipMap: make(map[string]string),
	}
}

// Create stores a new ban
func (r *InMemoryBanRepository) Create(ban *entity.Ban) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.bans[ban.ID] = ban
	r.ipMap[ban.UserIP] = ban.ID
	return nil
}

// GetByIP retrieves an active ban by IP address
func (r *InMemoryBanRepository) GetByIP(ip string) (*entity.Ban, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	banID, exists := r.ipMap[ip]
	if !exists {
		return nil, ErrBanNotFound
	}

	ban, exists := r.bans[banID]
	if !exists {
		return nil, ErrBanNotFound
	}

	// Check if expired
	if ban.IsExpired() {
		return nil, ErrBanNotFound
	}

	return ban, nil
}

// GetAll retrieves all active bans
func (r *InMemoryBanRepository) GetAll() ([]*entity.Ban, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	activeBans := make([]*entity.Ban, 0)
	for _, ban := range r.bans {
		if !ban.IsExpired() {
			activeBans = append(activeBans, ban)
		}
	}
	return activeBans, nil
}

// Delete removes a ban by ID
func (r *InMemoryBanRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	ban, exists := r.bans[id]
	if !exists {
		return ErrBanNotFound
	}

	delete(r.ipMap, ban.UserIP)
	delete(r.bans, id)
	return nil
}

// DeleteExpired removes all expired bans
func (r *InMemoryBanRepository) DeleteExpired() (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	count := 0
	for id, ban := range r.bans {
		if ban.IsExpired() {
			delete(r.ipMap, ban.UserIP)
			delete(r.bans, id)
			count++
		}
	}
	return count, nil
}

// IsBanned checks if an IP is currently banned
func (r *InMemoryBanRepository) IsBanned(ip string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	banID, exists := r.ipMap[ip]
	if !exists {
		return false
	}

	ban, exists := r.bans[banID]
	if !exists {
		return false
	}

	return !ban.IsExpired()
}
