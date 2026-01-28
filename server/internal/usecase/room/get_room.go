package room

import (
	"voice-chat/internal/domain/entity"
	"voice-chat/internal/domain/repository"
)

// ParticipantInfo represents participant info for preview
type ParticipantInfo struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	IsMuted  bool   `json:"is_muted"`
	IsAdmin  bool   `json:"is_admin"`
}

// GetRoomInput represents the input for getting room info
type GetRoomInput struct {
	RoomName string
	RoomID   string // Optional, can query by ID or name
}

// GetRoomOutput represents the room preview information
type GetRoomOutput struct {
	ID           string             `json:"id"`
	Name         string             `json:"name"`
	Type         entity.RoomType    `json:"type"`
	Capacity     int                `json:"capacity"`
	Participants []*ParticipantInfo `json:"participants"`
	CanJoin      bool               `json:"can_join"`
	IsClosed     bool               `json:"is_closed"`
}

// GetRoomUseCase handles getting room information
type GetRoomUseCase struct {
	roomRepo repository.RoomRepository
}

// NewGetRoomUseCase creates a new GetRoomUseCase
func NewGetRoomUseCase(roomRepo repository.RoomRepository) *GetRoomUseCase {
	return &GetRoomUseCase{
		roomRepo: roomRepo,
	}
}

// Execute returns room information for preview
func (uc *GetRoomUseCase) Execute(input GetRoomInput) (*GetRoomOutput, error) {
	var room *entity.Room
	var err error

	if input.RoomID != "" {
		room, err = uc.roomRepo.GetByID(input.RoomID)
	} else {
		room, err = uc.roomRepo.GetByName(input.RoomName)
	}

	if err != nil {
		return nil, err
	}

	if room == nil {
		// Room doesn't exist yet - it will be created when first user joins
		return &GetRoomOutput{
			Name:         input.RoomName,
			Type:         entity.RoomTypePublic,
			Capacity:     entity.DefaultRoomCapacity,
			Participants: []*ParticipantInfo{},
			CanJoin:      true,
			IsClosed:     false,
		}, nil
	}

	// Get visible participants (non-stealth)
	participants := make([]*ParticipantInfo, 0)
	for _, p := range room.Participants {
		if !p.IsStealth {
			participants = append(participants, &ParticipantInfo{
				ID:      p.ID,
				Name:    p.Name,
				IsMuted: p.IsMuted,
				IsAdmin: p.IsAdmin,
			})
		}
	}

	return &GetRoomOutput{
		ID:           room.ID,
		Name:         room.Name,
		Type:         room.Type,
		Capacity:     room.Capacity,
		Participants: participants,
		CanJoin:      room.CanJoin(),
		IsClosed:     room.IsClosed,
	}, nil
}
