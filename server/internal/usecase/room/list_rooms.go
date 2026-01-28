package room

import (
	"voice-chat/internal/domain/entity"
	"voice-chat/internal/domain/repository"
)

// RoomSummary represents a summary of a room for listing
type RoomSummary struct {
	ID               string          `json:"id"`
	Name             string          `json:"name"`
	Type             entity.RoomType `json:"type"`
	ParticipantCount int             `json:"participant_count"`
	Capacity         int             `json:"capacity"`
	IsFull           bool            `json:"is_full"`
}

// ListRoomsOutput represents the output of listing rooms
type ListRoomsOutput struct {
	Rooms []*RoomSummary
}

// ListRoomsUseCase handles listing available rooms
type ListRoomsUseCase struct {
	roomRepo repository.RoomRepository
}

// NewListRoomsUseCase creates a new ListRoomsUseCase
func NewListRoomsUseCase(roomRepo repository.RoomRepository) *ListRoomsUseCase {
	return &ListRoomsUseCase{
		roomRepo: roomRepo,
	}
}

// Execute returns all public rooms
func (uc *ListRoomsUseCase) Execute() (*ListRoomsOutput, error) {
	rooms, err := uc.roomRepo.GetPublicRooms()
	if err != nil {
		return nil, err
	}

	summaries := make([]*RoomSummary, 0, len(rooms))
	for _, room := range rooms {
		if room.IsClosed {
			continue
		}
		summaries = append(summaries, &RoomSummary{
			ID:               room.ID,
			Name:             room.Name,
			Type:             room.Type,
			ParticipantCount: room.VisibleParticipantCount(),
			Capacity:         room.Capacity,
			IsFull:           room.IsFull(),
		})
	}

	return &ListRoomsOutput{Rooms: summaries}, nil
}

// ExecuteAll returns all rooms (for admin)
func (uc *ListRoomsUseCase) ExecuteAll() (*ListRoomsOutput, error) {
	rooms, err := uc.roomRepo.GetAll()
	if err != nil {
		return nil, err
	}

	summaries := make([]*RoomSummary, 0, len(rooms))
	for _, room := range rooms {
		summaries = append(summaries, &RoomSummary{
			ID:               room.ID,
			Name:             room.Name,
			Type:             room.Type,
			ParticipantCount: room.ParticipantCount(),
			Capacity:         room.Capacity,
			IsFull:           room.IsFull(),
		})
	}

	return &ListRoomsOutput{Rooms: summaries}, nil
}
