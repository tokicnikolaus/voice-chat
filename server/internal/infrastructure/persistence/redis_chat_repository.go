package persistence

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"voice-chat/internal/domain/entity"
	"voice-chat/internal/domain/repository"
)

// RedisChatRepository is a Redis implementation of ChatRepository
type RedisChatRepository struct {
	client      *redis.Client
	maxMessages int
	ttl         time.Duration // TTL for room chat data
}

// NewRedisChatRepository creates a new RedisChatRepository
func NewRedisChatRepository(addr, password string, db int) (*RedisChatRepository, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisChatRepository{
		client:      client,
		maxMessages: repository.DefaultChatHistoryLimit,
		ttl:         24 * time.Hour, // Messages expire after 24 hours of inactivity
	}, nil
}

// Close closes the Redis connection
func (r *RedisChatRepository) Close() error {
	return r.client.Close()
}

// roomKey returns the Redis key for a room's message list
func (r *RedisChatRepository) roomKey(roomID string) string {
	return fmt.Sprintf("chat:room:%s:messages", roomID)
}

// messageKey returns the Redis key for a specific message
func (r *RedisChatRepository) messageKey(roomID, messageID string) string {
	return fmt.Sprintf("chat:room:%s:msg:%s", roomID, messageID)
}

// AddMessage stores a new chat message for a room
func (r *RedisChatRepository) AddMessage(message *entity.ChatMessage) error {
	ctx := context.Background()

	// Serialize message
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	roomKey := r.roomKey(message.RoomID)
	msgKey := r.messageKey(message.RoomID, message.ID)

	// Use pipeline for atomic operations
	pipe := r.client.Pipeline()

	// Store message data
	pipe.Set(ctx, msgKey, data, r.ttl)

	// Add message ID to room's list (sorted by timestamp)
	pipe.ZAdd(ctx, roomKey, redis.Z{
		Score:  float64(message.Timestamp.UnixNano()),
		Member: message.ID,
	})

	// Trim to max messages (remove oldest)
	pipe.ZRemRangeByRank(ctx, roomKey, 0, int64(-r.maxMessages-1))

	// Refresh TTL on room key
	pipe.Expire(ctx, roomKey, r.ttl)

	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to add message: %w", err)
	}

	return nil
}

// GetMessages retrieves chat messages for a room (chronological order)
func (r *RedisChatRepository) GetMessages(roomID string, limit int) ([]*entity.ChatMessage, error) {
	ctx := context.Background()

	if limit <= 0 {
		limit = r.maxMessages
	}

	roomKey := r.roomKey(roomID)

	// Get message IDs (sorted by timestamp, ascending)
	// We want the most recent 'limit' messages
	messageIDs, err := r.client.ZRange(ctx, roomKey, int64(-limit), -1).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get message IDs: %w", err)
	}

	if len(messageIDs) == 0 {
		return []*entity.ChatMessage{}, nil
	}

	// Fetch all messages
	messages := make([]*entity.ChatMessage, 0, len(messageIDs))
	for _, msgID := range messageIDs {
		msgKey := r.messageKey(roomID, msgID)
		data, err := r.client.Get(ctx, msgKey).Bytes()
		if err == redis.Nil {
			continue // Message expired or deleted
		}
		if err != nil {
			return nil, fmt.Errorf("failed to get message %s: %w", msgID, err)
		}

		var msg entity.ChatMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			continue // Skip corrupted messages
		}
		messages = append(messages, &msg)
	}

	return messages, nil
}

// GetMessage retrieves a specific message by ID
func (r *RedisChatRepository) GetMessage(roomID, messageID string) (*entity.ChatMessage, error) {
	ctx := context.Background()

	msgKey := r.messageKey(roomID, messageID)
	data, err := r.client.Get(ctx, msgKey).Bytes()
	if err == redis.Nil {
		return nil, ErrMessageNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get message: %w", err)
	}

	var msg entity.ChatMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal message: %w", err)
	}

	return &msg, nil
}

// UpdateMessage updates a message (for reactions)
func (r *RedisChatRepository) UpdateMessage(message *entity.ChatMessage) error {
	ctx := context.Background()

	msgKey := r.messageKey(message.RoomID, message.ID)

	// Check if message exists
	exists, err := r.client.Exists(ctx, msgKey).Result()
	if err != nil {
		return fmt.Errorf("failed to check message existence: %w", err)
	}
	if exists == 0 {
		return ErrMessageNotFound
	}

	// Serialize and update
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	// Keep existing TTL
	ttl, err := r.client.TTL(ctx, msgKey).Result()
	if err != nil || ttl < 0 {
		ttl = r.ttl
	}

	err = r.client.Set(ctx, msgKey, data, ttl).Err()
	if err != nil {
		return fmt.Errorf("failed to update message: %w", err)
	}

	return nil
}

// DeleteRoomMessages deletes all messages for a room
func (r *RedisChatRepository) DeleteRoomMessages(roomID string) error {
	ctx := context.Background()

	roomKey := r.roomKey(roomID)

	// Get all message IDs
	messageIDs, err := r.client.ZRange(ctx, roomKey, 0, -1).Result()
	if err != nil {
		return fmt.Errorf("failed to get message IDs: %w", err)
	}

	if len(messageIDs) == 0 {
		return nil
	}

	// Delete all message keys and the room key
	keys := make([]string, 0, len(messageIDs)+1)
	keys = append(keys, roomKey)
	for _, msgID := range messageIDs {
		keys = append(keys, r.messageKey(roomID, msgID))
	}

	err = r.client.Del(ctx, keys...).Err()
	if err != nil {
		return fmt.Errorf("failed to delete room messages: %w", err)
	}

	return nil
}
