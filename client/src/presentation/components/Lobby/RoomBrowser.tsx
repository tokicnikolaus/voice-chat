import type { RoomSummary } from '@/domain/types';

interface RoomBrowserProps {
  rooms: RoomSummary[];
  onJoinRoom: (roomName: string) => void;
  onCreateRoom: () => void;
}

export function RoomBrowser({ rooms, onJoinRoom, onCreateRoom }: RoomBrowserProps) {
  // Filter out Lobby from the room list
  const filteredRooms = rooms.filter((room) => room.name !== 'Lobby');

  return (
    <div className="room-browser">
      <div className="browser-header">
        <h2>Available Rooms</h2>
        <button className="btn btn-primary create-room-btn" onClick={onCreateRoom}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Room
        </button>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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

      <style>{`
        .room-browser {
          background: var(--bg-tertiary);
          border-radius: var(--border-radius-lg);
          padding: 20px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .browser-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .browser-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .create-room-btn {
          padding: 8px 16px;
          font-size: 13px;
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
          font-size: 15px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .empty-state span {
          font-size: 13px;
        }

        .room-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .room-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--bg-secondary);
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
        }

        .room-name {
          font-weight: 500;
          color: var(--text-primary);
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
          padding: 8px 16px;
          font-size: 13px;
        }

        .join-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
