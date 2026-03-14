/**
 * TypingIndicator Component
 *
 * Animated typing indicator showing who is currently typing.
 *
 * @remarks
 * Implements Requirements 44.6, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

/** Props for the TypingIndicator component */
export interface TypingIndicatorProps {
  /** Names of users currently typing */
  typingUsers: string[];
}

/**
 * TypingIndicator
 *
 * Shows an animated dot indicator with the name(s) of users typing.
 */
export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  const { t } = useBrightHubTranslation();

  if (typingUsers.length === 0) return null;

  const label =
    typingUsers.length === 1
      ? t(BrightHubStrings.TypingIndicator_SingleTemplate, {
          NAME: typingUsers[0],
        })
      : t(BrightHubStrings.TypingIndicator_MultipleTemplate, {
          COUNT: String(typingUsers.length),
        });

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5 }}
      aria-label={t(BrightHubStrings.TypingIndicator_AriaLabel)}
      role="status"
      aria-live="polite"
    >
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            data-testid={`typing-dot-${i}`}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              animation: `${bounce} 1.4s infinite ease-in-out both`,
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export default TypingIndicator;
