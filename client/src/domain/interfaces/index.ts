import type {
  ConnectionState,
  JoinRoomResponse,
  Room,
  RoomSummary,
  VoiceMode,
  AdminStats,
  WebSocketMessage,
} from '../types';

// WebSocket service interface
export interface IWebSocketService {
  connect(): Promise<void>;
  disconnect(): void;
  send<T>(type: string, payload?: T): void;
  onMessage(handler: (message: WebSocketMessage) => void): () => void;
  onConnectionChange(handler: (state: ConnectionState) => void): () => void;
  getConnectionState(): ConnectionState;
}

// Audio device info
export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

// Voice service interface (LiveKit)
export interface IVoiceService {
  connect(url: string, token: string): Promise<void>;
  disconnect(): Promise<void>;
  setMicrophoneEnabled(enabled: boolean): Promise<void>;
  isMicrophoneEnabled(): boolean;
  enumerateAudioDevices(): Promise<AudioDevice[]>;
  setAudioInputDevice(deviceId: string): Promise<void>;
  setAudioOutputDevice(deviceId: string): Promise<void>;
  getCurrentAudioInputDevice(): string | null;
  getCurrentAudioOutputDevice(): string | null;
  onParticipantSpeaking(handler: (participantId: string, speaking: boolean) => void): () => void;
  onConnectionQualityChange(handler: (participantId: string, quality: number) => void): () => void;
  setParticipantVolume(participantId: string, volume: number): void;
}

// Room service interface
export interface IRoomService {
  joinRoom(roomName: string, userName: string, voiceMode: VoiceMode): Promise<JoinRoomResponse>;
  leaveRoom(): Promise<void>;
  getRooms(): Promise<RoomSummary[]>;
  getRoomPreview(roomName: string): Promise<Room>;
}

// Admin service interface
export interface IAdminService {
  authenticate(password: string): Promise<boolean>;
  muteUser(userId: string, roomId: string): Promise<void>;
  kickUser(userId: string, roomId: string, reason?: string): Promise<void>;
  banUser(userId: string, reason?: string, durationMinutes?: number): Promise<void>;
  closeRoom(roomId: string): Promise<void>;
  createRoom(name: string, type: 'public' | 'private', capacity?: number): Promise<void>;
  getStats(): Promise<AdminStats>;
  joinStealth(roomId: string): Promise<string>; // Returns LiveKit token
}

// Storage service interface
export interface IStorageService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

// Audio service interface
export interface IAudioService {
  playSound(sound: 'join' | 'leave' | 'mute' | 'unmute'): void;
  setEnabled(enabled: boolean): void;
}
