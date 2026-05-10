/**
 * MyResults — Patient portal test results view (read-only).
 *
 * @module shell/workspaces/patient/MyResults
 */

import { BrightChartStrings } from '@brightchain/brightchart-lib';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';

export const MyResults: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t(BrightChartStrings.PatientPortal_TestResults)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Results list with abnormal flagging will be populated by Module 5
        components.
      </Typography>
    </Box>
  );
};
