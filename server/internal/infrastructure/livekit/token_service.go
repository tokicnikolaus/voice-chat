package livekit

import (
	"time"

	"github.com/livekit/protocol/auth"
)

// TokenService handles LiveKit token generation
type TokenService struct {
	apiKey    string
	apiSecret string
	ttl       time.Duration
}

// NewTokenService creates a new TokenService
func NewTokenService(apiKey, apiSecret string) *TokenService {
	return &TokenService{
		apiKey:    apiKey,
		apiSecret: apiSecret,
		ttl:       24 * time.Hour, // Token valid for 24 hours
	}
}

// GenerateToken creates a LiveKit access token for a user to join a room
func (s *TokenService) GenerateToken(roomName, userID, userName string, canPublish bool) (string, error) {
	at := auth.NewAccessToken(s.apiKey, s.apiSecret)

	grant := &auth.VideoGrant{
		RoomJoin:       true,
		Room:           roomName,
		CanPublish:     &canPublish,
		CanSubscribe:   boolPtr(true),
		CanPublishData: boolPtr(true),
	}

	at.AddGrant(grant).
		SetIdentity(userID).
		SetName(userName).
		SetValidFor(s.ttl)

	return at.ToJWT()
}

// GenerateAdminToken creates a LiveKit access token with admin privileges
func (s *TokenService) GenerateAdminToken(roomName, adminID string) (string, error) {
	at := auth.NewAccessToken(s.apiKey, s.apiSecret)

	grant := &auth.VideoGrant{
		RoomJoin:       true,
		Room:           roomName,
		CanPublish:     boolPtr(true),
		CanSubscribe:   boolPtr(true),
		CanPublishData: boolPtr(true),
		RoomAdmin:      true,
		Hidden:         true, // Admin is hidden from participant list
	}

	at.AddGrant(grant).
		SetIdentity(adminID).
		SetName("Admin").
		SetValidFor(s.ttl)

	return at.ToJWT()
}

// GenerateStealthToken creates a token for stealth listening (receive only)
func (s *TokenService) GenerateStealthToken(roomName, adminID string) (string, error) {
	at := auth.NewAccessToken(s.apiKey, s.apiSecret)

	canPublish := false
	grant := &auth.VideoGrant{
		RoomJoin:       true,
		Room:           roomName,
		CanPublish:     &canPublish,
		CanSubscribe:   boolPtr(true),
		CanPublishData: boolPtr(false),
		Hidden:         true,
	}

	at.AddGrant(grant).
		SetIdentity(adminID).
		SetName("Monitor").
		SetValidFor(s.ttl)

	return at.ToJWT()
}

// SetTTL sets the token time-to-live duration
func (s *TokenService) SetTTL(ttl time.Duration) {
	s.ttl = ttl
}

func boolPtr(b bool) *bool {
	return &b
}
