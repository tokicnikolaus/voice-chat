package room

import (
	"github.com/google/uuid"

	"voice-chat/internal/domain/entity"
	"voice-chat/internal/domain/repository"
)

// LeaveRoomInput represents the input for leaving a room
type LeaveRoomInput struct {
	UserID string
	RoomID string
}

// LeaveRoomOutput represents the output after leaving a room
type LeaveRoomOutput struct {
	Room    *entity.Room
	User    *entity.User
	IsEmpty bool
}

// LeaveRoomUseCase handles the logic for leaving a room
type LeaveRoomUseCase struct {
	roomRepo     repository.RoomRepository
	userRepo     repository.UserRepository
	activityRepo repository.ActivityRepository
}

// NewLeaveRoomUseCase creates a new LeaveRoomUseCase
func NewLeaveRoomUseCase(
	roomRepo repository.RoomRepository,
	userRepo repository.UserRepository,
	activityRepo repository.ActivityRepository,
) *LeaveRoomUseCase {
	return &LeaveRoomUseCase{
		roomRepo:     roomRepo,
		userRepo:     userRepo,
		activityRepo: activityRepo,
	}
}

// Execute removes a user from a room
func (uc *LeaveRoomUseCase) Execute(input LeaveRoomInput) (*LeaveRoomOutput, error) {
	// Get user
	user, err := uc.userRepo.GetByID(input.UserID)
	if err != nil {
		return nil, err
	}

	// Get room
	room, err := uc.roomRepo.GetByID(input.RoomID)
	if err != nil {
		return nil, err
	}

	// Remove user from room
	if err := room.RemoveParticipant(input.UserID); err != nil {
		return nil, err
	}

	// Update room
	if err := uc.roomRepo.Update(room); err != nil {
		return nil, err
	}

	// Delete user from repository
	if err := uc.userRepo.Delete(input.UserID); err != nil {
		return nil, err
	}

	// Log activity
	if uc.activityRepo != nil {
		activity := entity.NewActivityLog(
			uuid.New().String(),
			entity.ActivityTypeUserLeave,
			user.ID,
			user.Name,
			room.ID,
			room.Name,
			user.IP,
		)
		_ = uc.activityRepo.Log(activity)
	}

	return &LeaveRoomOutput{
		Room:    room,
		User:    user,
		IsEmpty: room.IsEmpty(),
	}, nil
}
