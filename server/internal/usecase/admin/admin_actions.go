package admin

import (
	"errors"
	"time"

	"github.com/google/uuid"

	"voice-chat/internal/domain/entity"
	"voice-chat/internal/domain/repository"
)

var (
	ErrUserNotFound     = errors.New("user not found")
	ErrNotAuthorized    = errors.New("not authorized to perform this action")
)

// MuteUserInput represents input for muting a user
type MuteUserInput struct {
	AdminID  string
	UserID   string
	RoomID   string
}

// KickUserInput represents input for kicking a user
type KickUserInput struct {
	AdminID string
	UserID  string
	RoomID  string
	Reason  string
}

// BanUserInput represents input for banning a user
type BanUserInput struct {
	AdminID  string
	UserID   string
	Reason   string
	Duration time.Duration
}

// CloseRoomInput represents input for closing a room
type CloseRoomInput struct {
	AdminID string
	RoomID  string
}

// AdminActionsUseCase handles admin moderation actions
type AdminActionsUseCase struct {
	roomRepo     repository.RoomRepository
	userRepo     repository.UserRepository
	banRepo      repository.BanRepository
	activityRepo repository.ActivityRepository
}

// NewAdminActionsUseCase creates a new AdminActionsUseCase
func NewAdminActionsUseCase(
	roomRepo repository.RoomRepository,
	userRepo repository.UserRepository,
	banRepo repository.BanRepository,
	activityRepo repository.ActivityRepository,
) *AdminActionsUseCase {
	return &AdminActionsUseCase{
		roomRepo:     roomRepo,
		userRepo:     userRepo,
		banRepo:      banRepo,
		activityRepo: activityRepo,
	}
}

// MuteUser force-mutes a user
func (uc *AdminActionsUseCase) MuteUser(input MuteUserInput) (*entity.User, error) {
	user, err := uc.userRepo.GetByID(input.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	user.Mute()

	if err := uc.userRepo.Update(user); err != nil {
		return nil, err
	}

	// Log activity
	if uc.activityRepo != nil {
		activity := entity.NewActivityLog(
			uuid.New().String(),
			entity.ActivityTypeAdminMute,
			input.UserID,
			user.Name,
			input.RoomID,
			"",
			user.IP,
		)
		activity.AddDetail("admin_id", input.AdminID)
		_ = uc.activityRepo.Log(activity)
	}

	return user, nil
}

// KickUser removes a user from a room
func (uc *AdminActionsUseCase) KickUser(input KickUserInput) (*entity.User, error) {
	user, err := uc.userRepo.GetByID(input.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	room, err := uc.roomRepo.GetByID(input.RoomID)
	if err != nil {
		return nil, err
	}

	// Remove from room
	if err := room.RemoveParticipant(input.UserID); err != nil {
		return nil, err
	}

	if err := uc.roomRepo.Update(room); err != nil {
		return nil, err
	}

	// Delete user
	if err := uc.userRepo.Delete(input.UserID); err != nil {
		return nil, err
	}

	// Log activity
	if uc.activityRepo != nil {
		activity := entity.NewActivityLog(
			uuid.New().String(),
			entity.ActivityTypeAdminKick,
			input.UserID,
			user.Name,
			room.ID,
			room.Name,
			user.IP,
		)
		activity.AddDetail("admin_id", input.AdminID)
		activity.AddDetail("reason", input.Reason)
		_ = uc.activityRepo.Log(activity)
	}

	return user, nil
}

// BanUser bans a user for a specified duration
func (uc *AdminActionsUseCase) BanUser(input BanUserInput) (*entity.Ban, error) {
	user, err := uc.userRepo.GetByID(input.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	// Create ban
	ban := entity.NewBan(
		uuid.New().String(),
		user.IP,
		user.Name,
		input.Reason,
		input.AdminID,
		input.Duration,
	)

	if err := uc.banRepo.Create(ban); err != nil {
		return nil, err
	}

	// If user is in a room, kick them
	if user.IsInRoom() {
		room, _ := uc.roomRepo.GetByID(user.RoomID)
		if room != nil {
			room.RemoveParticipant(user.ID)
			uc.roomRepo.Update(room)
		}
	}

	// Delete user session
	uc.userRepo.Delete(user.ID)

	// Log activity
	if uc.activityRepo != nil {
		activity := entity.NewActivityLog(
			uuid.New().String(),
			entity.ActivityTypeAdminBan,
			input.UserID,
			user.Name,
			"",
			"",
			user.IP,
		)
		activity.AddDetail("admin_id", input.AdminID)
		activity.AddDetail("reason", input.Reason)
		activity.AddDetail("duration", input.Duration.String())
		_ = uc.activityRepo.Log(activity)
	}

	return ban, nil
}

// CloseRoom closes a room and kicks all participants
func (uc *AdminActionsUseCase) CloseRoom(input CloseRoomInput) (*entity.Room, error) {
	room, err := uc.roomRepo.GetByID(input.RoomID)
	if err != nil {
		return nil, err
	}

	// Remove all participants
	for userID := range room.Participants {
		uc.userRepo.Delete(userID)
	}

	room.Close()

	if err := uc.roomRepo.Update(room); err != nil {
		return nil, err
	}

	// Log activity
	if uc.activityRepo != nil {
		activity := entity.NewActivityLog(
			uuid.New().String(),
			entity.ActivityTypeRoomClose,
			input.AdminID,
			"admin",
			room.ID,
			room.Name,
			"",
		)
		_ = uc.activityRepo.Log(activity)
	}

	return room, nil
}
