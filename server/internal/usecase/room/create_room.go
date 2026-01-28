package room

import (
	"errors"

	"github.com/google/uuid"

	"voice-chat/internal/domain/entity"
	"voice-chat/internal/domain/repository"
)

var (
	ErrRoomAlreadyExists = errors.New("room with this name already exists")
	ErrInvalidRoomName   = errors.New("room name is invalid")
)

// CreateRoomInput represents the input for creating a room
type CreateRoomInput struct {
	Name      string
	Type      entity.RoomType
	CreatedBy string
	Capacity  int
}

// CreateRoomOutput represents the output after creating a room
type CreateRoomOutput struct {
	Room *entity.Room
}

// CreateRoomUseCase handles room creation logic
type CreateRoomUseCase struct {
	roomRepo     repository.RoomRepository
	activityRepo repository.ActivityRepository
}

// NewCreateRoomUseCase creates a new CreateRoomUseCase
func NewCreateRoomUseCase(roomRepo repository.RoomRepository, activityRepo repository.ActivityRepository) *CreateRoomUseCase {
	return &CreateRoomUseCase{
		roomRepo:     roomRepo,
		activityRepo: activityRepo,
	}
}

// Execute creates a new room
func (uc *CreateRoomUseCase) Execute(input CreateRoomInput) (*CreateRoomOutput, error) {
	if input.Name == "" {
		return nil, ErrInvalidRoomName
	}

	// Check if room already exists
	if uc.roomRepo.Exists(input.Name) {
		return nil, ErrRoomAlreadyExists
	}

	// Create new room
	roomID := uuid.New().String()
	var room *entity.Room

	if input.Capacity > 0 {
		room = entity.NewRoomWithCapacity(roomID, input.Name, input.Type, input.CreatedBy, input.Capacity)
	} else {
		room = entity.NewRoom(roomID, input.Name, input.Type, input.CreatedBy)
	}

	// Save room
	if err := uc.roomRepo.Create(room); err != nil {
		return nil, err
	}

	// Log activity
	if uc.activityRepo != nil {
		activity := entity.NewActivityLog(
			uuid.New().String(),
			entity.ActivityTypeRoomCreate,
			input.CreatedBy,
			"",
			room.ID,
			room.Name,
			"",
		)
		activity.AddDetail("room_type", string(input.Type))
		activity.AddDetail("capacity", room.Capacity)
		_ = uc.activityRepo.Log(activity)
	}

	return &CreateRoomOutput{Room: room}, nil
}
