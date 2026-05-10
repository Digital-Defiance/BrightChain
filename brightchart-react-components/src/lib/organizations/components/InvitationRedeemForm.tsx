/**
 * InvitationRedeemForm — Standalone form for redeeming an invitation token.
 *
 * Displays a single text field for the invitation token (supports
 * `initialToken` prop for URL pre-fill). On successful redemption,
 * displays the assigned role name and organization name, triggers
 * refetchRoles(), and calls onRedeemed.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 11.3
 *
 * @module organizations/components/InvitationRedeemForm
 */

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useCallback, useState } from 'react';
import { useActiveContext } from '../../shell/contexts/ActiveContext';
import { useOrgApi } from '../hooks/useOrgApi';

export interface InvitationRedeemFormProps {
  /** Pre-filled token (e.g. from URL param) */
  initialToken?: string;
  onRedeemed: (roleName: string, orgName: string) => void;
}

export const InvitationRedeemForm: React.FC<InvitationRedeemFormProps> = ({
  initialToken = '',
  onRedeemed,
}) => {
  const orgApi = useOrgApi();
  const { refetchRoles } = useActiveContext();

  const [token, setToken] = useState(initialToken);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    roleName: string;
    orgName: string;
  } | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setTokenError(null);

    if (!token.trim()) {
      setTokenError('Invitation token is required');
      return;
    }

    setSubmitting(true);
    try {
      const result = await orgApi.redeemInvitation({ token: token.trim() });
      setSuccess({
        roleName: result.role.roleDisplay,
        orgName: result.organizationName,
      });
      refetchRoles?.();
      onRedeemed(result.role.roleDisplay, result.organizationName);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      if (
        message.includes('410') ||
        message.includes('expired') ||
        message.includes('redeemed') ||
        message.includes('GONE')
      ) {
        setError('This invitation has expired or has already been redeemed.');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [orgApi, token, refetchRoles, onRedeemed]);

  return (
    <Box data-testid="invitation-redeem-form" sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Redeem Invitation
      </Typography>

      {error && (
        <Alert severity="error" data-testid="redeem-error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success ? (
        <Alert severity="success" data-testid="redeem-success" sx={{ mb: 2 }}>
          You have been assigned the role of {success.roleName} at{' '}
          {success.orgName}.
        </Alert>
      ) : (
        <>
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
            inputProps={{ 'data-testid': 'redeem-token-input' }}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="redeem-submit-btn"
          >
            {submitting ? (
              <CircularProgress size={24} data-testid="loading-indicator" />
            ) : (
              'Redeem'
            )}
          </Button>
        </>
      )}
    </Box>
  );
};

export default InvitationRedeemForm;
