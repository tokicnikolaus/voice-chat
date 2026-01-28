import type { Participant } from '@/domain/types';
import { useRoomStore } from '@/application/stores/roomStore';
import { Avatar } from '@/presentation/components/common/Avatar';
import { SpeakingIndicator } from './SpeakingIndicator';
import { ConnectionQualityBadge } from './ConnectionQualityBadge';

interface ParticipantCardProps {
  participant: Participant;
}

export function ParticipantCard({ participant }: ParticipantCardProps) {
  const { speakingParticipants, connectionQualities, userId } = useRoomStore();

  const isSpeaking = speakingParticipants.has(participant.id);
  const connectionQuality = connectionQualities.get(participant.id) ?? 100;
  const isCurrentUser = participant.id === userId;

  return (
    <div className={`participant-card ${isSpeaking ? 'speaking' : ''}`}>
      <div className="avatar-container">
        <Avatar name={participant.name} size={80} />
        {isSpeaking && <SpeakingIndicator />}
        <ConnectionQualityBadge quality={connectionQuality} />
      </div>

      <div className="participant-info">
        <span className="participant-name">
          {participant.name}
          {isCurrentUser && <span className="you-badge">(You)</span>}
        </span>
        {participant.isMuted && (
          <span className="muted-indicator" title="Muted">
            🔇
          </span>
        )}
      </div>

      <style>{`
        .participant-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          transition: all var(--transition-normal);
        }

        .participant-card.speaking {
          border-color: var(--accent-primary);
          box-shadow: var(--shadow-glow);
        }

        .avatar-container {
          position: relative;
        }

        .participant-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .participant-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          text-align: center;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .you-badge {
          font-size: 11px;
          color: var(--text-muted);
          margin-left: 4px;
        }

        .muted-indicator {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
