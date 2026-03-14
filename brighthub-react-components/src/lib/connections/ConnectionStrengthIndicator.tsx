/**
 * ConnectionStrengthIndicator Component
 *
 * Displays a visual indicator of connection strength level
 * (Strong, Moderate, Weak, Dormant) with appropriate color styling.
 *
 * @remarks
 * Implements Requirements 35.7, 61.4
 */

import type { BrightHubStringKey } from '@brightchain/brighthub-lib';
import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { ConnectionStrength } from '@brightchain/brighthub-lib';
import { Box, Typography } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the ConnectionStrengthIndicator component */
export interface ConnectionStrengthIndicatorProps {
  /** The strength level to display */
  strength: ConnectionStrength;
}

const strengthColorMap: Record<ConnectionStrength, string> = {
  [ConnectionStrength.Strong]: '#2e7d32',
  [ConnectionStrength.Moderate]: '#1565c0',
  [ConnectionStrength.Weak]: '#e65100',
  [ConnectionStrength.Dormant]: '#757575',
};

const strengthLabelMap: Record<ConnectionStrength, BrightHubStringKey> = {
  [ConnectionStrength.Strong]:
    BrightHubStrings.ConnectionStrengthIndicator_Strong,
  [ConnectionStrength.Moderate]:
    BrightHubStrings.ConnectionStrengthIndicator_Moderate,
  [ConnectionStrength.Weak]: BrightHubStrings.ConnectionStrengthIndicator_Weak,
  [ConnectionStrength.Dormant]:
    BrightHubStrings.ConnectionStrengthIndicator_Dormant,
};

/**
 * ConnectionStrengthIndicator
 *
 * Renders a colored dot and label representing the strength
 * of a connection (Strong, Moderate, Weak, or Dormant).
 */
export function ConnectionStrengthIndicator({
  strength,
}: ConnectionStrengthIndicatorProps) {
  const { t } = useBrightHubTranslation();

  const color = strengthColorMap[strength];
  const label = t(strengthLabelMap[strength]);

  return (
    <Box
      aria-label={t(BrightHubStrings.ConnectionStrengthIndicator_AriaLabel)}
      data-testid="connection-strength-indicator"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
    >
      <Box
        data-testid="strength-dot"
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <Typography
        variant="body2"
        data-testid="strength-label"
        sx={{ color, fontWeight: 500 }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default ConnectionStrengthIndicator;
