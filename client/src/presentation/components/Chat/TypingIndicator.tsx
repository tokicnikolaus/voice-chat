interface TypingIndicatorProps {
  userNames: string[];
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  if (userNames.length === 0) return null;

  let text: string;
  if (userNames.length === 1) {
    text = `${userNames[0]} is typing`;
  } else if (userNames.length === 2) {
    text = `${userNames[0]} and ${userNames[1]} are typing`;
  } else {
    text = `${userNames[0]} and ${userNames.length - 1} others are typing`;
  }

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
      <span className="typing-text">{text}</span>

      <style>{`
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          color: var(--text-muted);
          font-size: 13px;
          min-height: 24px;
        }

        .typing-dots {
          display: flex;
          gap: 3px;
        }

        .dot {
          width: 6px;
          height: 6px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: typingBounce 1.4s infinite ease-in-out both;
        }

        .dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes typingBounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .typing-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}
