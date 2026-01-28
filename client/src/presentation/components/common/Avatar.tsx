interface AvatarProps {
  name: string;
  size?: number;
}

// Generate a deterministic color based on the name
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

// Get initials from name
function getInitials(name: string): string {
  const parts = name.split(/[\s_-]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ name, size = 48 }: AvatarProps) {
  const backgroundColor = stringToColor(name);
  const initials = getInitials(name);
  const fontSize = size * 0.4;

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        backgroundColor,
        fontSize,
      }}
    >
      {initials}

      <style>{`
        .avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 600;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          user-select: none;
        }
      `}</style>
    </div>
  );
}
