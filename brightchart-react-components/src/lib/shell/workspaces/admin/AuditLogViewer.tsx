/**
 * AuditLogViewer — Searchable audit log across all modules.
 *
 * @module shell/workspaces/admin/AuditLogViewer
 */

import {
  BrightChartStrings,
  ClinicalPermission,
} from '@brightchain/brightchart-lib';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PermissionGate } from '../../components/PermissionGate';

export const AuditLogViewer: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <PermissionGate requiredPermissions={[ClinicalPermission.ClinicalAdmin]}>
      <Box>
        <Typography variant="h5" gutterBottom>
          {t(BrightChartStrings.Admin_AuditLog)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Searchable audit log with date/user/operation filters will be
          implemented here.
        </Typography>
      </Box>
    </PermissionGate>
  );
};
