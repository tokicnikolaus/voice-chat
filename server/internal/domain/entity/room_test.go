package entity

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewRoom(t *testing.T) {
	room := NewRoom("room-1", "Test Room", RoomTypePublic, "user-1")

	assert.Equal(t, "room-1", room.ID)
	assert.Equal(t, "Test Room", room.Name)
	assert.Equal(t, RoomTypePublic, room.Type)
	assert.Equal(t, DefaultRoomCapacity, room.Capacity)
	assert.Equal(t, "user-1", room.CreatedBy)
	assert.False(t, room.IsClosed)
	assert.Empty(t, room.Participants)
}

func TestNewRoomWithCapacity(t *testing.T) {
	room := NewRoomWithCapacity("room-1", "Test Room", RoomTypePrivate, "admin", 10)

	assert.Equal(t, 10, room.Capacity)
	assert.Equal(t, RoomTypePrivate, room.Type)
}

func TestRoom_AddParticipant(t *testing.T) {
	room := NewRoom("room-1", "Test Room", RoomTypePublic, "user-1")
	user := NewUser("user-1", "TestUser", "127.0.0.1", VoiceModePTT)

	err := room.AddParticipant(user)

	assert.NoError(t, err)
	assert.Equal(t, 1, room.ParticipantCount())
	assert.Equal(t, "room-1", user.RoomID)
}

func TestRoom_AddParticipant_AlreadyInRoom(t *testing.T) {
	room := NewRoom("room-1", "Test Room", RoomTypePublic, "user-1")
	user := NewUser("user-1", "TestUser", "127.0.0.1", VoiceModePTT)

	room.AddParticipant(user)
	err := room.AddParticipant(user)

	assert.ErrorIs(t, err, ErrUserAlreadyInRoom)
}

func TestRoom_AddParticipant_RoomFull(t *testing.T) {
	room := NewRoomWithCapacity("room-1", "Test Room", RoomTypePublic, "user-1", 2)

	user1 := NewUser("user-1", "User1", "127.0.0.1", VoiceModePTT)
	user2 := NewUser("user-2", "User2", "127.0.0.1", VoiceModePTT)
	user3 := NewUser("user-3", "User3", "127.0.0.1", VoiceModePTT)

	room.AddParticipant(user1)
	room.AddParticipant(user2)
	err := room.AddParticipant(user3)

	assert.ErrorIs(t, err, ErrRoomFull)
}

func TestRoom_AddParticipant_RoomClosed(t *testing.T) {
	room := NewRoom("room-1", "Test Room", RoomTypePublic, "user-1")
	room.Close()

	user := NewUser("user-1", "TestUser", "127.0.0.1", VoiceModePTT)
	err := room.AddParticipant(user)

	assert.ErrorIs(t, err, ErrRoomClosed)
}

func TestRoom_RemoveParticipant(t *testing.T) {
	room := NewRoom("room-1", "Test Room", RoomTypePublic, "user-1")
	user := NewUser("user-1", "TestUser", "127.0.0.1", VoiceModePTT)

	room.AddParticipant(user)
	err := room.RemoveParticipant("user-1")

	assert.NoError(t, err)
	assert.Equal(t, 0, room.ParticipantCount())
	assert.Empty(t, user.RoomID)
}

func TestRoom_RemoveParticipant_NotInRoom(t *testing.T) {
	room := NewRoom("room-1", "Test Room", RoomTypePublic, "user-1")

	err := room.RemoveParticipant("user-1")

	assert.ErrorIs(t, err, ErrUserNotInRoom)
}

func TestRoom_GetVisibleParticipants(t *testing.T) {
	room := NewRoom("room-1", "Test Room", RoomTypePublic, "user-1")

	user1 := NewUser("user-1", "User1", "127.0.0.1", VoiceModePTT)
	user2 := NewUser("user-2", "User2", "127.0.0.1", VoiceModePTT)
	user2.IsStealth = true // Admin in stealth mode

	room.AddParticipant(user1)
	room.AddParticipant(user2)

	// Regular user should not see stealth user
	visible := room.GetVisibleParticipants(user1)
	assert.Equal(t, 1, len(visible))
	assert.Equal(t, "user-1", visible[0].ID)

	// Admin should see all
	user1.IsAdmin = true
	visible = room.GetVisibleParticipants(user1)
	assert.Equal(t, 2, len(visible))
}

func TestRoom_IsEmpty(t *testing.T) {
	room := NewRoom("room-1", "Test Room", RoomTypePublic, "user-1")

	assert.True(t, room.IsEmpty())

	user := NewUser("user-1", "TestUser", "127.0.0.1", VoiceModePTT)
	room.AddParticipant(user)

	assert.False(t, room.IsEmpty())
}

func TestRoom_IsFull(t *testing.T) {
	room := NewRoomWithCapacity("room-1", "Test Room", RoomTypePublic, "user-1", 1)

	assert.False(t, room.IsFull())

	user := NewUser("user-1", "TestUser", "127.0.0.1", VoiceModePTT)
	room.AddParticipant(user)

	assert.True(t, room.IsFull())
}

func TestRoom_CanJoin(t *testing.T) {
	room := NewRoomWithCapacity("room-1", "Test Room", RoomTypePublic, "user-1", 1)

	assert.True(t, room.CanJoin())

	user := NewUser("user-1", "TestUser", "127.0.0.1", VoiceModePTT)
	room.AddParticipant(user)

	assert.False(t, room.CanJoin())

	room2 := NewRoom("room-2", "Test Room 2", RoomTypePublic, "user-1")
	room2.Close()

	assert.False(t, room2.CanJoin())
}

func TestRoom_IsPublic(t *testing.T) {
	publicRoom := NewRoom("room-1", "Public Room", RoomTypePublic, "user-1")
	privateRoom := NewRoom("room-2", "Private Room", RoomTypePrivate, "user-1")

	assert.True(t, publicRoom.IsPublic())
	assert.False(t, privateRoom.IsPublic())
}

func TestRoom_TimeSinceLastActivity(t *testing.T) {
	room := NewRoom("room-1", "Test Room", RoomTypePublic, "user-1")

	// Just created, should be very recent
	assert.Less(t, room.TimeSinceLastActivity(), time.Second)

	// Manually set last activity to the past
	room.LastActivity = time.Now().Add(-5 * time.Minute)
	assert.GreaterOrEqual(t, room.TimeSinceLastActivity(), 5*time.Minute)
}
