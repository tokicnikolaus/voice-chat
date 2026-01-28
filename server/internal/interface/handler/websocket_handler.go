package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"voice-chat/internal/domain/entity"
	"voice-chat/internal/infrastructure/livekit"
	"voice-chat/internal/interface/dto"
	"voice-chat/internal/usecase/admin"
	"voice-chat/internal/usecase/room"
	"voice-chat/pkg/config"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for LAN deployment
	},
}

type Client struct {
	ID             string
	Conn           *websocket.Conn
	Handler        *WebSocketHandler
	UserID         string
	RoomID         string
	IP             string
	IsAdmin        bool
	BackgroundAudio bool
	mu             sync.Mutex
}

type WebSocketHandler struct {
	createRoomUC   *room.CreateRoomUseCase
	joinRoomUC     *room.JoinRoomUseCase
	leaveRoomUC    *room.LeaveRoomUseCase
	listRoomsUC    *room.ListRoomsUseCase
	getRoomUC      *room.GetRoomUseCase
	adminAuthUC    *admin.AdminAuthUseCase
	adminActionsUC *admin.AdminActionsUseCase
	getStatsUC     *admin.GetStatsUseCase
	tokenService   *livekit.TokenService
	config         *config.Config
	clients        map[string]*Client
	roomClients    map[string]map[string]*Client
	mu             sync.RWMutex
}

func NewWebSocketHandler(
	createRoomUC *room.CreateRoomUseCase,
	joinRoomUC *room.JoinRoomUseCase,
	leaveRoomUC *room.LeaveRoomUseCase,
	listRoomsUC *room.ListRoomsUseCase,
	getRoomUC *room.GetRoomUseCase,
	adminAuthUC *admin.AdminAuthUseCase,
	adminActionsUC *admin.AdminActionsUseCase,
	getStatsUC *admin.GetStatsUseCase,
	tokenService *livekit.TokenService,
	cfg *config.Config,
) *WebSocketHandler {
	return &WebSocketHandler{
		createRoomUC:   createRoomUC,
		joinRoomUC:     joinRoomUC,
		leaveRoomUC:    leaveRoomUC,
		listRoomsUC:    listRoomsUC,
		getRoomUC:      getRoomUC,
		adminAuthUC:    adminAuthUC,
		adminActionsUC: adminActionsUC,
		getStatsUC:     getStatsUC,
		tokenService:   tokenService,
		config:         cfg,
		clients:        make(map[string]*Client),
		roomClients:    make(map[string]map[string]*Client),
	}
}

func (h *WebSocketHandler) HandleConnection(w http.ResponseWriter, r *http.Request) {
	log.Printf("WebSocket connection attempt from %s, Host: %s", getClientIP(r), r.Host)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading connection: %v", err)
		return
	}

	log.Printf("WebSocket connection upgraded successfully")

	userID := uuid.New().String()
	client := &Client{
		ID:      uuid.New().String(),
		Conn:    conn,
		Handler: h,
		UserID:  userID,
		IP:      getClientIP(r),
	}

	h.registerClient(client)
	log.Printf("Client registered: UserID=%s, Total clients=%d", userID, len(h.clients))

	// Send connected message
	h.sendToClient(client, "connected", dto.ConnectedResponse{
		Message: "Connected to voice chat server",
		UserID:  userID,
	})

	// Start ping keepalive
	go h.startPingKeepalive(client)

	// Handle messages
	go h.readMessages(client)
}

func (h *WebSocketHandler) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client.UserID] = client
}

func (h *WebSocketHandler) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, client.UserID)
	if client.RoomID != "" {
		if roomClients, ok := h.roomClients[client.RoomID]; ok {
			delete(roomClients, client.UserID)
			if len(roomClients) == 0 {
				delete(h.roomClients, client.RoomID)
			}
		}
	}
}

func (h *WebSocketHandler) readMessages(client *Client) {
	defer func() {
		log.Printf("WebSocket connection closing for UserID=%s", client.UserID)
		h.handleDisconnect(client)
		client.Conn.Close()
		h.unregisterClient(client)
		log.Printf("Client unregistered: UserID=%s, Remaining clients=%d", client.UserID, len(h.clients))
	}()

	for {
		var msg dto.Message
		err := client.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Error reading message from UserID=%s: %v", client.UserID, err)
			} else {
				log.Printf("WebSocket read error (normal closure) for UserID=%s: %v", client.UserID, err)
			}
			break
		}

		h.handleMessage(client, msg)
	}
}

