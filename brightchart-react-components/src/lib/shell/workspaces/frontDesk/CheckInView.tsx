/**
 * CheckInView — Patient check-in for transitioning appointments to encounters.
 *
 * @module shell/workspaces/frontDesk/CheckInView
 */

import {
  BrightChartStrings,
  EncounterPermission,
} from '@brightchain/brightchart-lib';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PermissionGate } from '../../components/PermissionGate';

export const CheckInView: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <PermissionGate requiredPermissions={[EncounterPermission.EncounterWrite]}>
      <Box>
        <Typography variant="h5" gutterBottom>
          {t(BrightChartStrings.FrontDesk_PatientCheckIn)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Encounter check-in form will be populated by Module 3 components.
        </Typography>
      </Box>
    </PermissionGate>
  );
};
