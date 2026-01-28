import { useEffect, useCallback, useRef } from 'react';
import { getWebSocketService } from '@/infrastructure/websocket/WebSocketService';
import { useRoomStore } from '@/application/stores/roomStore';
import { getToneGenerator } from '@/infrastructure/audio/toneGenerator';
import type { WebSocketMessage, JoinRoomResponse } from '@/domain/types';

export function useWebSocket() {
  const wsService = useRef(getWebSocketService());
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
      if (isMounted) {
        handleMessage(message);
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

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      const { type, payload } = message;

      switch (type) {
        case 'connected':
          // Server sends snake_case; normalize to client shape
          setUserId((payload as any)?.user_id);
          break;

        case 'room_joined':
          // Normalize snake_case payload to client JoinRoomResponse type
          (() => {
            const p = payload as any;
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
          // Volume is set lower for ambient background music
          console.log('🎵 Starting background audio (Dagored - Quiet Fields)');
          toneGen.start(440, undefined, 0.2).then(() => {
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

        case 'error':
          const errorPayload = payload as { message: string };
          setError(errorPayload.message);
          break;
      }
    },
    [joinRoom, leaveRoom, setAvailableRooms, addParticipant, removeParticipant, updateParticipant, setError, setUserId]
  );

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
