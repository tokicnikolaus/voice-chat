import type { MessageReaction } from '@/domain/types';
import { useRoomStore } from '@/application/stores/roomStore';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReaction: (emoji: string) => void;
}

export function MessageReactions({ reactions, onReaction }: MessageReactionsProps) {
  const { userId } = useRoomStore();

  return (
    <div className="message-reactions">
      {reactions.map((reaction) => {
        const hasReacted = userId ? reaction.userIds.includes(userId) : false;
        return (
          <button
            key={reaction.emoji}
            className={`reaction-badge ${hasReacted ? 'active' : ''}`}
            onClick={() => onReaction(reaction.emoji)}
            title={`${reaction.userIds.length} reaction${reaction.userIds.length !== 1 ? 's' : ''}`}
          >
            <span className="emoji">{reaction.emoji}</span>
            <span className="count">{reaction.userIds.length}</span>
          </button>
        );
      })}

      <style>{`
        .message-reactions {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }

        .reaction-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          border-radius: 12px;
          cursor: pointer;
          font-size: 13px;
          transition: all var(--transition-fast);
        }

        .reaction-badge:hover {
          border-color: var(--accent-primary);
        }

        .reaction-badge.active {
          background: var(--accent-primary);
          background: rgba(99, 102, 241, 0.2);
          border-color: var(--accent-primary);
        }

        .emoji {
          font-size: 14px;
        }

        .count {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .reaction-badge.active .count {
          color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
}
