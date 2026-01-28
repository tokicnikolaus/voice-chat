interface AloneIndicatorProps {
  isAlone: boolean;
}

export function AloneIndicator({ isAlone }: AloneIndicatorProps) {
  if (!isAlone) return null;

  return (
    <div className="alone-indicator">
      <span className="alone-icon">🎵</span>
      <span className="alone-text">You're alone in this room</span>
      <span className="alone-subtext">Background music is playing</span>
      <style>{`
        .alone-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
          border: 2px solid rgba(124, 58, 237, 0.3);
          border-radius: var(--border-radius-lg);
          margin-bottom: 24px;
        }

        .alone-icon {
          font-size: 32px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        .alone-text {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .alone-subtext {
          font-size: 13px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
