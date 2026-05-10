/**
 * UserManagement — List BrightChain members, assign/edit healthcare roles.
 *
 * @module shell/workspaces/admin/UserManagement
 */

import {
  BrightChartStrings,
  PatientPermission,
} from '@brightchain/brightchart-lib';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PermissionGate } from '../../components/PermissionGate';

export const UserManagement: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <PermissionGate requiredPermissions={[PatientPermission.Admin]}>
      <Box>
        <Typography variant="h5" gutterBottom>
          {t(BrightChartStrings.Admin_UserManagement)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Member list with healthcare role assignment will be implemented here.
        </Typography>
      </Box>
    </PermissionGate>
  );
};
