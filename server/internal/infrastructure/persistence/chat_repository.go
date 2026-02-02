package persistence

import (
	"errors"
	"sync"

	"voice-chat/internal/domain/entity"
	"voice-chat/internal/domain/repository"
)

var ErrMessageNotFound = errors.New("message not found")

// InMemoryChatRepository is an in-memory implementation of ChatRepository
type InMemoryChatRepository struct {
	// roomID -> []messages (ordered by timestamp, newest last)
	messages map[string][]*entity.ChatMessage
	// roomID -> messageID -> message (for quick lookup)
	messageIndex map[string]map[string]*entity.ChatMessage
	mu           sync.RWMutex
	maxMessages  int
}

// NewInMemoryChatRepository creates a new InMemoryChatRepository
func NewInMemoryChatRepository() *InMemoryChatRepository {
	return &InMemoryChatRepository{
		messages:     make(map[string][]*entity.ChatMessage),
		messageIndex: make(map[string]map[string]*entity.ChatMessage),
		maxMessages:  repository.DefaultChatHistoryLimit,
	}
}

// AddMessage stores a new chat message for a room
func (r *InMemoryChatRepository) AddMessage(message *entity.ChatMessage) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	roomID := message.RoomID

	// Initialize room message slice if needed
	if r.messages[roomID] == nil {
		r.messages[roomID] = make([]*entity.ChatMessage, 0)
		r.messageIndex[roomID] = make(map[string]*entity.ChatMessage)
	}

	// Add message
	r.messages[roomID] = append(r.messages[roomID], message)
	r.messageIndex[roomID][message.ID] = message

	// Trim if over max
	if len(r.messages[roomID]) > r.maxMessages {
		// Remove oldest message
		oldest := r.messages[roomID][0]
		delete(r.messageIndex[roomID], oldest.ID)
		r.messages[roomID] = r.messages[roomID][1:]
	}

	return nil
}

// GetMessages retrieves chat messages for a room (chronological order)
func (r *InMemoryChatRepository) GetMessages(roomID string, limit int) ([]*entity.ChatMessage, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	messages := r.messages[roomID]
	if messages == nil {
		return []*entity.ChatMessage{}, nil
	}

	// Return up to limit messages (most recent)
	if limit <= 0 || limit > len(messages) {
		limit = len(messages)
	}

	// Return the last 'limit' messages
	start := len(messages) - limit
	result := make([]*entity.ChatMessage, limit)
	copy(result, messages[start:])

	return result, nil
}

// GetMessage retrieves a specific message by ID
func (r *InMemoryChatRepository) GetMessage(roomID, messageID string) (*entity.ChatMessage, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	roomIndex := r.messageIndex[roomID]
	if roomIndex == nil {
		return nil, ErrMessageNotFound
	}

	message, exists := roomIndex[messageID]
	if !exists {
		return nil, ErrMessageNotFound
	}

	return message, nil
}

// UpdateMessage updates a message (for reactions)
func (r *InMemoryChatRepository) UpdateMessage(message *entity.ChatMessage) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	roomIndex := r.messageIndex[message.RoomID]
	if roomIndex == nil {
		return ErrMessageNotFound
	}

	if _, exists := roomIndex[message.ID]; !exists {
		return ErrMessageNotFound
	}

	// Update in index (the slice reference is the same object)
	roomIndex[message.ID] = message

	return nil
}

// DeleteRoomMessages deletes all messages for a room
func (r *InMemoryChatRepository) DeleteRoomMessages(roomID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.messages, roomID)
	delete(r.messageIndex, roomID)

	return nil
}
