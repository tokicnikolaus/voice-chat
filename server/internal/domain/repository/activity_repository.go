package repository

import (
	"time"

	"voice-chat/internal/domain/entity"
)

// ActivityRepository defines the interface for activity log persistence
type ActivityRepository interface {
	// Log stores a new activity log entry
	Log(activity *entity.ActivityLog) error

	// GetByTimeRange retrieves activities within a time range
	GetByTimeRange(start, end time.Time) ([]*entity.ActivityLog, error)

	// GetByUser retrieves activities for a specific user
	GetByUser(userID string) ([]*entity.ActivityLog, error)

	// GetByRoom retrieves activities for a specific room
	GetByRoom(roomID string) ([]*entity.ActivityLog, error)

	// GetByType retrieves activities of a specific type
	GetByType(activityType entity.ActivityType) ([]*entity.ActivityLog, error)

	// GetRecent retrieves the most recent N activities
	GetRecent(limit int) ([]*entity.ActivityLog, error)

	// GetStats retrieves aggregated statistics
	GetStats() (*entity.Stats, error)

	// GetTodayJoinCount returns the number of joins today
	GetTodayJoinCount() int

	// GetPeakUsersToday returns the peak user count for today
	GetPeakUsersToday() int

	// UpdatePeakUsers updates the peak user count if current is higher
	UpdatePeakUsers(currentCount int)
}
