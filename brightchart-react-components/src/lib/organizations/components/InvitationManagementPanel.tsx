/**
 * InvitationManagementPanel — Panel for creating invitation tokens.
 *
 * Displays a form with a role code selector (Physician, Registered Nurse,
 * Medical Assistant, Dentist, Veterinarian, Admin, Patient) and an optional
 * target email field. On successful creation, displays the generated token
 * with a "Copy to Clipboard" button and the expiration date (7 days).
 *
 * Handles 403 (no permission), 400 INVALID_ROLE_CODE, and loading state.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 *
 * @module organizations/components/InvitationManagementPanel
 */

import type { IInvitation } from '@brightchain/brightchart-lib';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import React, { useCallback, useState } from 'react';
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import { useOrgApi } from '../hooks/useOrgApi';

export interface InvitationManagementPanelProps {
  organizationId: string;
}

/** Valid role codes for invitations (includes Patient) */
const INVITATION_ROLE_OPTIONS = [
  { code: '309343006', label: 'Physician' },
  { code: '224535009', label: 'Registered Nurse' },
  { code: '224571005', label: 'Medical Assistant' },
  { code: '106289002', label: 'Dentist' },
  { code: '106290006', label: 'Veterinarian' },
  { code: 'ADMIN', label: 'Admin' },
  { code: 'PATIENT', label: 'Patient' },
] as const;

export const InvitationManagementPanel: React.FC<
  InvitationManagementPanelProps
> = ({ organizationId }) => {
  const orgApi = useOrgApi();
  const { formatDate } = useFormattedDate();

  const [roleCode, setRoleCode] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<IInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!roleCode) {
      setError('Please select a role code.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await orgApi.createInvitation({
        organizationId,
        roleCode,
        ...(targetEmail.trim() ? { targetEmail: targetEmail.trim() } : {}),
      });
      setInvitation(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      if (
        message.toLowerCase().includes('forbidden') ||
        message.includes('403')
      ) {
        setError(
          'You do not have permission to create invitations at this organization.',
        );
      } else if (message.includes('INVALID_ROLE_CODE')) {
        setError(message);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [orgApi, organizationId, roleCode, targetEmail]);

  const handleCopy = useCallback(async () => {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: ignore clipboard errors
    }
  }, [invitation]);

  const handleCreateAnother = useCallback(() => {
    setInvitation(null);
    setRoleCode('');
    setTargetEmail('');
    setError(null);
    setCopied(false);
  }, []);

  return (
    <Box data-testid="invitation-management-panel" sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Create Invitation
      </Typography>

      {error && (
        <Alert severity="error" data-testid="invitation-error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {invitation ? (
        <Box data-testid="invitation-result">
          <Alert severity="success" sx={{ mb: 2 }}>
            Invitation created successfully.
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Token
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                bgcolor: 'grey.100',
                borderRadius: 1,
              }}
            >
              <Typography
                variant="body1"
                data-testid="invitation-token"
                sx={{
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  flex: 1,
                }}
              >
                {invitation.token}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy to Clipboard'}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleCopy}
                  data-testid="copy-token-btn"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </Tooltip>
            </Box>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            data-testid="invitation-expiration"
          >
            Expires: {formatDate(invitation.expiresAt)}
          </Typography>

          <Button
            sx={{ mt: 2 }}
            onClick={handleCreateAnother}
            data-testid="create-another-btn"
          >
            Create Another
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Role
            </Typography>
            <Select
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              displayEmpty
              fullWidth
              size="small"
              data-testid="role-code-select"
              inputProps={{ 'data-testid': 'role-code-select-input' }}
            >
              <MenuItem value="" disabled>
                Select a role
              </MenuItem>
              {INVITATION_ROLE_OPTIONS.map((opt) => (
                <MenuItem
                  key={opt.code}
                  value={opt.code}
                  data-testid={`role-option-${opt.code}`}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <TextField
            label="Target Email (optional)"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            fullWidth
            size="small"
            inputProps={{ 'data-testid': 'target-email-input' }}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="create-invitation-btn"
          >
            {submitting ? (
              <CircularProgress size={24} data-testid="loading-indicator" />
            ) : (
              'Create Invitation'
            )}
          </Button>
        </>
      )}
    </Box>
  );
};

export default InvitationManagementPanel;
