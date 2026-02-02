import { useEffect, useRef, useCallback } from 'react';
import { getWebSocketService } from '@/infrastructure/websocket/WebSocketService';
import { useChatStore } from '@/application/stores/chatStore';
import { useRoomStore } from '@/application/stores/roomStore';

type TimeoutId = ReturnType<typeof setTimeout>;

export function useChat() {
  const wsService = useRef(getWebSocketService());
  const { currentRoom, userId } = useRoomStore();
  const {
    messages,
    typingUsers,
    historyLoaded,
    isPanelOpen,
    unreadCount,
    addReaction,
    removeReaction,
    openPanel,
    closePanel,
    togglePanel,
    reset,
  } = useChatStore();

  // Refs for typing indicator management (kept for cleanup)
  const typingTimeoutRef = useRef<TimeoutId | null>(null);
  const isTypingRef = useRef(false);

  // Refs for typing indicator cleanup timers
  const typingCleanupTimers = useRef<Map<string, TimeoutId>>(new Map());

  // Reset chat state when leaving room
  useEffect(() => {
    if (!currentRoom) {
      reset();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Clear all typing cleanup timers
      typingCleanupTimers.current.forEach((timer) => clearTimeout(timer));
      typingCleanupTimers.current.clear();
    }
  }, [currentRoom, reset]);

  // Note: System messages (join/leave) are now handled by the server and received via WebSocket
  // in useWebSocket hook, so we don't need to track participants here anymore

  // Send a chat message via WebSocket
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      // Stop typing indicator
      if (isTypingRef.current) {
        isTypingRef.current = false;
        // Note: Typing indicators could be sent via WebSocket if needed
        // For now, we'll skip typing indicators since they're not critical
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Send via WebSocket - server will broadcast and send back confirmation
      wsService.current.send('chat_message', {
        content: content.trim(),
      });
    },
    []
  );

  // System messages are now handled by the server via WebSocket
  // This function is kept for compatibility but does nothing
  const sendSystemMessage = useCallback(
    async (_eventType: 'user_joined' | 'user_left', _user: { id: string; name: string }) => {
      // No-op: server handles system messages
    },
    []
  );

  // Handle typing indicator
  // Note: Typing indicators could be implemented via WebSocket if needed
  // For now, we'll keep the function for compatibility but it's a no-op
  const onTyping = useCallback(() => {
    // Typing indicators not implemented via WebSocket yet
    // Could be added later if needed
  }, []);

  // Toggle reaction on a message via WebSocket
  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!userId) return;

      // Check if we already reacted
      const currentMessages = useChatStore.getState().messages;
      const message = currentMessages.find(
        (m) => m.kind === 'chat' && m.message.id === messageId
      );
      if (!message || message.kind !== 'chat') return;

      const existingReaction = message.message.reactions.find((r) => r.emoji === emoji);
      const hasReacted = existingReaction?.userIds.includes(userId);

      // Optimistically update UI
      if (hasReacted) {
        removeReaction(messageId, emoji, userId);
        wsService.current.send('chat_reaction_remove', { message_id: messageId, emoji });
      } else {
        addReaction(messageId, emoji, userId);
        wsService.current.send('chat_reaction_add', { message_id: messageId, emoji });
      }
    },
    [userId, addReaction, removeReaction]
  );

  // Get list of typing user names (excluding self)
  const typingUserNames = Array.from(typingUsers.values())
    .filter((u) => u.id !== userId)
    .map((u) => u.name);

  return {
    // State
    messages,
    typingUserNames,
    historyLoaded,
    isPanelOpen,
    unreadCount,

    // Actions
    sendMessage,
    sendSystemMessage,
    onTyping,
    toggleReaction,
    openPanel,
    closePanel,
    togglePanel,
  };
}
