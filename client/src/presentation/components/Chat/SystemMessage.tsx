import type { SystemMessage as SystemMessageType } from '@/domain/types';

interface SystemMessageProps {
  message: SystemMessageType;
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
      `}</style>
    </div>
  );
}
