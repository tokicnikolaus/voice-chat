import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onTyping: () => void;
}

export function ChatInput({ onSend, onTyping }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!message.trim()) return;
    onSend(message);
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      onTyping();
    }
  };

  return (
    <div className="chat-input">
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="message-input"
        autoComplete="off"
      />
      <button
        className="send-btn"
        onClick={handleSubmit}
        disabled={!message.trim()}
        title="Send message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>

      <style>{`
        .chat-input {
          display: flex;
          gap: 8px;
          padding: 20px;
          border-top: 1px solid var(--border-color);
          border-radius: 0 0 var(--border-radius-lg) 0;
          flex-shrink: 0;
        }

        .message-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          background: var(--bg-tertiary);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .message-input::placeholder {
          color: var(--text-muted);
        }

        .message-input:focus {
          border-color: var(--accent-primary);
        }

        .send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: none;
          background: var(--accent-primary);
          color: white;
          cursor: pointer;
          border-radius: var(--border-radius-lg);
          transition: all var(--transition-fast);
        }

        .send-btn:hover:not(:disabled) {
          background: var(--accent-secondary);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
