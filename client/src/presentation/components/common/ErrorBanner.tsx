interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner">
      <span className="error-icon">⚠️</span>
      <span className="error-message">{message}</span>
      <button className="dismiss-btn" onClick={onDismiss}>
        ✕
      </button>

      <style>{`
        .error-banner {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--error);
          border-radius: var(--border-radius);
          color: white;
          z-index: 1001;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .error-icon {
          font-size: 18px;
        }

        .error-message {
          font-size: 14px;
          font-weight: 500;
        }

        .dismiss-btn {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          font-size: 16px;
          opacity: 0.8;
          transition: opacity var(--transition-fast);
        }

        .dismiss-btn:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
