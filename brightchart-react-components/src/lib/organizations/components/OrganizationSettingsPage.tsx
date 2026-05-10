/**
 * OrganizationSettingsPage — Admin settings page for an Organization.
 *
 * Fetches the organization by ID, populates a form with name, enrollment mode,
 * and active status. Submits only changed fields via PUT. Handles 403 (access
 * denied), 400/404 (error messages), and loading states.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * @module organizations/components/OrganizationSettingsPage
 */

import type {
  EnrollmentMode,
  IUpdateOrganizationRequest,
} from '@brightchain/brightchart-lib';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useCallback, useEffect, useState } from 'react';
import { useOrgApi } from '../hooks/useOrgApi';
import { useOrganization } from '../hooks/useOrganization';

export interface OrganizationSettingsPageProps {
  organizationId: string;
}

export const OrganizationSettingsPage: React.FC<
  OrganizationSettingsPageProps
> = ({ organizationId }) => {
  const orgApi = useOrgApi();
  const {
    data: org,
    loading: fetching,
    error: fetchError,
    refetch,
  } = useOrganization(organizationId);

  // Form state
  const [name, setName] = useState('');
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>('open');
  const [active, setActive] = useState(true);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showDeactivateWarning, setShowDeactivateWarning] = useState(false);

  // Populate form when org data loads
  useEffect(() => {
    if (org) {
      setName(org.name);
      setEnrollmentMode(org.enrollmentMode);
      setActive(org.active);
      setShowDeactivateWarning(false);
    }
  }, [org]);

  // Check for 403 on initial fetch
  useEffect(() => {
    if (fetchError && fetchError.toLowerCase().includes('forbidden')) {
      setAccessDenied(true);
    }
  }, [fetchError]);

  /**
   * Computes the diff between current form state and original org data.
   * Returns only the fields that have changed.
   */
  const getChangedFields =
    useCallback((): IUpdateOrganizationRequest | null => {
      if (!org) return null;

      const changes: IUpdateOrganizationRequest = {};
      if (name.trim() !== org.name) changes.name = name.trim();
      if (enrollmentMode !== org.enrollmentMode)
        changes.enrollmentMode = enrollmentMode;
      if (active !== org.active) changes.active = active;

      return Object.keys(changes).length > 0 ? changes : null;
    }, [org, name, enrollmentMode, active]);

  const handleActiveToggle = useCallback((checked: boolean) => {
    setActive(checked);
    if (!checked) {
      setShowDeactivateWarning(true);
    } else {
      setShowDeactivateWarning(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setSuccessMessage(null);
    setErrorMessage(null);

    const changes = getChangedFields();
    if (!changes) return;

    setSubmitting(true);
    try {
      await orgApi.updateOrganization(organizationId, changes);
      setSuccessMessage('Settings updated successfully.');
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      if (
        message.toLowerCase().includes('forbidden') ||
        message.toLowerCase().includes('access denied')
      ) {
        setAccessDenied(true);
      }
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }, [getChangedFields, orgApi, organizationId, refetch]);

  // Access denied state
  if (accessDenied) {
    return (
      <Box data-testid="settings-access-denied" sx={{ p: 2 }}>
        <Alert severity="error">
          Access denied. You do not have permission to manage this
          organization's settings.
        </Alert>
      </Box>
    );
  }

  // Loading state
  if (fetching) {
    return (
      <Box
        data-testid="settings-loading"
        sx={{ p: 2, display: 'flex', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Fetch error (non-403)
  if (fetchError) {
    return (
      <Box data-testid="settings-fetch-error" sx={{ p: 2 }}>
        <Alert severity="error">{fetchError}</Alert>
      </Box>
    );
  }

  if (!org) return null;

  const hasChanges = getChangedFields() !== null;

  return (
    <Box data-testid="settings-page" sx={{ p: 2, maxWidth: 600 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 3 }}>
        Organization Settings
      </Typography>

      {successMessage && (
        <Alert severity="success" data-testid="settings-success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" data-testid="settings-error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Name field */}
      <TextField
        label="Organization Name"
        fullWidth
        value={name}
        onChange={(e) => setName(e.target.value)}
        margin="normal"
        inputProps={{ 'data-testid': 'settings-name-input' }}
        data-testid="settings-name-field"
      />

      {/* Enrollment mode */}
      <Box sx={{ mt: 2, mb: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Enrollment Mode
        </Typography>
        <Select
          value={enrollmentMode}
          onChange={(e) => setEnrollmentMode(e.target.value as EnrollmentMode)}
          fullWidth
          data-testid="settings-enrollment-select"
          inputProps={{ 'data-testid': 'settings-enrollment-input' }}
        >
          <MenuItem value="open">Open</MenuItem>
          <MenuItem value="invite-only">Invite Only</MenuItem>
        </Select>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5 }}
          data-testid="enrollment-description"
        >
          {enrollmentMode === 'open'
            ? 'Any BrightChain member can self-register as a patient.'
            : 'Patients must present a valid invitation token to register.'}
        </Typography>
      </Box>

      {/* Active status */}
      <Box sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={active}
              onChange={(e) => handleActiveToggle(e.target.checked)}
              data-testid="settings-active-switch"
            />
          }
          label="Active"
          data-testid="settings-active-label"
        />
        {showDeactivateWarning && (
          <Alert
            severity="warning"
            data-testid="deactivate-warning"
            sx={{ mt: 1 }}
          >
            Deactivating this organization will prevent new registrations and
            may affect existing members.
          </Alert>
        )}
      </Box>

      {/* Submit */}
      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !hasChanges}
          data-testid="settings-submit-btn"
        >
          {submitting ? (
            <CircularProgress
              size={24}
              data-testid="settings-loading-indicator"
            />
          ) : (
            'Save Changes'
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default OrganizationSettingsPage;
