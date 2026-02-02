// Voice modes
export type VoiceMode = 'ptt' | 'vad';

// Re-export chat types
export * from './chat';

// Room types
export type RoomType = 'public' | 'private';

// User/Participant
export interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isAdmin: boolean;
  isSpeaking?: boolean;
}

// Room
export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  participants: Participant[];
  canJoin: boolean;
  isClosed: boolean;
}

// Room summary for listing
export interface RoomSummary {
  id: string;
  name: string;
  type: RoomType;
  participantCount: number;
  capacity: number;
  isFull: boolean;
}

// Join room response
export interface JoinRoomResponse {
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  livekitToken: string;
  livekitUrl: string;
  participants: Participant[];
  isNewRoom: boolean;
}

// User settings
export interface UserSettings {
  voiceMode: VoiceMode;
  pttKey: string;
  masterVolume: number;
  userVolumes: Record<string, number>;
  soundEffectsEnabled: boolean;
}

// Connection state
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

// WebSocket message types
export type MessageType =
  | 'connected'
  | 'ping'
  | 'pong'
  | 'play_test_tone'
  | 'stop_test_tone'
  | 'join_room'
  | 'room_joined'
  | 'leave_room'
  | 'room_left'
  | 'get_rooms'
  | 'room_list'
  | 'get_room'
  | 'room_info'
  | 'user_joined'
  | 'user_left'
  | 'user_muted'
  | 'mute_self'
  | 'error'
  | 'admin_auth'
  | 'admin_auth_result'
  | 'admin_mute_user'
  | 'admin_kick_user'
  | 'admin_ban_user'
  | 'admin_close_room'
  | 'admin_create_room'
  | 'admin_get_stats'
  | 'admin_stats'
  | 'admin_join_stealth'
  | 'livekit_token'
  | 'user_kicked'
  | 'user_banned'
  | 'room_closed'
  | 'chat_message'
  | 'chat_history'
  | 'chat_reaction';

// WebSocket message
export interface WebSocketMessage<T = unknown> {
  type: MessageType;
  payload?: T;
  timestamp: string;
}

// Error response
export interface ErrorResponse {
  code: string;
  message: string;
}

// Admin stats
export interface AdminStats {
  activeRooms: number;
  totalUsers: number;
  peakUsersToday: number;
  totalJoinsToday: number;
  rooms: RoomStats[];
  recentActivity: ActivityLog[];
  activeBans: number;
}

export interface RoomStats {
  id: string;
  name: string;
  participants: number;
  capacity: number;
  isPublic: boolean;
  isClosed: boolean;
}

export interface ActivityLog {
  type: string;
  userName: string;
  roomName: string;
  details?: Record<string, unknown>;
  timestamp: string;
}
