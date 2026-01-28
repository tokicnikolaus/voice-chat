package repository

import (
	"voice-chat/internal/domain/entity"
)

// BanRepository defines the interface for ban persistence operations
type BanRepository interface {
	// Create stores a new ban
	Create(ban *entity.Ban) error

	// GetByIP retrieves an active ban by IP address
	GetByIP(ip string) (*entity.Ban, error)

	// GetAll retrieves all active bans
	GetAll() ([]*entity.Ban, error)

	// Delete removes a ban by ID
	Delete(id string) error

	// DeleteExpired removes all expired bans
	DeleteExpired() (int, error)

	// IsBanned checks if an IP is currently banned
	IsBanned(ip string) bool
}
