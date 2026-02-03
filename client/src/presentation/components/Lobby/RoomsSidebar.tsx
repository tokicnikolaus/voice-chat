import type { RoomSummary } from '@/domain/types';

interface RoomsSidebarProps {
  rooms: RoomSummary[];
  onJoinRoom: (roomName: string) => void;
  onCreateRoom: () => void;
  onClose: () => void;
}

export function RoomsSidebar({ rooms, onJoinRoom, onCreateRoom, onClose }: RoomsSidebarProps) {
  // Filter out Lobby from the room list
  const filteredRooms = rooms.filter((room) => room.name !== 'Lobby');

  return (
    <aside className="rooms-sidebar">
      <header className="sidebar-header">
        <h2>Rooms</h2>
        <button className="close-btn" onClick={onClose} title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div className="sidebar-content">
        <button className="btn btn-primary create-room-btn" onClick={onCreateRoom}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Room
        </button>

        {filteredRooms.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <p>No rooms available</p>
            <span>Create a room to get started</span>
          </div>
        ) : (
          <div className="room-list">
            {filteredRooms.map((room) => (
              <div key={room.id} className="room-item">
                <div className="room-info">
                  <span className="room-name">{room.name}</span>
                  <span className="room-meta">
                    <span className={`room-type ${room.type}`}>{room.type}</span>
                    <span className="room-count">
                      {room.participantCount}/{room.capacity}
                    </span>
                  </span>
                </div>
                <button
                  className="btn btn-secondary join-btn"
                  onClick={() => onJoinRoom(room.name)}
                  disabled={room.isFull}
                >
                  {room.isFull ? 'Full' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .rooms-sidebar {
          width: 340px;
          min-width: 340px;
          height: 100%;
          max-height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary);
          border-left: 1px solid var(--border-color);
          overflow: hidden;
        }

        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .sidebar-header h2 {
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
          color: var(--text-muted);
          cursor: pointer;
          border-radius: var(--border-radius);
          transition: all var(--transition-fast);
        }

        .close-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .create-room-btn {
          width: 100%;
          justify-content: center;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-muted);
          padding: 40px 20px;
        }

        .empty-state svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state p {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .empty-state span {
          font-size: 13px;
        }

        .room-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .room-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          transition: border-color var(--transition-fast);
        }

        .room-item:hover {
          border-color: var(--accent-primary);
        }

        .room-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .room-name {
          font-weight: 500;
          font-size: 14px;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .room-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }

        .room-type {
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: capitalize;
        }

        .room-type.public {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
        }

        .room-type.private {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }

        .room-count {
          color: var(--text-muted);
        }

        .join-btn {
          padding: 6px 14px;
          font-size: 13px;
          flex-shrink: 0;
        }

        .join-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </aside>
  );
}
