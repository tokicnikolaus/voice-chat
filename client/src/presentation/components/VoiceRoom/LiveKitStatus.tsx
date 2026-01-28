import { useEffect, useState } from 'react';
import { getVoiceService } from '@/infrastructure/livekit/VoiceService';
import { useRoomStore } from '@/application/stores/roomStore';

export function LiveKitStatus() {
  const { currentRoom, isMuted } = useRoomStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!currentRoom) {
      setIsConnected(false);
      return;
    }

    const checkStatus = () => {
      const voiceService = getVoiceService();
      const room = (voiceService as any).room;
      setIsConnected(!!room && room.state === 'connected');
    };

    // Check immediately
    checkStatus();

    // Check periodically (only for connection status, not mic)
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [currentRoom]);

  if (!currentRoom) return null;

  // Use store's isMuted state for immediate feedback (inverted because isMuted=false means mic is active)
  const isMicEnabled = !isMuted;

  return (
    <div className="livekit-status">
      <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
        <span className="status-dot" />
        <span className="status-text">
          LiveKit: {isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>
      {isConnected && (
        <div className="mic-status">
          <span className="mic-icon">{isMicEnabled ? '🎤' : '🔇'}</span>
          <span className="mic-text">{isMicEnabled ? 'Mic Active' : 'Mic Muted'}</span>
        </div>
      )}
      <style>{`
        .livekit-status {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border-radius: var(--border-radius);
          font-size: 12px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--error);
          transition: background 0.2s;
        }

        .status-indicator.connected .status-dot {
          background: #10b981;
        }

        .status-text {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .mic-status {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-secondary);
        }

        .mic-icon {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
