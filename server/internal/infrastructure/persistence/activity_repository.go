package persistence

import (
	"sort"
	"sync"
	"time"

	"voice-chat/internal/domain/entity"
)

// InMemoryActivityRepository is an in-memory implementation of ActivityRepository
type InMemoryActivityRepository struct {
	activities     []*entity.ActivityLog
	peakUsersToday int
	peakUsersDate  time.Time
	mu             sync.RWMutex
}

// NewInMemoryActivityRepository creates a new InMemoryActivityRepository
func NewInMemoryActivityRepository() *InMemoryActivityRepository {
	return &InMemoryActivityRepository{
		activities:    make([]*entity.ActivityLog, 0),
		peakUsersDate: time.Now(),
	}
}

// Log stores a new activity log entry
func (r *InMemoryActivityRepository) Log(activity *entity.ActivityLog) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.activities = append(r.activities, activity)
	return nil
}

// GetByTimeRange retrieves activities within a time range
func (r *InMemoryActivityRepository) GetByTimeRange(start, end time.Time) ([]*entity.ActivityLog, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*entity.ActivityLog, 0)
	for _, activity := range r.activities {
		if activity.Timestamp.After(start) && activity.Timestamp.Before(end) {
			result = append(result, activity)
		}
	}
	return result, nil
}

// GetByUser retrieves activities for a specific user
func (r *InMemoryActivityRepository) GetByUser(userID string) ([]*entity.ActivityLog, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*entity.ActivityLog, 0)
	for _, activity := range r.activities {
		if activity.UserID == userID {
			result = append(result, activity)
		}
	}
	return result, nil
}

// GetByRoom retrieves activities for a specific room
func (r *InMemoryActivityRepository) GetByRoom(roomID string) ([]*entity.ActivityLog, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*entity.ActivityLog, 0)
	for _, activity := range r.activities {
		if activity.RoomID == roomID {
			result = append(result, activity)
		}
	}
	return result, nil
}

// GetByType retrieves activities of a specific type
func (r *InMemoryActivityRepository) GetByType(activityType entity.ActivityType) ([]*entity.ActivityLog, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*entity.ActivityLog, 0)
	for _, activity := range r.activities {
		if activity.Type == activityType {
			result = append(result, activity)
		}
	}
	return result, nil
}

// GetRecent retrieves the most recent N activities
func (r *InMemoryActivityRepository) GetRecent(limit int) ([]*entity.ActivityLog, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Sort by timestamp descending
	sorted := make([]*entity.ActivityLog, len(r.activities))
	copy(sorted, r.activities)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Timestamp.After(sorted[j].Timestamp)
	})

	if len(sorted) <= limit {
		return sorted, nil
	}
	return sorted[:limit], nil
}

// GetStats retrieves aggregated statistics
func (r *InMemoryActivityRepository) GetStats() (*entity.Stats, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	stats := entity.NewStats()
	stats.PeakUsersToday = r.peakUsersToday
	stats.TotalJoinsToday = r.GetTodayJoinCount()

	return stats, nil
}

// GetTodayJoinCount returns the number of joins today
func (r *InMemoryActivityRepository) GetTodayJoinCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	today := time.Now().Truncate(24 * time.Hour)
	count := 0
	for _, activity := range r.activities {
		if activity.Type == entity.ActivityTypeUserJoin && activity.Timestamp.After(today) {
			count++
		}
	}
	return count
}

// GetPeakUsersToday returns the peak user count for today
func (r *InMemoryActivityRepository) GetPeakUsersToday() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	today := time.Now().Truncate(24 * time.Hour)
	if r.peakUsersDate.Before(today) {
		return 0
	}
	return r.peakUsersToday
}

// UpdatePeakUsers updates the peak user count if current is higher
func (r *InMemoryActivityRepository) UpdatePeakUsers(currentCount int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	today := time.Now().Truncate(24 * time.Hour)

	// Reset if new day
	if r.peakUsersDate.Before(today) {
		r.peakUsersToday = currentCount
		r.peakUsersDate = time.Now()
		return
	}

	// Update if higher
	if currentCount > r.peakUsersToday {
		r.peakUsersToday = currentCount
		r.peakUsersDate = time.Now()
	}
}

// Cleanup removes old activity logs (older than specified hours)
func (r *InMemoryActivityRepository) Cleanup(hoursToKeep int) int {
	r.mu.Lock()
	defer r.mu.Unlock()

	threshold := time.Now().Add(-time.Duration(hoursToKeep) * time.Hour)
	newActivities := make([]*entity.ActivityLog, 0)
	removed := 0

	for _, activity := range r.activities {
		if activity.Timestamp.After(threshold) {
			newActivities = append(newActivities, activity)
		} else {
			removed++
		}
	}

	r.activities = newActivities
	return removed
}
