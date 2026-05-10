/**
 * ClaimTrackingView — Submitted claim status dashboard.
 *
 * @module shell/workspaces/billing/ClaimTrackingView
 */

import {
  BillingPermission,
  BrightChartStrings,
} from '@brightchain/brightchart-lib';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PermissionGate } from '../../components/PermissionGate';

export const ClaimTrackingView: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <PermissionGate requiredPermissions={[BillingPermission.BillingRead]}>
      <Box>
        <Typography variant="h5" gutterBottom>
          {t(BrightChartStrings.BillingWS_ClaimTracking)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Claim lifecycle status dashboard will be populated by Module 7
          components.
        </Typography>
      </Box>
    </PermissionGate>
  );
};
