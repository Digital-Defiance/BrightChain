/**
 * AvatarCircle component.
 *
 * Renders a MUI Avatar with the first letter of the sender's display name
 * and a deterministic background color derived from the name.
 *
 * Requirements: 3.2 (avatar with first letter + color from name), 8.4 (aria-label)
 */
import Avatar from '@mui/material/Avatar';
import React from 'react';

export interface AvatarCircleProps {
  displayName: string;
  size?: number; // default 40
}

/**
 * Deterministic color palette for avatars.
 * Chosen for good contrast with white text across light/dark themes.
 */
const AVATAR_COLORS = [
  '#e53935', // red
  '#d81b60', // pink
  '#8e24aa', // purple
  '#5e35b1', // deep purple
  '#3949ab', // indigo
  '#1e88e5', // blue
  '#039be5', // light blue
  '#00acc1', // cyan
  '#00897b', // teal
  '#43a047', // green
  '#7cb342', // light green
  '#c0ca33', // lime
  '#fdd835', // yellow
  '#ffb300', // amber
  '#fb8c00', // orange
  '#f4511e', // deep orange
] as const;

/**
 * Derives a deterministic background color from a display name.
 * Uses a simple hash so the same name always maps to the same color.
 *
 * Exported for testing (Property 1).
 */
export function getAvatarColor(displayName: string): string {
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    // djb2-style hash
    hash = (hash << 5) - hash + displayName.charCodeAt(i);
    hash |= 0; // convert to 32-bit int
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Extracts the first visible character from a display name.
 * Falls back to '?' for empty / whitespace-only strings.
 */
function getInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) return '?';
  // Handle surrogate pairs (emoji / CJK supplementary)
  const codePoint = trimmed.codePointAt(0);
  return codePoint !== undefined ? String.fromCodePoint(codePoint) : '?';
}

const AvatarCircle: React.FC<AvatarCircleProps> = ({
  displayName,
  size = 40,
}) => {
  const bgColor = getAvatarColor(displayName);
  const initial = getInitial(displayName);

  return (
    <Avatar
      aria-label={displayName}
      sx={{
        width: size,
        height: size,
        bgcolor: bgColor,
        fontSize: size * 0.5,
        color: '#fff',
      }}
    >
      {initial}
    </Avatar>
  );
};

export default AvatarCircle;
