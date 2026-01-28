package admin

import (
	"voice-chat/internal/domain/entity"
	"voice-chat/internal/domain/repository"
)

// GetStatsOutput represents the admin statistics
type GetStatsOutput struct {
	ActiveRooms     int                       `json:"active_rooms"`
	TotalUsers      int                       `json:"total_users"`
	PeakUsersToday  int                       `json:"peak_users_today"`
	TotalJoinsToday int                       `json:"total_joins_today"`
	Rooms           []*RoomStatsInfo          `json:"rooms"`
	RecentActivity  []*entity.ActivityLog     `json:"recent_activity"`
	ActiveBans      int                       `json:"active_bans"`
}

// RoomStatsInfo represents statistics for a single room
type RoomStatsInfo struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Participants int    `json:"participants"`
	Capacity     int    `json:"capacity"`
	IsPublic     bool   `json:"is_public"`
	IsClosed     bool   `json:"is_closed"`
}

// GetStatsUseCase handles retrieving admin statistics
type GetStatsUseCase struct {
	roomRepo     repository.RoomRepository
	userRepo     repository.UserRepository
	banRepo      repository.BanRepository
	activityRepo repository.ActivityRepository
}

// NewGetStatsUseCase creates a new GetStatsUseCase
func NewGetStatsUseCase(
	roomRepo repository.RoomRepository,
	userRepo repository.UserRepository,
	banRepo repository.BanRepository,
	activityRepo repository.ActivityRepository,
) *GetStatsUseCase {
	return &GetStatsUseCase{
		roomRepo:     roomRepo,
		userRepo:     userRepo,
		banRepo:      banRepo,
		activityRepo: activityRepo,
	}
}

// Execute retrieves statistics for the admin dashboard
func (uc *GetStatsUseCase) Execute() (*GetStatsOutput, error) {
	// Get all rooms
	rooms, err := uc.roomRepo.GetAll()
	if err != nil {
		return nil, err
	}

	activeRooms := 0
	roomStats := make([]*RoomStatsInfo, 0, len(rooms))
	for _, room := range rooms {
		if !room.IsClosed {
			activeRooms++
		}
		roomStats = append(roomStats, &RoomStatsInfo{
			ID:           room.ID,
			Name:         room.Name,
			Participants: room.ParticipantCount(),
			Capacity:     room.Capacity,
			IsPublic:     room.IsPublic(),
			IsClosed:     room.IsClosed,
		})
	}

	// Get total users
	totalUsers := uc.userRepo.Count()

	// Get activity stats
	var peakUsers, totalJoins int
	var recentActivity []*entity.ActivityLog
	if uc.activityRepo != nil {
		peakUsers = uc.activityRepo.GetPeakUsersToday()
		totalJoins = uc.activityRepo.GetTodayJoinCount()
		recentActivity, _ = uc.activityRepo.GetRecent(20)
	}

	// Get active bans count
	var activeBans int
	if uc.banRepo != nil {
		bans, _ := uc.banRepo.GetAll()
		activeBans = len(bans)
	}

	return &GetStatsOutput{
		ActiveRooms:     activeRooms,
		TotalUsers:      totalUsers,
		PeakUsersToday:  peakUsers,
		TotalJoinsToday: totalJoins,
		Rooms:           roomStats,
		RecentActivity:  recentActivity,
		ActiveBans:      activeBans,
	}, nil
}
