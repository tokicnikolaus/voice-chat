package entity

import (
	"time"
)

// Ban represents a temporary ban for a user
type Ban struct {
	ID        string
	UserIP    string
	UserName  string
	Reason    string
	BannedBy  string // Admin ID
	BannedAt  time.Time
	ExpiresAt time.Time
}

// NewBan creates a new ban entry
func NewBan(id, userIP, userName, reason, bannedBy string, duration time.Duration) *Ban {
	now := time.Now()
	return &Ban{
		ID:        id,
		UserIP:    userIP,
		UserName:  userName,
		Reason:    reason,
		BannedBy:  bannedBy,
		BannedAt:  now,
		ExpiresAt: now.Add(duration),
	}
}

// IsExpired checks if the ban has expired
func (b *Ban) IsExpired() bool {
	return time.Now().After(b.ExpiresAt)
}

// TimeRemaining returns the remaining ban duration
func (b *Ban) TimeRemaining() time.Duration {
	remaining := time.Until(b.ExpiresAt)
	if remaining < 0 {
		return 0
	}
	return remaining
}
