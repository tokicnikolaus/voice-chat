import type { Participant } from '@/domain/types';
import { ParticipantCard } from './ParticipantCard';

interface ParticipantGridProps {
  participants: Participant[];
}

export function ParticipantGrid({ participants }: ParticipantGridProps) {
  if (participants.length === 0) {
    return (
      <div className="empty-room">
        <span className="empty-icon">👥</span>
        <p>No one else is here yet</p>
        <span className="empty-hint">Share the room name with friends to invite them</span>
      </div>
    );
  }

  return (
    <div className="participant-grid">
      {participants.map((participant) => (
        <ParticipantCard key={participant.id} participant={participant} />
      ))}

      <style>{`
        .participant-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }

        .empty-room {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-room p {
          font-size: 16px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .empty-hint {
          font-size: 13px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