func (h *WebSocketHandler) handleMessage(client *Client, msg dto.Message) {
	switch msg.Type {
	case "join_room":
		h.handleJoinRoom(client, msg.Payload)
	case "leave_room":
		h.handleLeaveRoom(client, msg.Payload)
	case "list_rooms":
		h.handleListRooms(client)
	case "get_rooms":
		// Alias for list_rooms
		h.handleListRooms(client)
	case "get_room":
		h.handleGetRoom(client, msg.Payload)
	case "ping":
		// Respond to ping with pong
		h.sendToClient(client, "pong", map[string]interface{}{})
		return
	case "pong":
		// Silently handle pong
		return
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func (h *WebSocketHandler) handleJoinRoom(client *Client, payload json.RawMessage) {
	var req dto.JoinRoomRequest
	if err := json.Unmarshal(payload, &req); err != nil {
		h.sendError(client, "INVALID_PAYLOAD", "Invalid join room request")
		return
	}

	voiceMode := entity.VoiceModePTT
	if req.VoiceMode == "vad" {
		voiceMode = entity.VoiceModeVAD
	}

	result, err := h.joinRoomUC.Execute(room.JoinRoomInput{
		RoomName:  req.RoomName,
		UserID:    client.UserID,
		UserName:  req.UserName,
		VoiceMode: voiceMode,
		IP:        client.IP,
	})

	if err != nil {
		h.sendError(client, "JOIN_FAILED", err.Error())
		return
	}

	// Generate LiveKit token
	token, err := h.tokenService.GenerateToken(result.Room.Name, client.UserID, result.User.Name, true)
	if err != nil {
		log.Printf("ERROR: Failed to generate LiveKit token for user %s in room %s: %v", client.UserID, result.Room.Name, err)
		h.sendError(client, "TOKEN_FAILED", "Failed to generate voice token")
		return
	}

	// Log token generation for debugging
	log.Printf("LiveKit token generated: UserID=%s, RoomName=%s, TokenLength=%d, LiveKitURL=%s",
		client.UserID, result.Room.Name, len(token), h.config.LiveKitURL)

	// Update client state
	client.RoomID = result.Room.ID

	// Add to room clients
	h.mu.Lock()
	if _, ok := h.roomClients[result.Room.ID]; !ok {
		h.roomClients[result.Room.ID] = make(map[string]*Client)
	}
	h.roomClients[result.Room.ID][client.UserID] = client
	isAlone := len(h.roomClients[result.Room.ID]) == 1
	h.mu.Unlock()

	// Initialize background audio state to false
	// The test tone sender will send play_test_tone if user is alone
	client.mu.Lock()
	client.BackgroundAudio = false
	client.mu.Unlock()

	// If user is alone, send play_test_tone immediately (don't wait for first tick)
	if isAlone {
		log.Printf("Sending initial play_test_tone to client %s (alone in new/empty room)", client.UserID)
		h.sendToClient(client, "play_test_tone", map[string]interface{}{})
		client.mu.Lock()
		client.BackgroundAudio = true
		client.mu.Unlock()
	}

	// Start test tone sender to monitor for changes
	go h.startTestToneSender(client)

	// Send join response
	h.sendToClient(client, "room_joined", dto.JoinRoomResponse{
		RoomID:       result.Room.ID,
		RoomName:     result.Room.Name,
		UserID:       result.User.ID,
		UserName:     result.User.Name,
		LiveKitToken: token,
		LiveKitURL:   h.config.LiveKitURL,
		Participants: dto.ToParticipantDTOs(result.Participants),
		IsNewRoom:    result.IsNewRoom,
	})

	log.Printf("Sent room_joined response: UserID=%s, RoomID=%s, LiveKitURL=%s",
		client.UserID, result.Room.ID, h.config.LiveKitURL)

	// Notify other participants
	h.broadcastToRoom(result.Room.ID, client.UserID, "user_joined", dto.UserJoinedEvent{
		UserID:   result.User.ID,
		UserName: result.User.Name,
		RoomID:   result.Room.ID,
	})

	// Broadcast updated room list to clients in lobby
	h.broadcastRoomListToLobby()
}

func (h *WebSocketHandler) handleLeaveRoom(client *Client, payload json.RawMessage) {
	if client.RoomID == "" {
		return
	}

	roomID := client.RoomID
	userID := client.UserID

	_, err := h.leaveRoomUC.Execute(room.LeaveRoomInput{
		RoomID: roomID,
		UserID: userID,
	})

	if err != nil {
		h.sendError(client, "LEAVE_FAILED", err.Error())
		return
	}

	// Remove from room clients
	h.mu.Lock()
	if roomClients, ok := h.roomClients[roomID]; ok {
		delete(roomClients, userID)
		if len(roomClients) == 0 {
			delete(h.roomClients, roomID)
		}
	}
	h.mu.Unlock()

	// Stop background audio when leaving
	client.mu.Lock()
	client.BackgroundAudio = false
	client.mu.Unlock()

	client.RoomID = ""

	h.sendToClient(client, "room_left", map[string]interface{}{})

	// Notify other participants
	h.broadcastToRoom(roomID, userID, "user_left", dto.UserLeftEvent{
		UserID: userID,
		RoomID: roomID,
	})

	// Broadcast updated room list to clients in lobby
	h.broadcastRoomListToLobby()
}

func (h *WebSocketHandler) handleListRooms(client *Client) {
	result, err := h.listRoomsUC.Execute()
	if err != nil {
		h.sendError(client, "LIST_FAILED", err.Error())
		return
	}

	h.sendToClient(client, "room_list", dto.RoomListResponse{
		Rooms: dto.ToRoomInfoDTOs(result.Rooms),
	})
}

func (h *WebSocketHandler) handleGetRoom(client *Client, payload json.RawMessage) {
	var req dto.GetRoomRequest
	if err := json.Unmarshal(payload, &req); err != nil {
		h.sendError(client, "INVALID_PAYLOAD", "Invalid get room request")
		return
	}

	roomInfo, err := h.getRoomUC.Execute(room.GetRoomInput{
		RoomID:   req.RoomID,
		RoomName: req.RoomName,
	})
	if err != nil {
		h.sendError(client, "ROOM_NOT_FOUND", "Room not found")
		return
	}

	h.sendToClient(client, "room_info", dto.ToRoomInfoDTO(roomInfo))
}

func (h *WebSocketHandler) handleDisconnect(client *Client) {
	if client.RoomID != "" {
		h.handleLeaveRoom(client, nil)
	}
}

func (h *WebSocketHandler) startPingKeepalive(client *Client) {
	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Check if client is still connected
			h.mu.RLock()
			_, exists := h.clients[client.UserID]
			h.mu.RUnlock()

			if !exists {
				return
			}

			// Send ping
			if err := h.sendToClient(client, "ping", map[string]interface{}{}); err != nil {
				return
			}
		}
	}
}

