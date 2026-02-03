import { useEffect, useState, useCallback, useRef } from 'react';
import { useRoomStore } from '@/application/stores/roomStore';
import { useAuthStore } from '@/application/stores/authStore';
import { useWebSocket } from '@/application/hooks/useWebSocket';
import { useVoiceRoom } from '@/application/hooks/useVoiceRoom';
import { usePushToTalk } from '@/application/hooks/usePushToTalk';
import { useChat } from '@/application/hooks/useChat';
import { LobbyHeader } from './LobbyHeader';
import { RoomsSidebar } from './RoomsSidebar';
import { CreateRoomModal } from './CreateRoomModal';
import { ParticipantGrid } from '@/presentation/components/VoiceRoom/ParticipantGrid';
import { AudioControls } from '@/presentation/components/Controls/AudioControls';
import { DeviceSelector } from '@/presentation/components/Controls/DeviceSelector';
import { ChatPanel } from '@/presentation/components/Chat';
import { MicrophoneLevel } from '@/presentation/components/VoiceRoom/MicrophoneLevel';
import { LiveKitStatus } from '@/presentation/components/VoiceRoom/LiveKitStatus';
import { getVoiceService } from '@/infrastructure/livekit/VoiceService';
import { getToneGenerator } from '@/infrastructure/audio/toneGenerator';

