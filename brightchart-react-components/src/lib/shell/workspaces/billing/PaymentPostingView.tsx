/**
 * PaymentPostingView — Payment posting interface.
 *
 * @module shell/workspaces/billing/PaymentPostingView
 */

import {
  BillingPermission,
  BrightChartStrings,
} from '@brightchain/brightchart-lib';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PermissionGate } from '../../components/PermissionGate';

export const PaymentPostingView: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <PermissionGate requiredPermissions={[BillingPermission.BillingWrite]}>
      <Box>
        <Typography variant="h5" gutterBottom>
          {t(BrightChartStrings.BillingWS_PaymentPosting)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Payment posting from EOBs to patient ledgers — Module 7 component
          placeholder.
        </Typography>
      </Box>
    </PermissionGate>
  );
};
