import { useRoomStore } from '@/application/stores/roomStore';
import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from '@/application/hooks/useWebSocket';
import { useVoiceRoom } from '@/application/hooks/useVoiceRoom';
import { useChat } from '@/application/hooks/useChat';
import { ParticipantGrid } from './ParticipantGrid';
import { DeviceSelector } from '@/presentation/components/Controls/DeviceSelector';
import { ChatPanel } from '@/presentation/components/Chat';
import { getToneGenerator } from '@/infrastructure/audio/toneGenerator';
import { getVoiceService } from '@/infrastructure/livekit/VoiceService';
import { AloneIndicator } from './AloneIndicator';
import { MicrophoneLevel } from './MicrophoneLevel';
import { LiveKitStatus } from './LiveKitStatus';

export function VoiceRoom() {
  const { currentRoom, participants } = useRoomStore();
  const { requestLeaveRoom } = useWebSocket();
  const { toggleMute } = useVoiceRoom();
  const { isPanelOpen, unreadCount, togglePanel } = useChat();
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  // Back to Lobby: leave current room and return to lobby
  const handleBackToLobby = useCallback(async () => {
    const toneGen = getToneGenerator();
    if (toneGen.getIsPlaying()) {
      toneGen.stop();
    }
    await getVoiceService().disconnect().catch(console.error);
    requestLeaveRoom();
    // After leaving, the App will show Lobby which will auto-join
  }, [requestLeaveRoom]);

  // Unlock AudioContext on room join (required for background music to work later)
  // This happens automatically when user joins room (which requires clicking)
  useEffect(() => {
    if (!currentRoom) return;

    let unlocked = false;

    const unlockAudio = async () => {
      if (unlocked) return;
      unlocked = true;

      const toneGen = getToneGenerator();
      try {
        // Just unlock the AudioContext without playing any audio
        await toneGen.unlock();
      } catch (err: any) {
        console.warn('⚠️ AudioContext unlock failed:', err.message || err);
        unlocked = false; // Allow retry
      }
    };

    // Unlock immediately when room is joined (user already clicked to join)
    unlockAudio();

    // Also listen for any click as fallback
    const handleClick = () => {
      if (!unlocked) {
        console.log('👆 User interaction detected, unlocking AudioContext...');
        unlockAudio();
      }
    };

    document.addEventListener('click', handleClick, { once: true });

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [currentRoom]);

  if (!currentRoom) return null;

  return (
    <div className={`voice-room ${isPanelOpen ? 'with-chat' : ''}`}>
      <div className="room-main">
        <header className="room-header">
          <div className="room-info">
            <h1 className="room-name">{currentRoom.name}</h1>
            <span className="participant-count">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="header-actions">
            <button
              className="header-icon-btn"
              onClick={() => setShowDeviceSelector(!showDeviceSelector)}
              title="Audio devices"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            </button>
            <button
              className={`header-icon-btn ${isPanelOpen ? 'active' : ''}`}
              onClick={togglePanel}
              title={isPanelOpen ? 'Close chat' : 'Open chat'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {unreadCount > 0 && (
                <span className="unread-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button className="btn btn-secondary back-btn" onClick={handleBackToLobby}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Lobby
            </button>
          </div>
        </header>

        <main className="room-content">
          <AloneIndicator isAlone={participants.length === 1} />
          <ParticipantGrid participants={participants} />
        </main>

        <footer className="room-footer">
          <div className="footer-content">
            <LiveKitStatus onToggleMute={toggleMute} />
            <MicrophoneLevel />
          </div>
        </footer>
      </div>

      {isPanelOpen && <ChatPanel />}

      {showDeviceSelector && (
        <div className="device-selector-overlay" onClick={() => setShowDeviceSelector(false)}>
          <div className="device-selector-container" onClick={(e) => e.stopPropagation()}>
            <DeviceSelector onClose={() => setShowDeviceSelector(false)} />
          </div>
        </div>
      )}

      <style>{`
        .voice-room {
          width: 100%;
          max-width: 1200px;
          height: 100%;
          max-height: 100%;
          display: flex;
          flex-direction: row;
          overflow: hidden;
        }

        .voice-room.with-chat {
          max-width: 1580px;
        }

        .room-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--header-padding);
          height: var(--header-height);
          box-sizing: border-box;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
        }

        .voice-room.with-chat .room-header {
          border-radius: var(--border-radius-lg) 0 0 0;
        }

        .room-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .room-name {
          font-size: 20px;
          font-weight: 600;
        }

        .participant-count {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--border-radius);
          transition: all var(--transition-fast);
        }

        .header-icon-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .header-icon-btn.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }

        .unread-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: var(--error);
          color: white;
          font-size: 11px;
          font-weight: 600;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
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

        .room-content {
          flex: 1;
          padding: 24px;
          background: var(--bg-secondary);
          overflow-y: auto;
        }

        .room-footer {
          padding: 20px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
        }

        .voice-room.with-chat .room-footer {
          border-radius: 0 0 0 var(--border-radius-lg);
        }

        .footer-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}
