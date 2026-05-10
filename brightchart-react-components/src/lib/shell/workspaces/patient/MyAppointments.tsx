/**
 * MyAppointments — Patient portal appointments view.
 *
 * @module shell/workspaces/patient/MyAppointments
 */

import { BrightChartStrings } from '@brightchain/brightchart-lib';
import { Box, Button, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';

export const MyAppointments: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5">
          {t(BrightChartStrings.PatientPortal_Appointments)}
        </Typography>
        <Button variant="contained" size="small">
          {t(BrightChartStrings.PatientPortal_RequestAppointment)}
        </Button>
      </Box>
      <Typography variant="h6" gutterBottom>
        {t(BrightChartStrings.PatientPortal_Upcoming)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t(BrightChartStrings.PatientPortal_NoUpcoming)}
      </Typography>
      <Typography variant="h6" gutterBottom>
        {t(BrightChartStrings.PatientPortal_Past)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Appointment history will be populated by Module 6 components.
      </Typography>
    </Box>
  );
};
