import { create } from 'zustand';
import type {
  ConnectionState,
  Participant,
  RoomSummary,
  JoinRoomResponse,
  VoiceMode,
} from '@/domain/types';

export interface RoomState {
  // Connection
  connectionState: ConnectionState;
  userId: string | null;
  error: string | null;

  // Room
  currentRoom: {
    id: string;
    name: string;
    livekitToken: string;
    livekitUrl: string;
  } | null;
  participants: Participant[];
  availableRooms: RoomSummary[];

  // Voice state
  isMuted: boolean;
  voiceMode: VoiceMode;
  speakingParticipants: Set<string>;
  connectionQualities: Map<string, number>;

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  setUserId: (userId: string) => void;
  setError: (error: string | null) => void;

  joinRoom: (response: JoinRoomResponse) => void;
  leaveRoom: () => void;
  setAvailableRooms: (rooms: RoomSummary[]) => void;

  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;

  setMuted: (muted: boolean) => void;
  setVoiceMode: (mode: VoiceMode) => void;
  setSpeaking: (participantId: string, speaking: boolean) => void;
  setConnectionQuality: (participantId: string, quality: number) => void;

  reset: () => void;
}

const initialState = {
  connectionState: 'disconnected' as ConnectionState,
  userId: null,
  error: null,
  currentRoom: null,
  participants: [],
  availableRooms: [],
  isMuted: true,
  voiceMode: 'ptt' as VoiceMode,
  speakingParticipants: new Set<string>(),
  connectionQualities: new Map<string, number>(),
};

export const useRoomStore = create<RoomState>((set, _get) => ({
  ...initialState,

  setConnectionState: (connectionState) => set({ connectionState }),

  setUserId: (userId) => set({ userId }),

  setError: (error) => set({ error }),

  joinRoom: (response) =>
    set({
      currentRoom: {
        id: response.roomId,
        name: response.roomName,
        livekitToken: response.livekitToken,
        livekitUrl: response.livekitUrl,
      },
      participants: response.participants,
      error: null,
    }),

  leaveRoom: () =>
    set({
      currentRoom: null,
      participants: [],
      speakingParticipants: new Set(),
      connectionQualities: new Map(),
      isMuted: true,
    }),

  setAvailableRooms: (rooms) => set({ availableRooms: rooms }),

  addParticipant: (participant) =>
    set((state) => {
      // Check if participant already exists to avoid duplicates
      const exists = state.participants.some((p) => p.id === participant.id);
      if (exists) {
        return state; // Don't add duplicate
      }
      return {
        participants: [...state.participants, participant],
      };
    }),

  removeParticipant: (participantId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== participantId),
    })),

  updateParticipant: (participantId, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, ...updates } : p
      ),
    })),

  setMuted: (muted) => set({ isMuted: muted }),

  setVoiceMode: (mode) => set({ voiceMode: mode }),

  setSpeaking: (participantId, speaking) =>
    set((state) => {
      const newSet = new Set(state.speakingParticipants);
      if (speaking) {
        newSet.add(participantId);
      } else {
        newSet.delete(participantId);
      }
      return { speakingParticipants: newSet };
    }),

  setConnectionQuality: (participantId, quality) =>
    set((state) => {
      const newMap = new Map(state.connectionQualities);
      newMap.set(participantId, quality);
      return { connectionQualities: newMap };
    }),

  reset: () => set(initialState),
}));
