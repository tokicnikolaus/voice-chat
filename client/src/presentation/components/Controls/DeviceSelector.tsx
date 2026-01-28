import { useEffect, useState } from 'react';
import { getVoiceService } from '@/infrastructure/livekit/VoiceService';
import { useSettingsStore } from '@/application/stores/settingsStore';
import type { AudioDevice } from '@/domain/interfaces';

interface DeviceSelectorProps {
  onClose?: () => void;
}

export function DeviceSelector({ onClose }: DeviceSelectorProps) {
  const { audioInputDeviceId, audioOutputDeviceId, setAudioInputDeviceId, setAudioOutputDeviceId } = useSettingsStore();
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const voiceService = getVoiceService();
      const deviceList = await voiceService.enumerateAudioDevices();
      setDevices(deviceList);
    } catch (err: any) {
      setError(err.message || 'Failed to load audio devices');
      console.error('Failed to enumerate devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputDeviceChange = async (deviceId: string) => {
    try {
      const voiceService = getVoiceService();
      
      // Check if connected to LiveKit room first
      if (!voiceService.isMicrophoneEnabled() && !(voiceService as any).room) {
        setError('Please wait for LiveKit connection or unmute your microphone first');
        console.warn('Cannot set device - LiveKit not connected yet');
        return;
      }
      
      await voiceService.setAudioInputDevice(deviceId);
      setAudioInputDeviceId(deviceId);
      setError(null); // Clear any previous errors
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error';
      setError(`Failed to set microphone: ${errorMsg}`);
      console.error('Failed to set input device:', err);
    }
  };

  const handleOutputDeviceChange = async (deviceId: string) => {
    try {
      const voiceService = getVoiceService();
      await voiceService.setAudioOutputDevice(deviceId);
      setAudioOutputDeviceId(deviceId);
    } catch (err: any) {
      setError(`Failed to set speaker: ${err.message}`);
      console.error('Failed to set output device:', err);
    }
  };

  const inputDevices = devices.filter((d) => d.kind === 'audioinput');
  const outputDevices = devices.filter((d) => d.kind === 'audiooutput');

  return (
    <div className="device-selector">
      <div className="device-selector-header">
        <h3>Audio Devices</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={loadDevices}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading devices...</div>
      ) : (
        <div className="device-selector-content">
          <div className="device-group">
            <label className="device-label">
              <span className="device-icon">🎤</span>
              Microphone
            </label>
            <select
              className="device-select"
              value={audioInputDeviceId || ''}
              onChange={(e) => handleInputDeviceChange(e.target.value)}
            >
              <option value="">Default Microphone</option>
              {inputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <div className="device-group">
            <label className="device-label">
              <span className="device-icon">🔊</span>
              Speaker
            </label>
            <select
              className="device-select"
              value={audioOutputDeviceId || ''}
              onChange={(e) => handleOutputDeviceChange(e.target.value)}
            >
              <option value="">Default Speaker</option>
              {outputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <button className="refresh-btn" onClick={loadDevices}>
            🔄 Refresh Devices
          </button>
        </div>
      )}

      <style>{`
        .device-selector {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          padding: 20px;
          min-width: 300px;
          max-width: 400px;
        }

        .device-selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .device-selector-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--border-radius);
        }

        .close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--error);
          border-radius: var(--border-radius);
          padding: 12px;
          margin-bottom: 16px;
          color: var(--error);
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-banner button {
          background: var(--error);
          color: white;
          border: none;
          padding: 4px 12px;
          border-radius: var(--border-radius);
          cursor: pointer;
          font-size: 12px;
        }

        .loading {
          padding: 20px;
          text-align: center;
          color: var(--text-secondary);
        }

        .device-selector-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .device-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .device-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .device-icon {
          font-size: 18px;
        }

        .device-select {
          padding: 10px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
          transition: border-color var(--transition-fast);
        }

        .device-select:hover {
          border-color: var(--accent-primary);
        }

        .device-select:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
        }

        .refresh-btn {
          margin-top: 8px;
          padding: 10px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .refresh-btn:hover {
          border-color: var(--accent-primary);
          background: var(--bg-hover);
        }
      `}</style>
    </div>
  );
}
