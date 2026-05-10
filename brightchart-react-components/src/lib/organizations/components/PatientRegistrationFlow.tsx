/**
 * PatientRegistrationFlow — Guides a BrightChain member through registering
 * as a patient at an Organization.
 *
 * For open enrollment orgs: directly POSTs to register the patient.
 * For invite-only orgs: shows the InvitationRedeemForm to collect a token,
 * then POSTs with the org ID + token.
 *
 * On success, triggers refetchRoles() so the new PATIENT role appears in
 * the RoleSwitcher.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 11.2
 *
 * @module organizations/components/PatientRegistrationFlow
 */

import type { IOrganization } from '@brightchain/brightchart-lib';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useCallback, useState } from 'react';
import { useActiveContext } from '../../shell/contexts/ActiveContext';
import { useOrgApi } from '../hooks/useOrgApi';

export interface PatientRegistrationFlowProps {
  organization: IOrganization;
  onRegistered: () => void;
  onCancel: () => void;
}

export const PatientRegistrationFlow: React.FC<
  PatientRegistrationFlowProps
> = ({ organization, onRegistered, onCancel }) => {
  const orgApi = useOrgApi();
  const { refetchRoles } = useActiveContext();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenForm, setShowTokenForm] = useState(
    organization.enrollmentMode === 'invite-only',
  );
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);

  const handleOpenEnrollment = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      await orgApi.registerPatient({
        organizationId: organization._id,
      });
      refetchRoles?.();
      onRegistered();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      if (message.includes('INVITATION_REQUIRED')) {
        setShowTokenForm(true);
        setError('This organization requires an invitation to register.');
      } else if (
        message.includes('409') ||
        message.includes('already registered') ||
        message.includes('CONFLICT')
      ) {
        setError(
          'You are already registered as a patient at this organization.',
        );
      } else if (
        message.includes('410') ||
        message.includes('expired') ||
        message.includes('GONE')
      ) {
        setError('The invitation has expired or has already been used.');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [orgApi, organization._id, refetchRoles, onRegistered]);

  const handleTokenSubmit = useCallback(async () => {
    setError(null);
    setTokenError(null);

    if (!token.trim()) {
      setTokenError('Invitation token is required');
      return;
    }

    setSubmitting(true);
    try {
      await orgApi.registerPatient({
        organizationId: organization._id,
        invitationToken: token.trim(),
      });
      refetchRoles?.();
      onRegistered();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      if (
        message.includes('409') ||
        message.includes('already registered') ||
        message.includes('CONFLICT')
      ) {
        setError(
          'You are already registered as a patient at this organization.',
        );
      } else if (
        message.includes('410') ||
        message.includes('expired') ||
        message.includes('GONE')
      ) {
        setError('The invitation has expired or has already been used.');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [orgApi, organization._id, token, refetchRoles, onRegistered]);

  return (
    <Box data-testid="patient-registration-flow" sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Register as Patient at {organization.name}
      </Typography>

      {error && (
        <Alert severity="error" data-testid="registration-error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {showTokenForm ? (
        <Box data-testid="token-form">
          <Typography variant="body2" sx={{ mb: 2 }}>
            This organization requires an invitation token to register.
          </Typography>
          <TextField
            label="Invitation Token"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              if (tokenError) setTokenError(null);
            }}
            fullWidth
            size="small"
            error={!!tokenError}
            helperText={tokenError}
            inputProps={{ 'data-testid': 'token-input' }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={onCancel}
              disabled={submitting}
              data-testid="cancel-btn"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleTokenSubmit}
              disabled={submitting}
              data-testid="submit-token-btn"
            >
              {submitting ? (
                <CircularProgress size={24} data-testid="loading-indicator" />
              ) : (
                'Submit Token'
              )}
            </Button>
          </Box>
        </Box>
      ) : (
        <Box data-testid="open-enrollment">
          <Typography variant="body2" sx={{ mb: 2 }}>
            This organization accepts open enrollment. Click below to register.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={onCancel}
              disabled={submitting}
              data-testid="cancel-btn"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenEnrollment}
              disabled={submitting}
              data-testid="register-btn"
            >
              {submitting ? (
                <CircularProgress size={24} data-testid="loading-indicator" />
              ) : (
                'Register as Patient'
              )}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PatientRegistrationFlow;
