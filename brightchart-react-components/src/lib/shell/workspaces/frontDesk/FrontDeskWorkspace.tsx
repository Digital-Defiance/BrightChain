/**
 * FrontDeskWorkspace — Root component for the front desk workspace.
 *
 * @module shell/workspaces/frontDesk/FrontDeskWorkspace
 */

import { BrightChartStrings } from '@brightchain/brightchart-lib';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { CheckInView } from './CheckInView';
import { RegistrationView } from './RegistrationView';

const FrontDeskDashboard: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t(BrightChartStrings.FrontDesk_Title)}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t(BrightChartStrings.FrontDesk_TodaysAppointments)}
              </Typography>
              <Typography variant="h4">0</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t(BrightChartStrings.FrontDesk_CheckedIn)}
              </Typography>
              <Typography variant="h4">0</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t(BrightChartStrings.FrontDesk_Waitlist)}
              </Typography>
              <Typography variant="h4">0</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t(BrightChartStrings.FrontDesk_PendingEligibility)}
              </Typography>
              <Typography variant="h4">0</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export const FrontDeskWorkspace: React.FC = () => {
  return (
    <Routes>
      <Route index element={<FrontDeskDashboard />} />
      <Route path="check-in" element={<CheckInView />} />
      <Route path="registration" element={<RegistrationView />} />
    </Routes>
  );
};
