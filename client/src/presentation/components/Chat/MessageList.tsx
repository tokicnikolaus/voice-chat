import { useEffect, useRef } from 'react';
import type { DisplayMessage } from '@/domain/types';
import { ChatMessage } from './ChatMessage';
import { SystemMessage } from './SystemMessage';

interface MessageListProps {
  messages: DisplayMessage[];
  onReaction: (messageId: string, emoji: string) => void;
}

export function MessageList({ messages, onReaction }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Track if user is at the bottom of the list
  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  // Auto-scroll to bottom when new messages arrive (if user is at bottom)
  useEffect(() => {
    if (listRef.current && isAtBottomRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  return (
    <div className="message-list" ref={listRef} onScroll={handleScroll}>
      {messages.length === 0 ? (
        <div className="empty-state">
          <p>No messages yet</p>
          <p className="empty-hint">Start the conversation!</p>
        </div>
      ) : (
        messages.map((dm) => {
          if (dm.kind === 'chat') {
            return (
              <ChatMessage
                key={dm.message.id}
                message={dm.message}
                onReaction={onReaction}
              />
            );
          }
          return <SystemMessage key={dm.message.id} message={dm.message} />;
        })
      )}

      <style>{`
        .message-list {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          text-align: center;
        }

        .empty-state p {
          margin: 0;
        }

        .empty-hint {
          font-size: 13px;
          margin-top: 4px !important;
        }
      `}</style>
    </div>
  );
}
