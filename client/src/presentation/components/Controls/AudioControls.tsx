import { useSettingsStore } from '@/application/stores/settingsStore';

interface AudioControlsProps {
  isPTTActive: boolean;
}

export function AudioControls({ isPTTActive }: AudioControlsProps) {
  const { pttKey } = useSettingsStore();

  const formatKeyName = (key: string) => {
    if (key === 'Space') return 'SPACE';
    return key.replace('Key', '').replace('Digit', '');
  };

  return (
    <div className="audio-controls">
      <div className={`ptt-indicator ${isPTTActive ? 'active' : ''}`}>
        <span className="ptt-mic-icon">{isPTTActive ? '🎤' : '🔇'}</span>
        <span className="ptt-key">{formatKeyName(pttKey)}</span>
        <span className="ptt-label">
          {isPTTActive ? 'Transmitting...' : 'Hold to talk'}
        </span>
      </div>

      <style>{`
        .audio-controls {
          display: flex;
          align-items: center;
        }

        .ptt-indicator {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius);
          transition: all 0.15s ease;
        }

        .ptt-indicator.active {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.15);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }

        .ptt-key {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 50px;
          height: 32px;
          padding: 0 8px;
          background: var(--bg-hover);
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.5px;
        }

        .ptt-indicator.active .ptt-key {
          background: #10b981;
          color: white;
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
          color: #10b981;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
