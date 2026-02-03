import { useAuthStore } from '@/application/stores/authStore';

interface LobbyHeaderProps {
  participantCount: number;
  onToggleChat: () => void;
  isChatOpen: boolean;
  unreadCount: number;
  onToggleRooms: () => void;
  isRoomsOpen: boolean;
  roomCount: number;
  onOpenDeviceSelector: () => void;
}

export function LobbyHeader({
  participantCount,
  onToggleChat,
  isChatOpen,
  unreadCount,
  onToggleRooms,
  isRoomsOpen,
  roomCount,
  onOpenDeviceSelector,
}: LobbyHeaderProps) {
  const { user, logout } = useAuthStore();

  return (
    <header className="lobby-header">
      <div className="header-left">
        <div className="logo-section">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <div className="title-section">
            <h1 className="room-name">Lobby</h1>
            <span className="participant-count">
              {participantCount} online
            </span>
          </div>
        </div>
        <button
          className={`rooms-toggle-btn ${isRoomsOpen ? 'active' : ''}`}
          onClick={onToggleRooms}
          title={isRoomsOpen ? 'Hide rooms' : 'Show rooms'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Rooms</span>
          {roomCount > 0 && (
            <span className="room-badge">
              {roomCount}
            </span>
          )}
        </button>
      </div>

      <div className="header-right">
        <button
          className="header-icon-btn"
          onClick={onOpenDeviceSelector}
          title="Audio devices"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
        </button>
        <button
          className={`header-icon-btn ${isChatOpen ? 'active' : ''}`}
          onClick={onToggleChat}
          title={isChatOpen ? 'Close chat' : 'Open chat'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadCount > 0 && (
            <span className="unread-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <div className="user-section">
          <div className="user-avatar">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <span className="user-name">{user?.name}</span>
        </div>

        <button className="btn btn-secondary logout-btn" onClick={logout}>
          Sign Out
        </button>
      </div>

      <style>{`
        .lobby-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--header-padding);
          height: var(--header-height);
          box-sizing: border-box;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .rooms-toggle-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--border-radius);
          transition: all var(--transition-fast);
          font-size: 14px;
          font-weight: 500;
        }

        .rooms-toggle-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          background: var(--bg-hover);
        }

        .rooms-toggle-btn.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }

        .rooms-toggle-btn svg {
          flex-shrink: 0;
        }

        .rooms-toggle-btn .room-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: var(--accent-primary);
          color: white;
          font-size: 11px;
          font-weight: 600;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rooms-toggle-btn.active .room-badge {
          background: white;
          color: var(--accent-primary);
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 10px;
          color: white;
        }

        .title-section {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .room-name {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .participant-count {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--border-radius);
          transition: all var(--transition-fast);
        }

        .header-icon-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .header-icon-btn.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }

        .unread-badge,
        .room-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: var(--error);
          color: white;
          font-size: 11px;
          font-weight: 600;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .room-badge {
          background: var(--accent-primary);
        }

        .user-section {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border-radius: var(--border-radius);
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        .user-name {
          font-weight: 500;
          font-size: 14px;
          color: var(--text-primary);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .logout-btn {
          color: var(--error);
        }
      `}</style>
    </header>
  );
}
