/**
 * RoleConfiguration — Edit healthcare roles, assign SMART scopes.
 *
 * @module shell/workspaces/admin/RoleConfiguration
 */

import {
  BrightChartStrings,
  PatientPermission,
} from '@brightchain/brightchart-lib';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PermissionGate } from '../../components/PermissionGate';

export const RoleConfiguration: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <PermissionGate requiredPermissions={[PatientPermission.Admin]}>
      <Box>
        <Typography variant="h5" gutterBottom>
          {t(BrightChartStrings.Admin_RoleConfiguration)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Healthcare role editor with SMART scope assignment will be implemented
          here.
        </Typography>
      </Box>
    </PermissionGate>
  );
};