export function Lobby() {
  const { user } = useAuthStore();
  const { currentRoom, participants, availableRooms, connectionState } = useRoomStore();
  const { requestJoinRoom, requestLeaveRoom, requestRooms } = useWebSocket();
  const { isMuted, toggleMute } = useVoiceRoom();
  const { isPTTActive, isEnabled: showSpaceToTalkHint } = usePushToTalk();
  const { isPanelOpen, unreadCount, togglePanel } = useChat();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [isRoomsPanelOpen, setIsRoomsPanelOpen] = useState(false);

  // Toggle rooms panel (closes chat if open)
  const handleToggleRooms = useCallback(() => {
    if (!isRoomsPanelOpen && isPanelOpen) {
      togglePanel(); // Close chat first
    }
    setIsRoomsPanelOpen(!isRoomsPanelOpen);
  }, [isRoomsPanelOpen, isPanelOpen, togglePanel]);

  // Toggle chat panel (closes rooms if open)
  const handleToggleChat = useCallback(() => {
    if (!isPanelOpen && isRoomsPanelOpen) {
      setIsRoomsPanelOpen(false); // Close rooms first
    }
    togglePanel();
  }, [isPanelOpen, isRoomsPanelOpen, togglePanel]);

  // Use ref for synchronous updates - prevents race condition with auto-join
  const isJoiningOtherRoomRef = useRef(false);

  // Get display name with fallback
  const displayName = user?.name || user?.username || 'Anonymous';

  // Auto-join Lobby room when connected (but not when switching to another room)
  useEffect(() => {
    if (connectionState === 'connected' && user && !currentRoom && !isJoiningOtherRoomRef.current) {
      requestJoinRoom('Lobby', displayName, 'vad');
    }
  }, [connectionState, user, currentRoom, displayName, requestJoinRoom]);

  // Reset the joining flag when we successfully join a non-Lobby room
  useEffect(() => {
    if (currentRoom && currentRoom.name !== 'Lobby') {
      isJoiningOtherRoomRef.current = false;
    }
  }, [currentRoom]);

  // Fetch rooms periodically
  useEffect(() => {
    if (connectionState === 'connected') {
      requestRooms();
      const interval = setInterval(requestRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [connectionState, requestRooms]);

  // Leave current room (Lobby) and join another room
  const handleJoinRoom = useCallback(async (roomName: string) => {
    if (!user) return;

    // Set flag SYNCHRONOUSLY to prevent auto-rejoin of Lobby
    isJoiningOtherRoomRef.current = true;

    // Stop any background audio
    const toneGen = getToneGenerator();
    if (toneGen.getIsPlaying()) {
      toneGen.stop();
    }

    // Disconnect from LiveKit voice first
    await getVoiceService().disconnect().catch(console.error);

    // Leave the current room (Lobby) and join the new room
    requestLeaveRoom();

    // Small delay to ensure leave is processed, then join new room
    setTimeout(() => {
      requestJoinRoom(roomName, user.name, 'vad');
    }, 100);
  }, [user, requestLeaveRoom, requestJoinRoom]);

  const handleCreateRoom = useCallback(async (roomName: string) => {
    if (!user) return;
    setShowCreateModal(false);

    // Set flag SYNCHRONOUSLY to prevent auto-rejoin of Lobby
    isJoiningOtherRoomRef.current = true;

    // Stop any background audio
    const toneGen = getToneGenerator();
    if (toneGen.getIsPlaying()) {
      toneGen.stop();
    }

    // Disconnect from LiveKit voice first
    await getVoiceService().disconnect().catch(console.error);

    // Leave the current room (Lobby) and join the new room
    requestLeaveRoom();

    // Small delay to ensure leave is processed, then join new room
    setTimeout(() => {
      requestJoinRoom(roomName, user.name, 'vad');
    }, 100);
  }, [user, requestLeaveRoom, requestJoinRoom]);

  // Show loading state while connecting to Lobby
  if (!currentRoom) {
    return (
      <div className="lobby-loading">
        <div className="spinner" />
        <p>Connecting to Lobby...</p>

        <style>{`
          .lobby-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 16px;
            color: var(--text-secondary);
          }

          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--border-color);
            border-top-color: var(--accent-primary);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Count rooms excluding Lobby
  const roomCount = availableRooms.filter(r => r.name !== 'Lobby').length;

  return (
    <div className={`lobby ${isPanelOpen ? 'with-chat' : ''} ${isRoomsPanelOpen ? 'with-rooms' : ''}`}>
      <div className="lobby-main">
        <LobbyHeader
          participantCount={participants.length}
          onToggleChat={handleToggleChat}
          isChatOpen={isPanelOpen}
          unreadCount={unreadCount}
          onToggleRooms={handleToggleRooms}
          isRoomsOpen={isRoomsPanelOpen}
          roomCount={roomCount}
          onOpenDeviceSelector={() => setShowDeviceSelector(true)}
        />

        <main className="lobby-content">
          <section className="players-section">
            <h2>Online in Lobby</h2>
            <div className="players-container">
              <ParticipantGrid participants={participants} />
            </div>
          </section>
        </main>

        <footer className="lobby-footer">
          <div className="footer-content">
            <div className="footer-left">
              <LiveKitStatus />
              <MicrophoneLevel />
            </div>
            <AudioControls
              isMuted={isMuted}
              isPTTActive={isPTTActive}
              showSpaceToTalkHint={showSpaceToTalkHint}
              onToggleMute={toggleMute}
            />
          </div>
        </footer>
      </div>

      {isRoomsPanelOpen && (
        <RoomsSidebar
          rooms={availableRooms}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={() => setShowCreateModal(true)}
          onClose={() => setIsRoomsPanelOpen(false)}
        />
      )}

      {isPanelOpen && <ChatPanel />}

      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRoom}
        />
      )}

      {showDeviceSelector && (
        <div className="device-selector-overlay" onClick={() => setShowDeviceSelector(false)}>
          <div className="device-selector-container" onClick={(e) => e.stopPropagation()}>
            <DeviceSelector onClose={() => setShowDeviceSelector(false)} />
          </div>
        </div>
      )}

      <style>{`
        .lobby {
          width: 100%;
          max-width: 900px;
          height: 100%;
          max-height: 100%;
          display: flex;
          flex-direction: row;
          overflow: hidden;
        }

        .lobby.with-chat,
        .lobby.with-rooms {
          max-width: 1280px;
        }

        .lobby-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .lobby.with-chat .lobby-main header,
        .lobby.with-rooms .lobby-main header {
          border-radius: var(--border-radius-lg) 0 0 0;
        }

        .lobby-content {
          flex: 1;
          padding: 24px;
          background: var(--bg-secondary);
          overflow-y: auto;
        }

        .players-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }

        .players-section h2 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0;
        }

        .players-container {
          flex: 1;
          overflow-y: auto;
        }

        .lobby-footer {
          padding: 20px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
        }

        .lobby.with-chat .lobby-footer,
        .lobby.with-rooms .lobby-footer {
          border-radius: 0 0 0 var(--border-radius-lg);
        }

        .footer-content {
          display: flex;
          align-items: center;
          gap: 16px;
          justify-content: space-between;
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .device-selector-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .device-selector-container {
          position: relative;
        }

        @media (max-width: 900px) {
          .lobby-grid {
            grid-template-columns: 1fr;
          }

          .rooms-section {
            min-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
