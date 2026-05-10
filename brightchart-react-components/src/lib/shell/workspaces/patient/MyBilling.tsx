/**
 * MyBilling — Patient portal billing view (read-only).
 *
 * @module shell/workspaces/patient/MyBilling
 */

import { BrightChartStrings } from '@brightchain/brightchart-lib';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';

export const MyBilling: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t(BrightChartStrings.PatientPortal_BillsPayments)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Patient ledger (read-only) will be populated by Module 7 components.
      </Typography>
    </Box>
  );
};
