import { useSettingsStore } from '@/application/stores/settingsStore';

interface AudioControlsProps {
  isMuted: boolean;
  isPTTActive: boolean;
  /** True when muted — show "Hold Space to talk" hint */
  showSpaceToTalkHint: boolean;
  onToggleMute: () => void;
}

export function AudioControls({
  isMuted,
  isPTTActive,
  showSpaceToTalkHint,
  onToggleMute,
}: AudioControlsProps) {
  const { pttKey } = useSettingsStore();

  const formatKeyName = (key: string) => {
    return key.replace('Key', '').replace('Digit', '');
  };

  return (
    <div className="audio-controls">
      <div className="controls-left">
        <button
          className={`mute-btn ${isMuted ? 'muted' : ''}`}
          onClick={onToggleMute}
        >
          <span className="mute-icon">{isMuted ? '🔇' : '🎤'}</span>
          <span className="mute-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
        {showSpaceToTalkHint && (
          <div className={`ptt-indicator ${isPTTActive ? 'active' : ''}`}>
            <span className="ptt-mic-icon">{isPTTActive ? '🎤' : '🔇'}</span>
            <span className="ptt-key">{formatKeyName(pttKey)}</span>
            <span className="ptt-label">
              {isPTTActive ? 'Transmitting...' : 'Hold to talk'}
            </span>
          </div>
        )}
      </div>

      <div className="controls-center">
        <span className="voice-mode-badge">Open mic</span>
      </div>

      <style>{`
        .audio-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .controls-left {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .controls-center {
          flex: 0 0 auto;
        }

        .ptt-indicator {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius);
          transition: all var(--transition-fast);
        }

        .ptt-indicator.active {
          border-color: var(--accent-primary);
          background: rgba(124, 58, 237, 0.2);
          box-shadow: var(--shadow-glow);
        }

        .ptt-key {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--bg-hover);
          border-radius: 6px;
          font-weight: 700;
          font-size: 14px;
        }

        .ptt-indicator.active .ptt-key {
          background: var(--accent-primary);
        }

        .ptt-mic-icon {
          font-size: 20px;
          transition: transform 0.1s ease;
        }

        .ptt-indicator.active .ptt-mic-icon {
          transform: scale(1.2);
        }

        .ptt-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .ptt-indicator.active .ptt-label {
          color: var(--text-primary);
        }

        .mute-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .mute-btn:hover {
          border-color: var(--accent-primary);
        }

        .mute-btn.muted {
          border-color: var(--error);
          background: rgba(239, 68, 68, 0.1);
        }

        .mute-icon {
          font-size: 20px;
        }

        .mute-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .voice-mode-badge {
          font-size: 12px;
          color: var(--text-muted);
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border-radius: var(--border-radius);
        }
      `}</style>
    </div>
  );
}
