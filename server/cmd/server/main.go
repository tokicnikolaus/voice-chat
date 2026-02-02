package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"voice-chat/internal/domain/repository"
	"voice-chat/internal/infrastructure/livekit"
	"voice-chat/internal/infrastructure/persistence"
	"voice-chat/internal/interface/handler"
	"voice-chat/internal/usecase/admin"
	"voice-chat/internal/usecase/room"
	"voice-chat/pkg/config"
)

func main() {
	// Load configuration
	cfg := config.Load()

	log.Printf("Starting Voice Chat Server on %s", cfg.GetServerAddress())
	log.Printf("LiveKit URL: %s", cfg.LiveKitURL)

	// Initialize repositories
	roomRepo := persistence.NewInMemoryRoomRepository()
	userRepo := persistence.NewInMemoryUserRepository()
	banRepo := persistence.NewInMemoryBanRepository()
	activityRepo := persistence.NewInMemoryActivityRepository()

	// Initialize chat repository (Redis if enabled, otherwise in-memory)
	var chatRepo repository.ChatRepository
	if cfg.RedisEnabled {
		log.Printf("Initializing Redis chat repository at %s", cfg.RedisAddr)
		redisRepo, err := persistence.NewRedisChatRepository(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
		if err != nil {
			log.Fatalf("Failed to initialize Redis chat repository: %v", err)
		}
		chatRepo = redisRepo
		log.Println("Redis chat repository initialized successfully")
	} else {
		log.Println("Using in-memory chat repository")
		chatRepo = persistence.NewInMemoryChatRepository()
	}

	// Initialize services
	tokenService := livekit.NewTokenService(cfg.LiveKitAPIKey, cfg.LiveKitAPISecret)

	// Initialize use cases
	createRoomUC := room.NewCreateRoomUseCase(roomRepo, activityRepo)
	joinRoomUC := room.NewJoinRoomUseCase(roomRepo, userRepo, banRepo, activityRepo)
	leaveRoomUC := room.NewLeaveRoomUseCase(roomRepo, userRepo, activityRepo)
	listRoomsUC := room.NewListRoomsUseCase(roomRepo)
	getRoomUC := room.NewGetRoomUseCase(roomRepo)
	adminAuthUC := admin.NewAdminAuthUseCase(cfg.AdminPassword, cfg.AdminAllowedIPs)
	adminActionsUC := admin.NewAdminActionsUseCase(roomRepo, userRepo, banRepo, activityRepo)
	getStatsUC := admin.NewGetStatsUseCase(roomRepo, userRepo, banRepo, activityRepo)

	// Initialize WebSocket handler
	wsHandler := handler.NewWebSocketHandler(
		createRoomUC,
		joinRoomUC,
		leaveRoomUC,
		listRoomsUC,
		getRoomUC,
		adminAuthUC,
		adminActionsUC,
		getStatsUC,
		tokenService,
		chatRepo,
		cfg,
	)

	// Setup HTTP routes
	mux := http.NewServeMux()

	// WebSocket endpoint
	mux.HandleFunc("/ws", wsHandler.HandleConnection)

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// CORS middleware
	corsHandler := corsMiddleware(mux)

	// Create server
	server := &http.Server{
		Addr:         cfg.GetServerAddress(),
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start room cleanup goroutine
	go startRoomCleanup(roomRepo, chatRepo, cfg.RoomCleanupMinutes)

	// Start ban cleanup goroutine
	go startBanCleanup(banRepo)

	// Start activity log cleanup goroutine
	go startActivityCleanup(activityRepo, cfg.ActivityLogHours)

	// Start server in goroutine
	go func() {
		log.Printf("Server listening on %s", cfg.GetServerAddress())
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped")
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func startRoomCleanup(roomRepo *persistence.InMemoryRoomRepository, chatRepo repository.ChatRepository, intervalMinutes int) {
	ticker := time.NewTicker(time.Duration(intervalMinutes) * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rooms, err := roomRepo.GetEmptyRoomsSince(intervalMinutes)
		if err != nil {
			log.Printf("Error getting empty rooms: %v", err)
			continue
		}

		for _, r := range rooms {
			// Delete chat messages for the room
			if err := chatRepo.DeleteRoomMessages(r.ID); err != nil {
				log.Printf("Error deleting chat messages for room %s: %v", r.Name, err)
			}

			// Delete the room
			if err := roomRepo.Delete(r.ID); err != nil {
				log.Printf("Error deleting room %s: %v", r.Name, err)
			} else {
				log.Printf("Cleaned up empty room: %s", r.Name)
			}
		}
	}
}

func startBanCleanup(banRepo *persistence.InMemoryBanRepository) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		count, err := banRepo.DeleteExpired()
		if err != nil {
			log.Printf("Error cleaning up expired bans: %v", err)
			continue
		}
		if count > 0 {
			log.Printf("Cleaned up %d expired bans", count)
		}
	}
}

func startActivityCleanup(activityRepo *persistence.InMemoryActivityRepository, hoursToKeep int) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		count := activityRepo.Cleanup(hoursToKeep)
		if count > 0 {
			log.Printf("Cleaned up %d old activity logs", count)
		}
	}
}
