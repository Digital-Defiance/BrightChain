/**
 * MyHealthSummary — Patient portal health dashboard.
 *
 * Displays the authenticated patient's health summary. Reads the locked
 * activePatient from context (set by PatientPortal on mount).
 *
 * @module shell/workspaces/patient/MyHealthSummary
 */

import { BrightChartStrings } from '@brightchain/brightchart-lib';
import { Alert, Box, Card, CardContent, Grid, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { useActiveContext } from '../../contexts/ActiveContext';

export const MyHealthSummary: React.FC = () => {
  const { t } = useBrightChartTranslation();
  const { activePatient, activeOrganizationName } = useActiveContext();

  const patientName = activePatient?.name?.[0]?.text ?? 'Patient';

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t(BrightChartStrings.PatientPortal_MyHealth)}
      </Typography>
      {activeOrganizationName && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t(BrightChartStrings.PatientPortal_ViewingRecordsAt, {
            ORG: activeOrganizationName,
          })}
        </Alert>
      )}
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {t(BrightChartStrings.PatientPortal_WelcomeUser, {
          NAME: patientName,
        })}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t(BrightChartStrings.PatientPortal_NextAppointment)}
              </Typography>
              <Typography variant="body1">
                {t(BrightChartStrings.PatientPortal_NoneScheduled)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t(BrightChartStrings.PatientPortal_ActiveMedications)}
              </Typography>
              <Typography variant="h4">0</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t(BrightChartStrings.PatientPortal_RecentResults)}
              </Typography>
              <Typography variant="h4">0</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {t(BrightChartStrings.PatientPortal_OutstandingBalance)}
              </Typography>
              <Typography variant="h4">$0.00</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t(BrightChartStrings.PatientPortal_ClinicalTimeline)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Clinical timeline (read-only) will be populated by Module 2
          components.
        </Typography>
      </Box>
    </Box>
  );
};
