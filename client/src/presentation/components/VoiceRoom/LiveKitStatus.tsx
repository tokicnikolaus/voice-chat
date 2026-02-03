import { useEffect, useState } from 'react';
import { getVoiceService } from '@/infrastructure/livekit/VoiceService';
import { useRoomStore } from '@/application/stores/roomStore';
import { useVoiceRoom } from '@/application/hooks/useVoiceRoom';

interface LiveKitStatusProps {
  onToggleMute?: () => void;
}

export function LiveKitStatus({ onToggleMute }: LiveKitStatusProps) {
  const { currentRoom, isMuted } = useRoomStore();
  const { speakerVolume, setSpeakerVolume, microphoneSensitivity, setMicrophoneSensitivity } = useVoiceRoom();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!currentRoom) {
      setIsConnected(false);
      return;
    }

    const voiceService = getVoiceService();
    
    // Subscribe to connection state changes for immediate updates
    const unsubscribe = (voiceService as any).onConnectionStateChange?.((connected: boolean) => {
      setIsConnected(connected);
    });

    // Also check current state immediately
    setIsConnected((voiceService as any).isConnected?.() ?? false);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
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
        <>
          <div
            className={`mic-status ${onToggleMute ? 'clickable' : ''} ${isMicEnabled ? '' : 'muted'}`}
            onClick={onToggleMute}
            role={onToggleMute ? 'button' : undefined}
            tabIndex={onToggleMute ? 0 : undefined}
            onKeyDown={onToggleMute ? (e) => e.key === 'Enter' && onToggleMute() : undefined}
          >
            <span className="mic-icon">{isMicEnabled ? '🎤' : '🔇'}</span>
            <span className="mic-text">{isMicEnabled ? 'Mic Active' : 'Mic Muted'}</span>
          </div>
          <div className="mic-sensitivity-control">
            <span className="mic-sensitivity-icon">🎤</span>
            <input
              type="range"
              min="0"
              max="200"
              value={microphoneSensitivity}
              onChange={(e) => setMicrophoneSensitivity(Number(e.target.value))}
              className="mic-sensitivity-slider"
              title={`Microphone sensitivity: ${microphoneSensitivity}%`}
            />
            <span className="mic-sensitivity-text">{microphoneSensitivity}%</span>
          </div>
          <div className="speaker-control">
            <span className="speaker-icon">{speakerVolume === 0 ? '🔇' : '🔊'}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={speakerVolume}
              onChange={(e) => setSpeakerVolume(Number(e.target.value))}
              className="speaker-slider"
              title={`Speaker volume: ${speakerVolume}%`}
            />
            <span className="speaker-volume-text">{speakerVolume}%</span>
          </div>
        </>
      )}
      <style>{`
        .livekit-status {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 40px;
          padding: 0 14px;
          background: var(--bg-tertiary);
          border-radius: var(--border-radius-lg);
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
          gap: 6px;
          color: var(--text-secondary);
          padding: 4px 8px;
          margin-left: 4px;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .mic-status.clickable {
          cursor: pointer;
        }

        .mic-status.clickable:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .mic-status.muted {
          color: var(--error);
        }

        .mic-status.clickable.muted:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .mic-icon {
          font-size: 14px;
        }

        .speaker-control {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 4px;
        }

        .speaker-icon {
          font-size: 14px;
          flex-shrink: 0;
        }

        .speaker-slider {
          width: 80px;
          height: 4px;
          border-radius: 2px;
          background: var(--bg-hover);
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }

        .speaker-slider:focus,
        .speaker-slider:active {
          outline: none;
          background: var(--bg-hover);
        }

        .speaker-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent-primary);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .speaker-slider::-webkit-slider-thumb:hover {
          background: var(--accent-hover);
        }

        .speaker-slider::-webkit-slider-thumb:focus,
        .speaker-slider::-webkit-slider-thumb:active {
          background: var(--accent-primary);
          outline: none;
        }

        .speaker-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent-primary);
          cursor: pointer;
          border: none;
          transition: background 0.15s ease;
        }

        .speaker-slider::-moz-range-thumb:hover {
          background: var(--accent-hover);
        }

        .speaker-slider::-moz-range-thumb:focus,
        .speaker-slider::-moz-range-thumb:active {
          background: var(--accent-primary);
          outline: none;
        }

        .speaker-slider::-moz-range-track {
          background: var(--bg-hover);
        }

        .speaker-volume-text {
          font-size: 11px;
          color: var(--text-muted);
          min-width: 35px;
          text-align: right;
        }

        .mic-sensitivity-control {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 4px;
        }

        .mic-sensitivity-icon {
          font-size: 14px;
          flex-shrink: 0;
        }

        .mic-sensitivity-slider {
          width: 80px;
          height: 4px;
          border-radius: 2px;
          background: var(--bg-hover);
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }

        .mic-sensitivity-slider:focus,
        .mic-sensitivity-slider:active {
          outline: none;
          background: var(--bg-hover);
        }

        .mic-sensitivity-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent-primary);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .mic-sensitivity-slider::-webkit-slider-thumb:hover {
          background: var(--accent-hover);
        }

        .mic-sensitivity-slider::-webkit-slider-thumb:focus,
        .mic-sensitivity-slider::-webkit-slider-thumb:active {
          background: var(--accent-primary);
          outline: none;
        }

        .mic-sensitivity-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent-primary);
          cursor: pointer;
          border: none;
          transition: background 0.15s ease;
        }

        .mic-sensitivity-slider::-moz-range-thumb:hover {
          background: var(--accent-hover);
        }

        .mic-sensitivity-slider::-moz-range-thumb:focus,
        .mic-sensitivity-slider::-moz-range-thumb:active {
          background: var(--accent-primary);
          outline: none;
        }

        .mic-sensitivity-slider::-moz-range-track {
          background: var(--bg-hover);
        }

        .mic-sensitivity-text {
          font-size: 11px;
          color: var(--text-muted);
          min-width: 40px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
