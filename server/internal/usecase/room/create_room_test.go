package room

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"voice-chat/internal/domain/entity"
	"voice-chat/internal/infrastructure/persistence"
)

func TestCreateRoomUseCase_Execute_Success(t *testing.T) {
	roomRepo := persistence.NewInMemoryRoomRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()
	uc := NewCreateRoomUseCase(roomRepo, activityRepo)

	input := CreateRoomInput{
		Name:      "Test Room",
		Type:      entity.RoomTypePublic,
		CreatedBy: "user-1",
	}

	result, err := uc.Execute(input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotEmpty(t, result.Room.ID)
	assert.Equal(t, "Test Room", result.Room.Name)
	assert.Equal(t, entity.RoomTypePublic, result.Room.Type)
	assert.Equal(t, entity.DefaultRoomCapacity, result.Room.Capacity)
}

func TestCreateRoomUseCase_Execute_WithCapacity(t *testing.T) {
	roomRepo := persistence.NewInMemoryRoomRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()
	uc := NewCreateRoomUseCase(roomRepo, activityRepo)

	input := CreateRoomInput{
		Name:      "Small Room",
		Type:      entity.RoomTypePrivate,
		CreatedBy: "admin",
		Capacity:  5,
	}

	result, err := uc.Execute(input)

	assert.NoError(t, err)
	assert.Equal(t, 5, result.Room.Capacity)
	assert.Equal(t, entity.RoomTypePrivate, result.Room.Type)
}

func TestCreateRoomUseCase_Execute_DuplicateName(t *testing.T) {
	roomRepo := persistence.NewInMemoryRoomRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()
	uc := NewCreateRoomUseCase(roomRepo, activityRepo)

	input := CreateRoomInput{
		Name:      "Test Room",
		Type:      entity.RoomTypePublic,
		CreatedBy: "user-1",
	}

	// Create first room
	_, err := uc.Execute(input)
	assert.NoError(t, err)

	// Try to create room with same name
	_, err = uc.Execute(input)
	assert.ErrorIs(t, err, ErrRoomAlreadyExists)
}

func TestCreateRoomUseCase_Execute_EmptyName(t *testing.T) {
	roomRepo := persistence.NewInMemoryRoomRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()
	uc := NewCreateRoomUseCase(roomRepo, activityRepo)

	input := CreateRoomInput{
		Name:      "",
		Type:      entity.RoomTypePublic,
		CreatedBy: "user-1",
	}

	_, err := uc.Execute(input)

	assert.ErrorIs(t, err, ErrInvalidRoomName)
}
