package admin

import (
	"errors"
	"strings"
)

var (
	ErrInvalidPassword = errors.New("invalid admin password")
	ErrIPNotAllowed    = errors.New("IP address not allowed for admin access")
)

// AdminAuthInput represents the input for admin authentication
type AdminAuthInput struct {
	Password string
	IP       string
}

// AdminAuthOutput represents the result of admin authentication
type AdminAuthOutput struct {
	IsAuthenticated bool
	Message         string
}

// AdminAuthUseCase handles admin authentication
type AdminAuthUseCase struct {
	password   string
	allowedIPs []string
}

// NewAdminAuthUseCase creates a new AdminAuthUseCase
func NewAdminAuthUseCase(password string, allowedIPs []string) *AdminAuthUseCase {
	return &AdminAuthUseCase{
		password:   password,
		allowedIPs: allowedIPs,
	}
}

// Execute authenticates an admin user
func (uc *AdminAuthUseCase) Execute(input AdminAuthInput) (*AdminAuthOutput, error) {
	// Check IP first
	if !uc.isIPAllowed(input.IP) {
		return nil, ErrIPNotAllowed
	}

	// Check password
	if input.Password != uc.password {
		return nil, ErrInvalidPassword
	}

	return &AdminAuthOutput{
		IsAuthenticated: true,
		Message:         "Authentication successful",
	}, nil
}

// isIPAllowed checks if the given IP is in the allowed list
func (uc *AdminAuthUseCase) isIPAllowed(ip string) bool {
	// If no IPs configured, allow all (for development)
	if len(uc.allowedIPs) == 0 {
		return true
	}

	// Always allow localhost for development
	if ip == "127.0.0.1" || ip == "::1" || ip == "localhost" {
		return true
	}

	for _, allowed := range uc.allowedIPs {
		if strings.TrimSpace(allowed) == ip {
			return true
		}
	}
	return false
}
