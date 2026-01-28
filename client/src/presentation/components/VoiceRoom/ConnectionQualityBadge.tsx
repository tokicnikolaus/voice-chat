interface ConnectionQualityBadgeProps {
  quality: number;
}

export function ConnectionQualityBadge({ quality }: ConnectionQualityBadgeProps) {
  const getColor = () => {
    if (quality >= 75) return 'var(--success)';
    if (quality >= 50) return 'var(--warning)';
    return 'var(--error)';
  };

  const getBars = () => {
    if (quality >= 75) return 4;
    if (quality >= 50) return 3;
    if (quality >= 25) return 2;
    return 1;
  };

  const color = getColor();
  const activeBars = getBars();

  return (
    <div className="connection-quality" title={`Connection: ${quality}%`}>
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className="bar"
          style={{
            height: `${bar * 3 + 2}px`,
            backgroundColor: bar <= activeBars ? color : 'var(--bg-hover)',
          }}
        />
      ))}

      <style>{`
        .connection-quality {
          position: absolute;
          top: 0;
          right: 0;
          display: flex;
          align-items: flex-end;
          gap: 1px;
          padding: 4px;
          background: var(--bg-secondary);
          border-radius: 4px;
        }

        .bar {
          width: 3px;
          border-radius: 1px;
          transition: background-color var(--transition-fast);
        }
      `}</style>
    </div>
  );
}
