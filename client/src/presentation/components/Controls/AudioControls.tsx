import { useState } from 'react';
import type { VoiceMode } from '@/domain/types';
import { useSettingsStore } from '@/application/stores/settingsStore';
import { DeviceSelector } from './DeviceSelector';

interface AudioControlsProps {
  isMuted: boolean;
  isPTTActive: boolean;
  isPTTEnabled: boolean;
  onToggleMute: () => void;
  voiceMode: VoiceMode;
}

export function AudioControls({
  isMuted,
  isPTTActive,
  isPTTEnabled,
  onToggleMute,
  voiceMode,
}: AudioControlsProps) {
  const { pttKey } = useSettingsStore();
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  const formatKeyName = (key: string) => {
    return key.replace('Key', '').replace('Digit', '');
  };

  return (
    <div className="audio-controls">
      <div className="controls-left">
        {isPTTEnabled ? (
          <div className={`ptt-indicator ${isPTTActive ? 'active' : ''}`}>
            <span className="ptt-mic-icon">{isPTTActive ? '🎤' : '🔇'}</span>
            <span className="ptt-key">{formatKeyName(pttKey)}</span>
            <span className="ptt-label">
              {isPTTActive ? 'Transmitting...' : 'Push to Talk'}
            </span>
          </div>
        ) : (
          <button
            className={`mute-btn ${isMuted ? 'muted' : ''}`}
            onClick={onToggleMute}
          >
            <span className="mute-icon">{isMuted ? '🔇' : '🎤'}</span>
            <span className="mute-label">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        )}
      </div>

      <div className="controls-center">
        <span className="voice-mode-badge">
          {voiceMode === 'ptt' ? '🎤 Push to Talk' : '🔊 Voice Activity'}
        </span>
      </div>

      <div className="controls-right">
        <button
          className="device-btn"
          onClick={() => {
            console.log('Device selector button clicked');
            setShowDeviceSelector(!showDeviceSelector);
          }}
          title="Select microphone and speaker"
        >
          🎧 Devices
        </button>
      </div>

      {showDeviceSelector && (
        <div className="device-selector-overlay" onClick={() => setShowDeviceSelector(false)}>
          <div className="device-selector-container" onClick={(e) => e.stopPropagation()}>
            <DeviceSelector onClose={() => setShowDeviceSelector(false)} />
          </div>
        </div>
      )}

      <style>{`
        .audio-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .controls-left,
        .controls-right {
          flex: 1;
        }

        .controls-right {
          display: flex;
          justify-content: flex-end;
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

        .device-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius);
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
          transition: all var(--transition-fast);
        }

        .device-btn:hover {
          border-color: var(--accent-primary);
          background: var(--bg-hover);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.2);
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
      `}</style>
    </div>
  );
}
