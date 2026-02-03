package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	// Server settings
	ServerPort     string
	ServerHost     string
	AllowedOrigins []string

	// LiveKit settings
	LiveKitURL       string // Internal URL for server-to-LiveKit communication
	LiveKitPublicURL string // Public URL sent to clients (defaults to LiveKitURL if not set)
	LiveKitAPIKey    string
	LiveKitAPISecret string

	// Admin settings
	AdminPassword   string
	AdminAllowedIPs []string

	// Room settings
	DefaultRoomCapacity int
	RoomCleanupMinutes  int

	// Logging settings
	LogLevel         string
	ActivityLogHours int

	// Redis settings (for chat persistence)
	RedisEnabled  bool
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// Webhook settings (for external notifications)
	WebhookURL    string // External webhook URL to receive notifications
	WebhookSecret string // HMAC secret for webhook signature verification

	// Auth API settings
	AuthAPIBaseURL string // Base URL for auth API
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		// Server
		ServerPort:     getEnv("SERVER_PORT", "8080"),
		ServerHost:     getEnv("SERVER_HOST", "0.0.0.0"),
		AllowedOrigins: getEnvSlice("ALLOWED_ORIGINS", []string{"*"}),

		// LiveKit
		LiveKitURL:       getEnv("LIVEKIT_URL", "ws://localhost:7880"),
		LiveKitPublicURL: getEnv("LIVEKIT_PUBLIC_URL", getEnv("LIVEKIT_URL", "ws://localhost:7880")),
		LiveKitAPIKey:    getEnv("LIVEKIT_API_KEY", "devkey"),
		LiveKitAPISecret: getEnv("LIVEKIT_API_SECRET", "secret"),

		// Admin
		AdminPassword:   getEnv("ADMIN_PASSWORD", "admin123"),
		AdminAllowedIPs: getEnvSlice("ADMIN_ALLOWED_IPS", []string{}),

		// Room
		DefaultRoomCapacity: getEnvInt("DEFAULT_ROOM_CAPACITY", 15),
		RoomCleanupMinutes:  getEnvInt("ROOM_CLEANUP_MINUTES", 10),

		// Logging
		LogLevel:         getEnv("LOG_LEVEL", "info"),
		ActivityLogHours: getEnvInt("ACTIVITY_LOG_HOURS", 48),

		// Redis (disabled by default, uses in-memory)
		RedisEnabled:  getEnvBool("REDIS_ENABLED", false),
		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 0),

		// Webhooks (for external notifications when users disconnect, rooms close, etc.)
		WebhookURL:    getEnv("WEBHOOK_URL", ""),
		WebhookSecret: getEnv("WEBHOOK_SECRET", ""),

		// Auth API
		AuthAPIBaseURL: getEnv("AUTH_API_BASE_URL", ""),
	}
}

// GetServerAddress returns the full server address
func (c *Config) GetServerAddress() string {
	return c.ServerHost + ":" + c.ServerPort
}

// GetRoomCleanupDuration returns the room cleanup duration
func (c *Config) GetRoomCleanupDuration() time.Duration {
	return time.Duration(c.RoomCleanupMinutes) * time.Minute
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}
