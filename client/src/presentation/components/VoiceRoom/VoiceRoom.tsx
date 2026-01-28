import { useRoomStore } from '@/application/stores/roomStore';
import { useEffect } from 'react';
import { useWebSocket } from '@/application/hooks/useWebSocket';
import { useVoiceRoom } from '@/application/hooks/useVoiceRoom';
import { usePushToTalk } from '@/application/hooks/usePushToTalk';
import { ParticipantGrid } from './ParticipantGrid';
import { AudioControls } from '@/presentation/components/Controls/AudioControls';
import { getToneGenerator } from '@/infrastructure/audio/toneGenerator';
import { AloneIndicator } from './AloneIndicator';
import { MicrophoneLevel } from './MicrophoneLevel';
import { LiveKitStatus } from './LiveKitStatus';

export function VoiceRoom() {
  const { currentRoom, participants, voiceMode } = useRoomStore();
  const { requestLeaveRoom } = useWebSocket();
  const { isMuted, toggleMute } = useVoiceRoom();
  const { isPTTActive, isEnabled: isPTTEnabled } = usePushToTalk();

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
    <div className="voice-room">
      <header className="room-header">
        <div className="room-info">
          <h1 className="room-name">{currentRoom.name}</h1>
          <span className="participant-count">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button className="btn btn-secondary leave-btn" onClick={requestLeaveRoom}>
          Leave Room
        </button>
      </header>

      <main className="room-content">
        <AloneIndicator isAlone={participants.length === 1} />
        <ParticipantGrid participants={participants} />
      </main>

      <footer className="room-footer">
        <div className="footer-content">
          <div className="footer-left">
            <LiveKitStatus />
            <MicrophoneLevel />
          </div>
          <AudioControls
            isMuted={isMuted}
            isPTTActive={isPTTActive}
            isPTTEnabled={isPTTEnabled}
            onToggleMute={toggleMute}
            voiceMode={voiceMode}
          />
        </div>
      </footer>

      <style>{`
        .voice-room {
          width: 100%;
          max-width: 1200px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
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

        .leave-btn {
          color: var(--error);
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
      `}</style>
    </div>
  );
}
