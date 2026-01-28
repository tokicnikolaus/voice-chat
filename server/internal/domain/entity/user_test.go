package entity

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewUser(t *testing.T) {
	user := NewUser("user-1", "TestUser", "192.168.1.1", VoiceModePTT)

	assert.Equal(t, "user-1", user.ID)
	assert.Equal(t, "TestUser", user.Name)
	assert.Equal(t, "192.168.1.1", user.IP)
	assert.Equal(t, VoiceModePTT, user.VoiceMode)
	assert.False(t, user.IsMuted)
	assert.False(t, user.IsAdmin)
	assert.False(t, user.IsStealth)
	assert.Empty(t, user.RoomID)
}

func TestUser_SetRoom(t *testing.T) {
	user := NewUser("user-1", "TestUser", "192.168.1.1", VoiceModePTT)

	user.SetRoom("room-1")

	assert.Equal(t, "room-1", user.RoomID)
}

func TestUser_LeaveRoom(t *testing.T) {
	user := NewUser("user-1", "TestUser", "192.168.1.1", VoiceModePTT)
	user.SetRoom("room-1")

	user.LeaveRoom()

	assert.Empty(t, user.RoomID)
}

func TestUser_Mute(t *testing.T) {
	user := NewUser("user-1", "TestUser", "192.168.1.1", VoiceModePTT)

	user.Mute()

	assert.True(t, user.IsMuted)
}

func TestUser_Unmute(t *testing.T) {
	user := NewUser("user-1", "TestUser", "192.168.1.1", VoiceModePTT)
	user.Mute()

	user.Unmute()

	assert.False(t, user.IsMuted)
}

func TestUser_ToggleMute(t *testing.T) {
	user := NewUser("user-1", "TestUser", "192.168.1.1", VoiceModePTT)

	user.ToggleMute()
	assert.True(t, user.IsMuted)

	user.ToggleMute()
	assert.False(t, user.IsMuted)
}

func TestUser_SetVoiceMode(t *testing.T) {
	user := NewUser("user-1", "TestUser", "192.168.1.1", VoiceModePTT)

	user.SetVoiceMode(VoiceModeVAD)

	assert.Equal(t, VoiceModeVAD, user.VoiceMode)
}

func TestUser_IsInRoom(t *testing.T) {
	user := NewUser("user-1", "TestUser", "192.168.1.1", VoiceModePTT)

	assert.False(t, user.IsInRoom())

	user.SetRoom("room-1")

	assert.True(t, user.IsInRoom())
}

func TestUser_CanBeSeenBy(t *testing.T) {
	regularUser := NewUser("user-1", "RegularUser", "192.168.1.1", VoiceModePTT)
	adminUser := NewUser("user-2", "AdminUser", "192.168.1.2", VoiceModePTT)
	adminUser.IsAdmin = true

	stealthAdmin := NewUser("user-3", "StealthAdmin", "192.168.1.3", VoiceModePTT)
	stealthAdmin.IsAdmin = true
	stealthAdmin.IsStealth = true

	// Regular user cannot see stealth admin
	assert.False(t, stealthAdmin.CanBeSeenBy(regularUser))

	// Admin can see stealth admin
	assert.True(t, stealthAdmin.CanBeSeenBy(adminUser))

	// Everyone can see regular user
	assert.True(t, regularUser.CanBeSeenBy(adminUser))
	assert.True(t, regularUser.CanBeSeenBy(regularUser))

	// Non-stealth admin is visible to everyone
	adminUser.IsStealth = false
	assert.True(t, adminUser.CanBeSeenBy(regularUser))
}
