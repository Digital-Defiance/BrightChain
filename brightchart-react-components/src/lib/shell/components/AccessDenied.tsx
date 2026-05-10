/**
 * AccessDenied — Displayed when the user lacks permission for a route.
 *
 * @module shell/components/AccessDenied
 */

import { BrightChartStrings } from '@brightchain/brightchart-lib';
import { Box, Button, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrightChartTranslation } from '../../hooks/useBrightChartTranslation';

export const AccessDenied: React.FC = () => {
  const { t } = useBrightChartTranslation();
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      role="alert"
      aria-live="assertive"
    >
      <Typography variant="h4" gutterBottom>
        {t(BrightChartStrings.Shell_AccessDenied)}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t(BrightChartStrings.Shell_AccessDeniedMessage)}
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate(-1)}
        aria-label="Go back to previous page"
      >
        Go Back
      </Button>
    </Box>
  );
};
