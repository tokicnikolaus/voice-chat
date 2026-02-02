import { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '@/application/hooks/useWebSocket';
import { useRoomStore } from '@/application/stores/roomStore';
import { useSettingsStore } from '@/application/stores/settingsStore';
import type { RoomSummary } from '@/domain/types';

// Funny name generator using adjective + noun combinations
const ADJECTIVES = [
  'Sneaky', 'Fluffy', 'Grumpy', 'Sleepy', 'Bouncy', 'Wobbly', 'Dizzy', 'Fuzzy',
  'Crispy', 'Spicy', 'Chunky', 'Fancy', 'Cranky', 'Jolly', 'Mighty', 'Tiny',
  'Cosmic', 'Electric', 'Turbo', 'Mega', 'Ultra', 'Super', 'Hyper', 'Ninja',
  'Mystic', 'Shadow', 'Golden', 'Silver', 'Rusty', 'Dusty', 'Shiny', 'Sparkly',
  'Caffein', 'Chaotic', 'Chill', 'Savage', 'Epic', 'Legendary', 'Majestic', 'Noble',
  'Rogue', 'Silent', 'Swift', 'Wise', 'Wild', 'Zen', 'Atomic', 'Blazing',
];

const NOUNS = [
  'Penguin', 'Potato', 'Waffle', 'Muffin', 'Noodle', 'Pickle', 'Taco', 'Burrito',
  'Llama', 'Alpaca', 'Capybara', 'Raccoon', 'Platypus', 'Narwhal', 'Axolotl', 'Quokka',
  'Wizard', 'Goblin', 'Dragon', 'Phoenix', 'Unicorn', 'Yeti', 'Kraken', 'Sphinx',
  'Pirate', 'Ninja', 'Viking', 'Samurai', 'Knight', 'Jester', 'Bard', 'Nomad',
  'Toaster', 'Cactus', 'Banana', 'Coconut', 'Pumpkin', 'Avocado', 'Pretzel', 'Donut',
  'Panda', 'Otter', 'Sloth', 'Koala', 'Wombat', 'Badger', 'Moose', 'Walrus',
];

function generateUsername(): string {
  // Try to get existing username from localStorage
  const stored = localStorage.getItem('voice-chat-username');
  if (stored) {
    return stored;
  }

  // Generate a funny username: Adjective + Noun
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const username = `${adjective}${noun}`;

  // Store it for future sessions
  localStorage.setItem('voice-chat-username', username);
  return username;
}

export function JoinRoom() {
  const [roomName, setRoomName] = useState('');
  const { requestJoinRoom, requestRooms } = useWebSocket();
  const { availableRooms, connectionState } = useRoomStore();
  const { setVoiceMode: saveVoiceMode } = useSettingsStore();

  // Generate username once and persist it
  const userName = useMemo(() => generateUsername(), []);

  // Fetch rooms on mount
  useEffect(() => {
    if (connectionState === 'connected') {
      requestRooms();
    }
  }, [connectionState, requestRooms]);

  const handleJoin = () => {
    if (!roomName.trim()) return;

    saveVoiceMode('vad');
    requestJoinRoom(roomName.trim(), userName, 'vad');
  };

  const handleRoomSelect = (room: RoomSummary) => {
    setRoomName(room.name);
  };

  const isDisabled = connectionState !== 'connected' || !roomName.trim();

  return (
    <div className="join-room">
      <div className="join-card card">
        <h1 className="title">Voice Chat</h1>
        <p className="subtitle">Join or create a voice room</p>

        <div className="form">
          <div className="field">
            <label htmlFor="roomName">Room Name</label>
            <input
              id="roomName"
              type="text"
              className="input"
              placeholder="Enter room name..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <div className="field">
            <label>Your Name</label>
            <div className="username-display">
              <span className="username-text">{userName}</span>
            </div>
          </div>

          <div className="field voice-mode-info">
            <label>Voice</label>
            <p className="voice-mode-desc">Open mic. Use Mute in the room; when muted, hold Space to talk.</p>
          </div>

          <button
            className="btn btn-primary join-btn"
            onClick={handleJoin}
            disabled={isDisabled}
          >
            {connectionState === 'connected' ? 'Join Room' : 'Connecting...'}
          </button>
        </div>

        {availableRooms.length > 0 && (
          <div className="available-rooms">
            <h3>Available Rooms</h3>
            <div className="room-list">
              {availableRooms.map((room) => (
                <button
                  key={room.id}
                  className={`room-item ${room.name === roomName ? 'selected' : ''}`}
                  onClick={() => handleRoomSelect(room)}
                  disabled={room.isFull}
                >
                  <span className="room-name">{room.name}</span>
                  <span className="room-count">
                    {room.participantCount}/{room.capacity}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .join-room {
          width: 100%;
          max-width: 440px;
        }

        .join-card {
          text-align: center;
        }

        .title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: var(--text-secondary);
          margin-bottom: 32px;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field {
          text-align: left;
        }

        .field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .voice-mode-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }

        .voice-mode-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .mode-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 16px;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .mode-option:hover {
          border-color: var(--accent-primary);
        }

        .mode-option.selected {
          border-color: var(--accent-primary);
          background: rgba(124, 58, 237, 0.1);
        }

        .mode-icon {
          font-size: 24px;
        }

        .mode-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .mode-desc {
          font-size: 11px;
          color: var(--text-muted);
        }

        .join-btn {
          width: 100%;
          padding: 14px;
          font-size: 15px;
          margin-top: 8px;
        }

        .available-rooms {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--border-color);
          text-align: left;
        }

        .available-rooms h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 12px;
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
          padding: 12px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .room-item:hover:not(:disabled) {
          border-color: var(--accent-primary);
        }

        .room-item.selected {
          border-color: var(--accent-primary);
          background: rgba(124, 58, 237, 0.1);
        }

        .room-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .room-name {
          font-weight: 500;
          color: var(--text-primary);
        }

        .room-count {
          font-size: 13px;
          color: var(--text-muted);
        }

        .username-display {
          padding: 12px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          color: var(--text-primary);
        }

        .username-text {
          font-weight: 500;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
