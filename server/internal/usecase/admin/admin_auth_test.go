package admin

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAdminAuthUseCase_Execute_Success(t *testing.T) {
	uc := NewAdminAuthUseCase("secret123", []string{"192.168.1.100"})

	input := AdminAuthInput{
		Password: "secret123",
		IP:       "192.168.1.100",
	}

	result, err := uc.Execute(input)

	assert.NoError(t, err)
	assert.True(t, result.IsAuthenticated)
}

func TestAdminAuthUseCase_Execute_WrongPassword(t *testing.T) {
	uc := NewAdminAuthUseCase("secret123", []string{"192.168.1.100"})

	input := AdminAuthInput{
		Password: "wrongpassword",
		IP:       "192.168.1.100",
	}

	_, err := uc.Execute(input)

	assert.ErrorIs(t, err, ErrInvalidPassword)
}

func TestAdminAuthUseCase_Execute_IPNotAllowed(t *testing.T) {
	uc := NewAdminAuthUseCase("secret123", []string{"192.168.1.100"})

	input := AdminAuthInput{
		Password: "secret123",
		IP:       "192.168.1.200", // Different IP
	}

	_, err := uc.Execute(input)

	assert.ErrorIs(t, err, ErrIPNotAllowed)
}

func TestAdminAuthUseCase_Execute_LocalhostAlwaysAllowed(t *testing.T) {
	uc := NewAdminAuthUseCase("secret123", []string{"192.168.1.100"})

	// localhost should always be allowed
	input := AdminAuthInput{
		Password: "secret123",
		IP:       "127.0.0.1",
	}

	result, err := uc.Execute(input)

	assert.NoError(t, err)
	assert.True(t, result.IsAuthenticated)
}

func TestAdminAuthUseCase_Execute_NoIPRestrictions(t *testing.T) {
	// Empty allowed IPs list means any IP is allowed
	uc := NewAdminAuthUseCase("secret123", []string{})

	input := AdminAuthInput{
		Password: "secret123",
		IP:       "10.0.0.1", // Any IP
	}

	result, err := uc.Execute(input)

	assert.NoError(t, err)
	assert.True(t, result.IsAuthenticated)
}

func TestAdminAuthUseCase_isIPAllowed(t *testing.T) {
	uc := NewAdminAuthUseCase("secret", []string{"192.168.1.1", "192.168.1.2"})

	assert.True(t, uc.isIPAllowed("192.168.1.1"))
	assert.True(t, uc.isIPAllowed("192.168.1.2"))
	assert.True(t, uc.isIPAllowed("127.0.0.1")) // localhost always allowed
	assert.True(t, uc.isIPAllowed("::1"))       // IPv6 localhost
	assert.False(t, uc.isIPAllowed("192.168.1.3"))
}
