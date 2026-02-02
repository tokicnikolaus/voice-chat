import { useState } from 'react';
import type { ChatMessage as ChatMessageType } from '@/domain/types';
import { useRoomStore } from '@/application/stores/roomStore';
import { Avatar } from '@/presentation/components/common/Avatar';
import { MessageReactions } from './MessageReactions';
import { ReactionPicker } from './ReactionPicker';

interface ChatMessageProps {
  message: ChatMessageType;
  onReaction: (messageId: string, emoji: string) => void;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatMessage({ message, onReaction }: ChatMessageProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const { userId } = useRoomStore();
  const isOwnMessage = message.senderId === userId;

  const handleReaction = (emoji: string) => {
    onReaction(message.id, emoji);
    setShowReactionPicker(false);
  };

  return (
    <div className={`chat-message ${isOwnMessage ? 'own' : ''}`}>
      {!isOwnMessage && (
        <div className="message-avatar">
          <Avatar name={message.senderName} size={32} />
        </div>
      )}

      <div className="message-content">
        <div className="message-header">
          <span className="sender-name">{isOwnMessage ? 'You' : message.senderName}</span>
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>

        <div className="message-bubble">
          <p className="message-text">{message.content}</p>
        </div>

        {message.reactions.length > 0 && (
          <MessageReactions
            reactions={message.reactions}
            onReaction={(emoji) => onReaction(message.id, emoji)}
          />
        )}

        <div className="message-actions">
          <button
            className="reaction-btn"
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            title="Add reaction"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          {showReactionPicker && (
            <ReactionPicker
              onSelect={handleReaction}
              onClose={() => setShowReactionPicker(false)}
            />
          )}
        </div>
      </div>

      {isOwnMessage && (
        <div className="message-avatar">
          <Avatar name={message.senderName} size={32} />
        </div>
      )}

      <style>{`
        .chat-message {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .chat-message.own {
          flex-direction: row-reverse;
        }

        .message-avatar {
          flex-shrink: 0;
        }

        .message-content {
          flex: 1;
          min-width: 0;
          position: relative;
        }

        .chat-message.own .message-content {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .chat-message.own .message-header {
          flex-direction: row-reverse;
        }

        .sender-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .message-time {
          font-size: 11px;
          color: var(--text-muted);
        }

        .message-bubble {
          background: var(--bg-tertiary);
          padding: 10px 14px;
          border-radius: var(--border-radius-lg);
          max-width: 85%;
        }

        .chat-message.own .message-bubble {
          background: var(--accent-primary);
        }

        .message-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        .chat-message.own .message-text {
          color: white;
        }

        .message-actions {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .chat-message:hover .message-actions {
          opacity: 1;
        }

        .chat-message:not(.own) .message-actions {
          right: 8px;
        }

        .chat-message.own .message-actions {
          left: 8px;
        }

        .reaction-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--border-radius);
          box-shadow: var(--shadow-sm);
        }

        .reaction-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
