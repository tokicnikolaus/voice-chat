import { create } from 'zustand';
import type {
  ChatMessage,
  SystemMessage,
  DisplayMessage,
  TypingUser,
  MessageReaction,
} from '@/domain/types';

const MAX_MESSAGES = 100;

export interface ChatState {
  // Current room ID (to validate incoming messages)
  currentRoomId: string | null;

  // Messages
  messages: DisplayMessage[];

  // Typing indicators
  typingUsers: Map<string, TypingUser>;

  // History sync
  historyLoaded: boolean;

  // UI state
  isPanelOpen: boolean;
  unreadCount: number;

  // Actions - Messages
  addChatMessage: (message: ChatMessage) => void;
  addSystemMessage: (message: SystemMessage) => void;
  loadHistory: (messages: DisplayMessage[]) => void;
  setHistoryLoaded: (loaded: boolean) => void;

  // Actions - Reactions
  addReaction: (messageId: string, emoji: string, userId: string) => void;
  removeReaction: (messageId: string, emoji: string, userId: string) => void;

  // Actions - Typing
  setUserTyping: (user: TypingUser) => void;
  clearUserTyping: (userId: string) => void;

  // Actions - UI
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  clearUnread: () => void;

  // Actions - Reset
  reset: () => void;
}

const initialState = {
  currentRoomId: null as string | null,
  messages: [] as DisplayMessage[],
  typingUsers: new Map<string, TypingUser>(),
  historyLoaded: false,
  isPanelOpen: true,
  unreadCount: 0,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  addChatMessage: (message) =>
    set((state) => {
      // Check if message already exists (deduplication)
      const exists = state.messages.some(
        (m) => m.kind === 'chat' && m.message.id === message.id
      );
      if (exists) {
        return state; // Don't add duplicate
      }

      const newMessages = [
        ...state.messages,
        { kind: 'chat' as const, message },
      ];
      // Limit to last MAX_MESSAGES
      const trimmedMessages = newMessages.slice(-MAX_MESSAGES);

      // Increment unread if panel is closed
      const unreadCount = state.isPanelOpen
        ? state.unreadCount
        : state.unreadCount + 1;

      return {
        messages: trimmedMessages,
        unreadCount,
      };
    }),

  addSystemMessage: (message) =>
    set((state) => {
      // Check if message already exists (deduplication)
      const exists = state.messages.some(
        (m) => m.kind === 'system' && m.message.id === message.id
      );
      if (exists) {
        return state; // Don't add duplicate
      }

      const newMessages = [
        ...state.messages,
        { kind: 'system' as const, message },
      ];
      const trimmedMessages = newMessages.slice(-MAX_MESSAGES);

      return {
        messages: trimmedMessages,
      };
    }),

  loadHistory: (messages) =>
    set((state) => {
      // Filter out messages that already exist (deduplication)
      const existingIds = new Set(
        state.messages.map((m) =>
          m.kind === 'chat' ? m.message.id : m.message.id
        )
      );
      const newHistoryMessages = messages.filter((m) => {
        const id = m.kind === 'chat' ? m.message.id : m.message.id;
        return !existingIds.has(id);
      });

      // Prepend new history messages, then trim to MAX_MESSAGES
      const allMessages = [...newHistoryMessages, ...state.messages];
      const trimmedMessages = allMessages.slice(-MAX_MESSAGES);

      return {
        messages: trimmedMessages,
        historyLoaded: true,
      };
    }),

  setHistoryLoaded: (loaded) => set({ historyLoaded: loaded }),

  addReaction: (messageId, emoji, userId) =>
    set((state) => {
      const messages = state.messages.map((dm) => {
        if (dm.kind !== 'chat' || dm.message.id !== messageId) {
          return dm;
        }

        const message = dm.message;
        const existingReaction = message.reactions.find((r) => r.emoji === emoji);

        let newReactions: MessageReaction[];
        if (existingReaction) {
          // Add user to existing reaction if not already there
          if (existingReaction.userIds.includes(userId)) {
            return dm; // Already reacted
          }
          newReactions = message.reactions.map((r) =>
            r.emoji === emoji
              ? { ...r, userIds: [...r.userIds, userId] }
              : r
          );
        } else {
          // Create new reaction
          newReactions = [...message.reactions, { emoji, userIds: [userId] }];
        }

        return {
          kind: 'chat' as const,
          message: { ...message, reactions: newReactions },
        };
      });

      return { messages };
    }),

  removeReaction: (messageId, emoji, userId) =>
    set((state) => {
      const messages = state.messages.map((dm) => {
        if (dm.kind !== 'chat' || dm.message.id !== messageId) {
          return dm;
        }

        const message = dm.message;
        const newReactions = message.reactions
          .map((r) => {
            if (r.emoji !== emoji) return r;
            return {
              ...r,
              userIds: r.userIds.filter((id) => id !== userId),
            };
          })
          .filter((r) => r.userIds.length > 0);

        return {
          kind: 'chat' as const,
          message: { ...message, reactions: newReactions },
        };
      });

      return { messages };
    }),

  setUserTyping: (user) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      newTypingUsers.set(user.id, user);
      return { typingUsers: newTypingUsers };
    }),

  clearUserTyping: (userId) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      newTypingUsers.delete(userId);
      return { typingUsers: newTypingUsers };
    }),

  openPanel: () => set({ isPanelOpen: true, unreadCount: 0 }),
  closePanel: () => set({ isPanelOpen: false }),
  togglePanel: () =>
    set((state) => ({
      isPanelOpen: !state.isPanelOpen,
      unreadCount: !state.isPanelOpen ? 0 : state.unreadCount,
    })),
  clearUnread: () => set({ unreadCount: 0 }),

  reset: () => set({
    ...initialState,
    currentRoomId: null,
    typingUsers: new Map<string, TypingUser>(),
  }),
}));
