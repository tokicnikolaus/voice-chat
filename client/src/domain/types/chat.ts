// Chat message types
export type ChatMessageType =
  | 'chat_message'
  | 'system_message'
  | 'typing_start'
  | 'typing_stop'
  | 'reaction_add'
  | 'reaction_remove'
  | 'history_request'
  | 'history_response';

// Base data message structure
export interface DataMessage {
  type: ChatMessageType;
  payload: unknown;
  senderId: string;
  senderName: string;
  timestamp: number;
}

// Chat message
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  reactions: MessageReaction[];
}

// System message (join/leave)
export interface SystemMessage {
  id: string;
  type: 'user_joined' | 'user_left';
  userId: string;
  userName: string;
  timestamp: number;
}

// Union type for all displayable messages
export type DisplayMessage =
  | { kind: 'chat'; message: ChatMessage }
  | { kind: 'system'; message: SystemMessage };

// Reaction on a message
export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

// Typing indicator
export interface TypingUser {
  id: string;
  name: string;
  startedAt: number;
}

// Data payloads for different message types
export interface ChatMessagePayload {
  messageId: string;
  content: string;
}

export interface SystemMessagePayload {
  messageId: string;
  eventType: 'user_joined' | 'user_left';
  userId: string;
  userName: string;
}

export interface ReactionPayload {
  messageId: string;
  emoji: string;
}

export interface HistoryRequestPayload {
  requesterId: string;
}

export interface HistoryResponsePayload {
  messages: DisplayMessage[];
}

// Available reaction emojis
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
