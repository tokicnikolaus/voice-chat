package room

import (
	"errors"

	"github.com/google/uuid"

	"voice-chat/internal/domain/entity"
	"voice-chat/internal/domain/repository"
)

var (
	ErrRoomNotFound = errors.New("room not found")
	ErrUserBanned   = errors.New("user is banned")
)

// JoinRoomInput represents the input for joining a room
type JoinRoomInput struct {
	RoomName  string
	UserID    string
	UserName  string
	VoiceMode entity.VoiceMode
	IP        string
	Stealth   bool // Admin only
}

// JoinRoomOutput represents the output after joining a room
type JoinRoomOutput struct {
	Room         *entity.Room
	User         *entity.User
	Participants []*entity.User
	IsNewRoom    bool
}

// JoinRoomUseCase handles the logic for joining a room
type JoinRoomUseCase struct {
	roomRepo     repository.RoomRepository
	userRepo     repository.UserRepository
	banRepo      repository.BanRepository
	activityRepo repository.ActivityRepository
	nameGen      *NameGenerator
}

// NewJoinRoomUseCase creates a new JoinRoomUseCase
func NewJoinRoomUseCase(
	roomRepo repository.RoomRepository,
	userRepo repository.UserRepository,
	banRepo repository.BanRepository,
	activityRepo repository.ActivityRepository,
) *JoinRoomUseCase {
	return &JoinRoomUseCase{
		roomRepo:     roomRepo,
		userRepo:     userRepo,
		banRepo:      banRepo,
		activityRepo: activityRepo,
		nameGen:      NewNameGenerator(),
	}
}

// Execute joins a user to a room, creating the room if it doesn't exist
func (uc *JoinRoomUseCase) Execute(input JoinRoomInput) (*JoinRoomOutput, error) {
	// Check if user is banned
	if uc.banRepo != nil && uc.banRepo.IsBanned(input.IP) {
		return nil, ErrUserBanned
	}

	// Try to get existing room or create new one
	room, err := uc.roomRepo.GetByName(input.RoomName)
	isNewRoom := false

	if err != nil || room == nil {
		// Room doesn't exist, create it (public by default for user-created rooms)
		roomID := uuid.New().String()
		room = entity.NewRoom(roomID, input.RoomName, entity.RoomTypePublic, input.UserID)
		if err := uc.roomRepo.Create(room); err != nil {
			return nil, err
		}
		isNewRoom = true
	}

	// Check if room can be joined
	if room.IsClosed {
		return nil, entity.ErrRoomClosed
	}

	if room.IsFull() {
		return nil, entity.ErrRoomFull
	}

	// Generate unique name for the room
	existingUsers, _ := uc.userRepo.GetByRoom(room.ID)
	existingNames := make([]string, len(existingUsers))
	for i, u := range existingUsers {
		existingNames[i] = u.Name
	}
	uniqueName := uc.nameGen.GenerateUniqueName(input.UserName, existingNames)

	// Create user
	user := entity.NewUser(input.UserID, uniqueName, input.IP, input.VoiceMode)
	user.IsStealth = input.Stealth

	// Add user to room
	if err := room.AddParticipant(user); err != nil {
		return nil, err
	}

	// Save user
	if err := uc.userRepo.Create(user); err != nil {
		room.RemoveParticipant(user.ID)
		return nil, err
	}

	// Update room
	if err := uc.roomRepo.Update(room); err != nil {
		return nil, err
	}

	// Log activity
	if uc.activityRepo != nil {
		activity := entity.NewActivityLog(
			uuid.New().String(),
			entity.ActivityTypeUserJoin,
			user.ID,
			user.Name,
			room.ID,
			room.Name,
			input.IP,
		)
		activity.AddDetail("voice_mode", string(input.VoiceMode))
		activity.AddDetail("stealth", input.Stealth)
		_ = uc.activityRepo.Log(activity)

		// Update peak users
		totalUsers := uc.userRepo.Count()
		uc.activityRepo.UpdatePeakUsers(totalUsers)
	}

	// Get visible participants for the user
	participants := room.GetVisibleParticipants(user)

	return &JoinRoomOutput{
		Room:         room,
		User:         user,
		Participants: participants,
		IsNewRoom:    isNewRoom,
	}, nil
}