func (h *WebSocketHandler) startTestToneSender(client *Client) {
	firstCheck := true
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Check if client is still registered and in a room
			h.mu.RLock()
			_, clientExists := h.clients[client.UserID]
			roomClients, roomExists := h.roomClients[client.RoomID]
			h.mu.RUnlock()

			if !clientExists || !roomExists || client.RoomID == "" {
				return
			}

			roomClientCount := len(roomClients)
			isAlone := roomClientCount == 1

			// Only send messages when state changes
			client.mu.Lock()
			wasPlaying := client.BackgroundAudio
			client.mu.Unlock()

			if isAlone && !wasPlaying {
				log.Printf("Sending play_test_tone to client %s (alone in room %s, roomClients: %d)", client.UserID, client.RoomID, roomClientCount)
				h.sendToClient(client, "play_test_tone", map[string]interface{}{})
				client.mu.Lock()
				client.BackgroundAudio = true
				client.mu.Unlock()
			} else if !isAlone && wasPlaying {
				log.Printf("Sending stop_test_tone to client %s (room %s has %d participants)", client.UserID, client.RoomID, roomClientCount)
				h.sendToClient(client, "stop_test_tone", map[string]interface{}{})
				client.mu.Lock()
				client.BackgroundAudio = false
				client.mu.Unlock()
			} else if firstCheck {
				log.Printf("Test tone sender started for client %s in room %s (alone: %v, wasPlaying: %v, roomClients: %d)",
					client.UserID, client.RoomID, isAlone, wasPlaying, roomClientCount)
			}
			firstCheck = false
		}
	}
}

func (h *WebSocketHandler) sendToClient(client *Client, msgType string, payload interface{}) error {
	client.mu.Lock()
	defer client.mu.Unlock()

	msg := map[string]interface{}{
		"type":      msgType,
		"payload":   payload,
		"timestamp": time.Now(),
	}

	return client.Conn.WriteJSON(msg)
}

func (h *WebSocketHandler) sendError(client *Client, code, message string) {
	h.sendToClient(client, "error", dto.ErrorResponse{
		Code:    code,
		Message: message,
	})
}

func (h *WebSocketHandler) sendToUser(userID string, msgType string, payload interface{}) {
	h.mu.RLock()
	client, ok := h.clients[userID]
	h.mu.RUnlock()

	if ok {
		h.sendToClient(client, msgType, payload)
	}
}

func (h *WebSocketHandler) broadcastToRoom(roomID, excludeUserID string, msgType string, payload interface{}) {
	h.mu.RLock()
	roomClients, ok := h.roomClients[roomID]
	if !ok {
		h.mu.RUnlock()
		return
	}

	clients := make([]*Client, 0, len(roomClients))
	for _, client := range roomClients {
		if client.UserID != excludeUserID {
			clients = append(clients, client)
		}
	}
	h.mu.RUnlock()

	for _, client := range clients {
		h.sendToClient(client, msgType, payload)
	}
}

// broadcastRoomListToLobby sends updated room list to all clients not in a room
func (h *WebSocketHandler) broadcastRoomListToLobby() {
	result, err := h.listRoomsUC.Execute()
	if err != nil {
		log.Printf("Error fetching room list for broadcast: %v", err)
		return
	}

	payload := dto.RoomListResponse{
		Rooms: dto.ToRoomInfoDTOs(result.Rooms),
	}

	h.mu.RLock()
	lobbyClients := make([]*Client, 0)
	for _, client := range h.clients {
		if client.RoomID == "" {
			lobbyClients = append(lobbyClients, client)
		}
	}
	h.mu.RUnlock()

	for _, client := range lobbyClients {
		h.sendToClient(client, "room_list", payload)
	}
}

func getClientIP(r *http.Request) string {
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("X-Forwarded-For")
	}
	if ip == "" {
		ip = r.RemoteAddr
	}
	return ip
}
