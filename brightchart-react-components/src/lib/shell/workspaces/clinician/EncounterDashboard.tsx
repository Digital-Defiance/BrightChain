/**
 * EncounterDashboard — Today's encounters and pending tasks.
 *
 * @module shell/workspaces/clinician/EncounterDashboard
 */

import {
  BrightChartStrings,
  EncounterPermission,
} from '@brightchain/brightchart-lib';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PermissionGate } from '../../components/PermissionGate';

export const EncounterDashboard: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <PermissionGate requiredPermissions={[EncounterPermission.EncounterRead]}>
      <Box>
        <Typography variant="h5" gutterBottom>
          {t(BrightChartStrings.EncounterDashboard_Title)}
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  {t(BrightChartStrings.EncounterDashboard_Scheduled)}
                </Typography>
                <Typography variant="h3" color="primary">
                  0
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  {t(BrightChartStrings.EncounterDashboard_InProgress)}
                </Typography>
                <Typography variant="h3" color="warning.main">
                  0
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  {t(BrightChartStrings.EncounterDashboard_PendingTasks)}
                </Typography>
                <Typography variant="h3" color="error">
                  0
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Encounter list and workflow board will be populated by Module 3
          components.
        </Typography>
      </Box>
    </PermissionGate>
  );
};
