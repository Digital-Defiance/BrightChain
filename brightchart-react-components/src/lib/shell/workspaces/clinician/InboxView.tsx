/**
 * InboxView — Pending results, unsigned notes, and messages.
 *
 * @module shell/workspaces/clinician/InboxView
 */

import {
  BrightChartStrings,
  DocumentPermission,
  OrderPermission,
} from '@brightchain/brightchart-lib';
import { Box, Divider, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PermissionGate } from '../../components/PermissionGate';

export const InboxView: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t(BrightChartStrings.ClinicianInbox_Title)}
      </Typography>

      <PermissionGate requiredPermissions={[OrderPermission.OrderRead]}>
        <Typography variant="h6">
          {t(BrightChartStrings.ClinicianInbox_PendingResults)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Results list will be populated by Module 5 components.
        </Typography>
      </PermissionGate>

      <Divider sx={{ my: 2 }} />

      <PermissionGate requiredPermissions={[DocumentPermission.DocumentRead]}>
        <Typography variant="h6">
          {t(BrightChartStrings.ClinicianInbox_UnsignedNotes)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Document list will be populated by Module 4 components.
        </Typography>
      </PermissionGate>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6">
        {t(BrightChartStrings.ClinicianInbox_Messages)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Secure messaging placeholder.
      </Typography>
    </Box>
  );
};
