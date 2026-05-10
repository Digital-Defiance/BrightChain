/**
 * RegistrationView — New patient registration.
 *
 * @module shell/workspaces/frontDesk/RegistrationView
 */

import type { IPatientResource } from '@brightchain/brightchart-lib';
import {
  BrightChartStrings,
  PatientPermission,
} from '@brightchain/brightchart-lib';
import { Box, Typography } from '@mui/material';
import React, { useCallback } from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PatientCreateEditForm } from '../../../PatientCreateEditForm/PatientCreateEditForm';
import { PermissionGate } from '../../components/PermissionGate';

export const RegistrationView: React.FC = () => {
  const { t } = useBrightChartTranslation();
  const handleSubmit = useCallback((_patient: IPatientResource<string>) => {
    // TODO: Wire to patient creation API
  }, []);

  return (
    <PermissionGate requiredPermissions={[PatientPermission.Write]}>
      <Box>
        <Typography variant="h5" gutterBottom>
          {t(BrightChartStrings.FrontDesk_PatientRegistration)}
        </Typography>
        <PatientCreateEditForm onSubmit={handleSubmit} />
      </Box>
    </PermissionGate>
  );
};
