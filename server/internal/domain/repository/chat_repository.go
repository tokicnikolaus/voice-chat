package repository

import (
	"voice-chat/internal/domain/entity"
)

const DefaultChatHistoryLimit = 100

// ChatRepository defines the interface for chat message persistence
type ChatRepository interface {
	// AddMessage stores a new chat message for a room
	AddMessage(message *entity.ChatMessage) error

	// GetMessages retrieves chat messages for a room (most recent first, up to limit)
	GetMessages(roomID string, limit int) ([]*entity.ChatMessage, error)

	// GetMessage retrieves a specific message by ID
	GetMessage(roomID, messageID string) (*entity.ChatMessage, error)

	// UpdateMessage updates a message (for reactions)
	UpdateMessage(message *entity.ChatMessage) error

	// DeleteRoomMessages deletes all messages for a room (when room is destroyed)
	DeleteRoomMessages(roomID string) error
}
