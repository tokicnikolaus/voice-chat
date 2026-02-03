import type { SystemMessage as SystemMessageType } from '@/domain/types';

interface SystemMessageProps {
  message: SystemMessageType;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function SystemMessage({ message }: SystemMessageProps) {
  const icon = message.type === 'user_joined' ? '→' : '←';
  const action = message.type === 'user_joined' ? 'joined' : 'left';

  return (
    <div className="system-message">
      <span className="system-icon">{icon}</span>
      <span className="system-text">
        <strong>{message.userName}</strong> {action} the room
      </span>
      <span className="system-time">{formatTime(message.timestamp)}</span>

      <style>{`
        .system-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          color: var(--text-muted);
          font-size: 13px;
        }

        .system-icon {
          font-size: 12px;
        }

        .system-text strong {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .system-time {
          font-size: 11px;
          color: var(--text-muted);
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
