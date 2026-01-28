import type { ConnectionState } from '@/domain/types';

interface ConnectionStatusProps {
  state: ConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const getStatusInfo = () => {
    switch (state) {
      case 'connected':
        return { color: 'var(--success)', text: 'Connected', show: false };
      case 'connecting':
        return { color: 'var(--warning)', text: 'Connecting...', show: true };
      case 'reconnecting':
        return { color: 'var(--warning)', text: 'Reconnecting...', show: true };
      case 'error':
        return { color: 'var(--error)', text: 'Connection Error', show: true };
      case 'disconnected':
        return { color: 'var(--text-muted)', text: 'Disconnected', show: true };
      default:
        return { color: 'var(--text-muted)', text: 'Unknown', show: false };
    }
  };

  const { color, text, show } = getStatusInfo();

  if (!show) return null;

  return (
    <div className="connection-status">
      <span className="status-dot" style={{ backgroundColor: color }} />
      <span className="status-text">{text}</span>

      <style>{`
        .connection-status {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          z-index: 1000;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .status-text {
          font-size: 13px;
          color: var(--text-secondary);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
