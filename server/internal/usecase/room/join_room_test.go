package room

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"voice-chat/internal/domain/entity"
	"voice-chat/internal/infrastructure/persistence"
)

func TestJoinRoomUseCase_Execute_CreateAndJoin(t *testing.T) {
	roomRepo := persistence.NewInMemoryRoomRepository()
	userRepo := persistence.NewInMemoryUserRepository()
	banRepo := persistence.NewInMemoryBanRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()
	uc := NewJoinRoomUseCase(roomRepo, userRepo, banRepo, activityRepo)

	input := JoinRoomInput{
		RoomName:  "New Room",
		UserID:    "user-1",
		UserName:  "TestUser",
		VoiceMode: entity.VoiceModePTT,
		IP:        "192.168.1.1",
	}

	result, err := uc.Execute(input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.IsNewRoom)
	assert.Equal(t, "New Room", result.Room.Name)
	assert.Equal(t, "TestUser", result.User.Name)
	assert.Equal(t, entity.VoiceModePTT, result.User.VoiceMode)
}

func TestJoinRoomUseCase_Execute_JoinExisting(t *testing.T) {
	roomRepo := persistence.NewInMemoryRoomRepository()
	userRepo := persistence.NewInMemoryUserRepository()
	banRepo := persistence.NewInMemoryBanRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()
	uc := NewJoinRoomUseCase(roomRepo, userRepo, banRepo, activityRepo)

	// First user creates room
	input1 := JoinRoomInput{
		RoomName:  "Existing Room",
		UserID:    "user-1",
		UserName:  "User1",
		VoiceMode: entity.VoiceModePTT,
		IP:        "192.168.1.1",
	}
	result1, _ := uc.Execute(input1)
	assert.True(t, result1.IsNewRoom)

	// Second user joins
	input2 := JoinRoomInput{
		RoomName:  "Existing Room",
		UserID:    "user-2",
		UserName:  "User2",
		VoiceMode: entity.VoiceModeVAD,
		IP:        "192.168.1.2",
	}
	result2, err := uc.Execute(input2)

	assert.NoError(t, err)
	assert.False(t, result2.IsNewRoom)
	assert.Equal(t, 2, result2.Room.ParticipantCount())
}

func TestJoinRoomUseCase_Execute_DuplicateUsername(t *testing.T) {
	roomRepo := persistence.NewInMemoryRoomRepository()
	userRepo := persistence.NewInMemoryUserRepository()
	banRepo := persistence.NewInMemoryBanRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()
	uc := NewJoinRoomUseCase(roomRepo, userRepo, banRepo, activityRepo)

	// First user
	input1 := JoinRoomInput{
		RoomName:  "Test Room",
		UserID:    "user-1",
		UserName:  "SameName",
		VoiceMode: entity.VoiceModePTT,
		IP:        "192.168.1.1",
	}
	result1, _ := uc.Execute(input1)
	assert.Equal(t, "SameName", result1.User.Name)

	// Second user with same name
	input2 := JoinRoomInput{
		RoomName:  "Test Room",
		UserID:    "user-2",
		UserName:  "SameName",
		VoiceMode: entity.VoiceModePTT,
		IP:        "192.168.1.2",
	}
	result2, err := uc.Execute(input2)

	assert.NoError(t, err)
	// Name should have funny suffix
	assert.NotEqual(t, "SameName", result2.User.Name)
	assert.Contains(t, result2.User.Name, "SameName_")
}

func TestJoinRoomUseCase_Execute_RoomFull(t *testing.T) {
	roomRepo := persistence.NewInMemoryRoomRepository()
	userRepo := persistence.NewInMemoryUserRepository()
	banRepo := persistence.NewInMemoryBanRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()

	// Create room with capacity of 1
	room := entity.NewRoomWithCapacity("room-1", "Small Room", entity.RoomTypePublic, "admin", 1)
	roomRepo.Create(room)

	uc := NewJoinRoomUseCase(roomRepo, userRepo, banRepo, activityRepo)

	// First user joins
	input1 := JoinRoomInput{
		RoomName:  "Small Room",
		UserID:    "user-1",
		UserName:  "User1",
		VoiceMode: entity.VoiceModePTT,
		IP:        "192.168.1.1",
	}
	_, err := uc.Execute(input1)
	assert.NoError(t, err)

	// Second user tries to join full room
	input2 := JoinRoomInput{
		RoomName:  "Small Room",
		UserID:    "user-2",
		UserName:  "User2",
		VoiceMode: entity.VoiceModePTT,
		IP:        "192.168.1.2",
	}
	_, err = uc.Execute(input2)

	assert.ErrorIs(t, err, entity.ErrRoomFull)
}

func TestJoinRoomUseCase_Execute_BannedUser(t *testing.T) {
	roomRepo := persistence.NewInMemoryRoomRepository()
	userRepo := persistence.NewInMemoryUserRepository()
	banRepo := persistence.NewInMemoryBanRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()

	// Create a ban
	ban := entity.NewBan("ban-1", "192.168.1.1", "BadUser", "Test", "admin", 30*60*1000000000) // 30 minutes
	banRepo.Create(ban)

	uc := NewJoinRoomUseCase(roomRepo, userRepo, banRepo, activityRepo)

	input := JoinRoomInput{
		RoomName:  "Test Room",
		UserID:    "user-1",
		UserName:  "BadUser",
		VoiceMode: entity.VoiceModePTT,
		IP:        "192.168.1.1",
	}

	_, err := uc.Execute(input)

	assert.ErrorIs(t, err, ErrUserBanned)
}

func TestJoinRoomUseCase_Execute_ClosedRoom(t *testing.T) {
	roomRepo := persistence.NewInMemoryRoomRepository()
	userRepo := persistence.NewInMemoryUserRepository()
	banRepo := persistence.NewInMemoryBanRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()

	// Create closed room
	room := entity.NewRoom("room-1", "Closed Room", entity.RoomTypePublic, "admin")
	room.Close()
	roomRepo.Create(room)

	uc := NewJoinRoomUseCase(roomRepo, userRepo, banRepo, activityRepo)

	input := JoinRoomInput{
		RoomName:  "Closed Room",
		UserID:    "user-1",
		UserName:  "User1",
		VoiceMode: entity.VoiceModePTT,
		IP:        "192.168.1.1",
	}

	_, err := uc.Execute(input)

	assert.ErrorIs(t, err, entity.ErrRoomClosed)
}
