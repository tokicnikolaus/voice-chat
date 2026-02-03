import { useEffect, useCallback, useRef } from 'react';
import { getWebSocketService } from '@/infrastructure/websocket/WebSocketService';
import { useRoomStore } from '@/application/stores/roomStore';
import { useChatStore } from '@/application/stores/chatStore';
import { useSettingsStore } from '@/application/stores/settingsStore';
import { getToneGenerator } from '@/infrastructure/audio/toneGenerator';
import type { WebSocketMessage, JoinRoomResponse, ChatMessage, SystemMessage, DisplayMessage } from '@/domain/types';

// Track processed message IDs to prevent duplicate processing
const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 1000; // Limit to prevent memory leak

export function useWebSocket() {
  const wsService = useRef(getWebSocketService());
  const handleMessageRef = useRef<((message: WebSocketMessage) => void) | null>(null);
  const {
    setConnectionState,
    setUserId,
    setError,
    joinRoom,
    leaveRoom,
    setAvailableRooms,
    addParticipant,
    removeParticipant,
    updateParticipant,
  } = useRoomStore();

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      const { type, payload } = message;

      switch (type) {
        case 'connected':
          // Server sends snake_case; normalize to client shape
          setUserId((payload as any)?.user_id);
          break;

        case 'room_joined':
          // Reset chat store when joining a new room (before loading history)
          const roomPayload = payload as any;
          const newRoomId = roomPayload?.room_id;
          
          // Reset chat store first (clears messages, etc.)
          useChatStore.getState().reset();
          // Then set current room ID to validate incoming chat history and messages
          useChatStore.setState({ currentRoomId: newRoomId });
          // Clear processed message IDs to avoid skipping legitimate messages in new room
          processedMessageIds.clear();
          
          // Normalize snake_case payload to client JoinRoomResponse type
          (() => {
            const p = roomPayload;
            const normalized: JoinRoomResponse = {
              roomId: p?.room_id,
              roomName: p?.room_name,
              userId: p?.user_id,
              userName: p?.user_name,
              livekitToken: p?.livekit_token,
              livekitUrl: p?.livekit_url,
              participants: Array.isArray(p?.participants)
                ? p.participants.map((u: any) => ({
                    id: u?.id,
                    name: u?.name,
                    isMuted: !!u?.is_muted,
                    isAdmin: !!u?.is_admin,
                  }))
                : [],
              isNewRoom: !!p?.is_new_room,
            };
            joinRoom(normalized);
          })();
          break;

        case 'room_left':
          // Stop background music when leaving room
          const toneGenOnLeave = getToneGenerator();
          if (toneGenOnLeave.getIsPlaying()) {
            toneGenOnLeave.stop();
            console.log('🛑 Background audio stopped - left room');
          }
          // Clear room ID when leaving
          useChatStore.setState({ currentRoomId: null });
          leaveRoom();
          break;

        case 'room_list':
          // Normalize room summaries to client shape
          (() => {
            const rooms = (payload as any)?.rooms ?? [];
            const normalized = Array.isArray(rooms)
              ? rooms.map((r: any) => ({
                  id: r?.id,
                  name: r?.name,
                  type: r?.type,
                  participantCount: r?.participant_count,
                  capacity: r?.capacity,
                  isFull: !!r?.is_full,
                }))
              : [];
            setAvailableRooms(normalized);
          })();
          break;

        case 'user_joined':
          // Stop background audio when someone joins
          const toneGenOnJoin = getToneGenerator();
          if (toneGenOnJoin.getIsPlaying()) {
            toneGenOnJoin.stop();
            console.log('🛑 Background audio stopped - user joined');
          }
          // Normalize event payload
          const joinedUser = {
            userId: (payload as any)?.user_id,
            userName: (payload as any)?.user_name,
          };
          addParticipant({
            id: joinedUser.userId,
            name: joinedUser.userName,
            isMuted: false,
            isAdmin: false,
          });
          break;

        case 'user_left':
          removeParticipant((payload as any)?.user_id);
          break;

        case 'user_muted':
          updateParticipant((payload as any)?.user_id, {
            isMuted: !!(payload as any)?.is_muted,
          });
          break;

        case 'user_kicked':
          const kickPayload = payload as { reason?: string };
          setError(`You were kicked from the room${kickPayload.reason ? `: ${kickPayload.reason}` : ''}`);
          leaveRoom();
          break;

        case 'user_banned':
          // Server sends duration_minutes; normalize to duration in minutes
          const banPayload = {
            reason: (payload as any)?.reason,
            duration: (payload as any)?.duration_minutes,
          } as { reason?: string; duration: number };
          setError(
            `You were banned${banPayload.reason ? `: ${banPayload.reason}` : ''} for ${banPayload.duration} minutes`
          );
          leaveRoom();
          break;

        case 'room_closed':
          setError('The room has been closed');
          leaveRoom();
          break;

        case 'play_test_tone':
          // Server requests to play background audio when alone in room
          // This verifies WebSocket connection is working and provides ambient sound
          console.log('Received play_test_tone message from server', payload);
          const toneGen = getToneGenerator();
          // Play background audio (loops continuously)
          // Volume is set lower for ambient background music, and respects speaker volume
          const speakerVolume = useSettingsStore.getState().speakerVolume;
          const backgroundMusicVolume = 0.2 * (speakerVolume / 100);
          console.log('🎵 Starting background audio (Dagored - Quiet Fields)');
          toneGen.start(440, undefined, backgroundMusicVolume).then(() => {
            console.log('✅ Background audio started successfully');
          }).catch((err) => {
            console.warn('⚠️ Failed to start background audio (may need user interaction):', err.message || err);
          });
          break;

        case 'stop_test_tone':
          // Server requests to stop background audio when others join the room
          console.log('Received stop_test_tone message from server');
          const toneGenStop = getToneGenerator();
          toneGenStop.stop();
          console.log('🛑 Background audio stopped');
          break;

        case 'chat_message':
          // Handle incoming chat message from server
          // Note: Server already filters messages by room, so we can trust received messages
          (() => {
            const msg = (payload as any)?.message;
            if (!msg || !msg.id) return;

            const messageId = msg.id;
            
            // Check if we've already processed this message ID
            if (processedMessageIds.has(messageId)) {
              console.log('Skipping duplicate message (already processed):', messageId);
              return;
            }
            
            // Mark as processed
            processedMessageIds.add(messageId);
            
            // Clean up old IDs to prevent memory leak
            if (processedMessageIds.size > MAX_PROCESSED_IDS) {
              const idsArray = Array.from(processedMessageIds);
              const toRemove = idsArray.slice(0, idsArray.length - MAX_PROCESSED_IDS);
              toRemove.forEach((id) => processedMessageIds.delete(id));
            }

            // Get current state to check for duplicates in store (double-check)
            const currentState = useChatStore.getState();
            const alreadyInStore = currentState.messages.some((m) => {
              const id = m.kind === 'chat' ? m.message.id : m.message.id;
              return id === messageId;
            });
            
            if (alreadyInStore) {
              console.log('Skipping duplicate message (already in store):', messageId);
              return;
            }

            const { addChatMessage, addSystemMessage } = useChatStore.getState();

            if (msg.type === 'chat') {
              // Convert server format to client format
              const chatMessage: ChatMessage = {
                id: msg.id,
                senderId: msg.sender_id,
                senderName: msg.sender_name,
                content: msg.content,
                timestamp: msg.timestamp,
                reactions: Object.entries(msg.reactions || {}).map(([emoji, userIds]) => ({
                  emoji,
                  userIds: userIds as string[],
                })),
              };
              addChatMessage(chatMessage);
            } else if (msg.type === 'system') {
              // System message (join/leave)
              const content = msg.content || '';
              let eventType: 'user_joined' | 'user_left' = 'user_joined';
              if (content.includes('left')) {
                eventType = 'user_left';
              }

              const systemMessage: SystemMessage = {
                id: msg.id,
                type: eventType,
                userId: msg.sender_id,
                userName: msg.sender_name,
                timestamp: msg.timestamp,
              };
              addSystemMessage(systemMessage);
            }
          })();
          break;

        case 'chat_history':
          // Handle chat history from server
          (() => {
            const chatStore = useChatStore.getState();
            
            // Validate that we have a currentRoomId set (means we just joined a room)
            // This prevents loading history from a previous room if message arrives late
            if (!chatStore.currentRoomId) {
              console.log('Skipping chat_history - no current room ID set');
              return;
            }
            
            const { loadHistory } = chatStore;
            const messages = (payload as any)?.messages || [];
            const displayMessages: DisplayMessage[] = messages.map((msg: any) => {
              if (msg.type === 'chat') {
                const chatMessage: ChatMessage = {
                  id: msg.id,
                  senderId: msg.sender_id,
                  senderName: msg.sender_name,
                  content: msg.content,
                  timestamp: msg.timestamp,
                  reactions: Object.entries(msg.reactions || {}).map(([emoji, userIds]) => ({
                    emoji,
                    userIds: userIds as string[],
                  })),
                };
                return { kind: 'chat' as const, message: chatMessage };
              } else {
                const content = msg.content || '';
                let eventType: 'user_joined' | 'user_left' = 'user_joined';
                if (content.includes('left')) {
                  eventType = 'user_left';
                }
                const systemMessage: SystemMessage = {
                  id: msg.id,
                  type: eventType,
                  userId: msg.sender_id,
                  userName: msg.sender_name,
                  timestamp: msg.timestamp,
                };
                return { kind: 'system' as const, message: systemMessage };
              }
            });
            loadHistory(displayMessages);
          })();
          break;

        case 'chat_reaction':
          // Handle reaction update from server
          (() => {
            const reactionPayload = payload as any;
            const { message_id, emoji, user_ids } = reactionPayload;

            // Update the message with the new reaction state from server
            useChatStore.setState((state) => ({
              messages: state.messages.map((m) => {
                if (m.kind === 'chat' && m.message.id === message_id) {
                  // Update reactions: replace the emoji's user list with server's version
                  const otherReactions = m.message.reactions.filter((r) => r.emoji !== emoji);
                  const newReactions =
                    user_ids && user_ids.length > 0
                      ? [...otherReactions, { emoji, userIds: user_ids }]
                      : otherReactions;

                  return {
                    kind: 'chat' as const,
                    message: { ...m.message, reactions: newReactions },
                  };
                }
                return m;
              }),
            }));
          })();
          break;

        case 'error':
          const errorPayload = payload as { message: string };
          setError(errorPayload.message);
          break;
      }
    },
    [joinRoom, leaveRoom, setAvailableRooms, addParticipant, removeParticipant, updateParticipant, setError, setUserId]
  );

  // Store handler in ref so useEffect can access it without dependency
  handleMessageRef.current = handleMessage;

  useEffect(() => {
    const ws = wsService.current;
    let isMounted = true;

    // Connect on mount
    ws.connect().catch((error) => {
      if (isMounted) {
        console.error('Failed to connect:', error);
        setError('Failed to connect to server');
      }
    });

    // Handle connection state changes
    const unsubConnection = ws.onConnectionChange((state) => {
      if (isMounted) {
        setConnectionState(state);
      }
    });

    // Handle messages
    const unsubMessage = ws.onMessage((message: WebSocketMessage) => {
      if (isMounted && handleMessageRef.current) {
        handleMessageRef.current(message);
      }
    });

    return () => {
      isMounted = false;
      unsubConnection();
      unsubMessage();
      // Don't disconnect here - let the singleton manage the connection
      // Disconnecting here would break other components using the same service
    };
  }, [setConnectionState, setError]);

  const send = useCallback(<T>(type: string, payload?: T) => {
    wsService.current.send(type, payload);
  }, []);

  const requestJoinRoom = useCallback(
    (roomName: string, userName: string, voiceMode: 'ptt' | 'vad') => {
      send('join_room', {
        room_name: roomName,
        user_name: userName,
        voice_mode: voiceMode,
      });
    },
    [send]
  );

  const requestLeaveRoom = useCallback(() => {
    // Stop background music before leaving
    const toneGen = getToneGenerator();
    if (toneGen.getIsPlaying()) {
      toneGen.stop();
      console.log('🛑 Background audio stopped - leaving room');
    }
    send('leave_room', {});
  }, [send]);

  const requestRooms = useCallback(() => {
    send('get_rooms', {});
  }, [send]);

  const requestRoomPreview = useCallback(
    (roomName: string) => {
      send('get_room', { room_name: roomName });
    },
    [send]
  );

  const sendMuteSelf = useCallback(
    (muted: boolean) => {
      send('mute_self', { muted });
    },
    [send]
  );

  return {
    send,
    requestJoinRoom,
    requestLeaveRoom,
    requestRooms,
    requestRoomPreview,
    sendMuteSelf,
  };
}
