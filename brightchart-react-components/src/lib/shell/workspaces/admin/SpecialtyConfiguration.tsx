/**
 * SpecialtyConfiguration — Specialty profile selector and workflow editor.
 *
 * @module shell/workspaces/admin/SpecialtyConfiguration
 */

import {
  BrightChartStrings,
  EncounterPermission,
} from '@brightchain/brightchart-lib';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PermissionGate } from '../../components/PermissionGate';

export const SpecialtyConfiguration: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <PermissionGate requiredPermissions={[EncounterPermission.EncounterAdmin]}>
      <Box>
        <Typography variant="h5" gutterBottom>
          {t(BrightChartStrings.Admin_SpecialtyConfiguration)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Active specialty profile selector, workflow state editor, and fee
          schedule management will be implemented here.
        </Typography>
      </Box>
    </PermissionGate>
  );
};
