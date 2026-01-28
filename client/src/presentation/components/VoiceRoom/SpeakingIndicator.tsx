export function SpeakingIndicator() {
  return (
    <div className="speaking-indicator">
      <div className="waveform">
        <div className="waveform-bar" />
        <div className="waveform-bar" />
        <div className="waveform-bar" />
        <div className="waveform-bar" />
        <div className="waveform-bar" />
      </div>

      <style>{`
        .speaking-indicator {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 8px;
          background: var(--bg-secondary);
          border-radius: 12px;
          border: 2px solid var(--accent-primary);
        }

        .waveform {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 16px;
        }

        .waveform-bar {
          width: 3px;
          height: 4px;
          background: var(--accent-primary);
          border-radius: 2px;
          animation: waveform 0.5s ease-in-out infinite;
        }

        .waveform-bar:nth-child(1) { animation-delay: 0s; }
        .waveform-bar:nth-child(2) { animation-delay: 0.1s; }
        .waveform-bar:nth-child(3) { animation-delay: 0.2s; }
        .waveform-bar:nth-child(4) { animation-delay: 0.3s; }
        .waveform-bar:nth-child(5) { animation-delay: 0.15s; }

        @keyframes waveform {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
      `}</style>
    </div>
  );
}
