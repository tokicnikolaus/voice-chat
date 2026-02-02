interface ChatHeaderProps {
  onClose: () => void;
}

export function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <h2 className="chat-title">Chat</h2>
      <button
        className="close-btn"
        onClick={onClose}
        title="Close chat"
        aria-label="Close chat panel"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <style>{`
        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--header-padding);
          height: var(--header-height);
          box-sizing: border-box;
          border-bottom: 1px solid var(--border-color);
          border-radius: 0 var(--border-radius-lg) 0 0;
          flex-shrink: 0;
        }

        .chat-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--border-radius);
          transition: all var(--transition-fast);
        }

        .close-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      `}</style>
    </header>
  );
}
