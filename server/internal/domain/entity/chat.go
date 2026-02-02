package entity

import (
	"time"
)

// ChatMessageType represents the type of chat message
type ChatMessageType string

const (
	ChatMessageTypeUser   ChatMessageType = "chat"
	ChatMessageTypeSystem ChatMessageType = "system"
)

// ChatMessage represents a chat message in a room
type ChatMessage struct {
	ID        string          `json:"id"`
	RoomID    string          `json:"room_id"`
	Type      ChatMessageType `json:"type"`
	SenderID  string          `json:"sender_id"`
	SenderName string         `json:"sender_name"`
	Content   string          `json:"content"`
	Timestamp time.Time       `json:"timestamp"`
	Reactions map[string][]string `json:"reactions"` // emoji -> []userID
}

// NewChatMessage creates a new user chat message
func NewChatMessage(id, roomID, senderID, senderName, content string) *ChatMessage {
	return &ChatMessage{
		ID:         id,
		RoomID:     roomID,
		Type:       ChatMessageTypeUser,
		SenderID:   senderID,
		SenderName: senderName,
		Content:    content,
		Timestamp:  time.Now(),
		Reactions:  make(map[string][]string),
	}
}

// NewSystemMessage creates a new system message (join/leave)
func NewSystemMessage(id, roomID, userID, userName, content string) *ChatMessage {
	return &ChatMessage{
		ID:         id,
		RoomID:     roomID,
		Type:       ChatMessageTypeSystem,
		SenderID:   userID,
		SenderName: userName,
		Content:    content,
		Timestamp:  time.Now(),
		Reactions:  make(map[string][]string),
	}
}

// AddReaction adds a reaction from a user
func (m *ChatMessage) AddReaction(emoji, userID string) {
	if m.Reactions == nil {
		m.Reactions = make(map[string][]string)
	}

	// Check if user already reacted with this emoji
	for _, uid := range m.Reactions[emoji] {
		if uid == userID {
			return // Already reacted
		}
	}

	m.Reactions[emoji] = append(m.Reactions[emoji], userID)
}

// RemoveReaction removes a reaction from a user
func (m *ChatMessage) RemoveReaction(emoji, userID string) {
	if m.Reactions == nil {
		return
	}

	users := m.Reactions[emoji]
	for i, uid := range users {
		if uid == userID {
			m.Reactions[emoji] = append(users[:i], users[i+1:]...)
			break
		}
	}

	// Remove emoji key if no more reactions
	if len(m.Reactions[emoji]) == 0 {
		delete(m.Reactions, emoji)
	}
}
