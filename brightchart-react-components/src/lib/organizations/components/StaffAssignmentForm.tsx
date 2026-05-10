/**
 * StaffAssignmentForm — Form for assigning practitioner roles to members.
 *
 * Displays a member ID text field and a role code selector listing valid
 * practitioner role codes (Physician, Registered Nurse, Medical Assistant,
 * Dentist, Veterinarian, Admin — no Patient).
 *
 * On 201 success: shows success message, clears form, calls onAssigned.
 * Handles 409 (already assigned), 400 INVALID_ROLE_CODE,
 * 400 INACTIVE_ORGANIZATION, 403, and loading state.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 *
 * @module organizations/components/StaffAssignmentForm
 */

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useCallback, useState } from 'react';
import { useOrgApi } from '../hooks/useOrgApi';

export interface StaffAssignmentFormProps {
  organizationId: string;
  onAssigned: () => void;
  onCancel: () => void;
}

/** Valid practitioner role codes for staff assignment (no Patient) */
const STAFF_ROLE_OPTIONS = [
  { code: '309343006', label: 'Physician' },
  { code: '224535009', label: 'Registered Nurse' },
  { code: '224571005', label: 'Medical Assistant' },
  { code: '106289002', label: 'Dentist' },
  { code: '106290006', label: 'Veterinarian' },
  { code: 'ADMIN', label: 'Admin' },
] as const;

export const StaffAssignmentForm: React.FC<StaffAssignmentFormProps> = ({
  organizationId,
  onAssigned,
  onCancel,
}) => {
  const orgApi = useOrgApi();

  const [memberId, setMemberId] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [memberIdError, setMemberIdError] = useState<string | null>(null);
  const [roleCodeError, setRoleCodeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setMemberIdError(null);
    setRoleCodeError(null);

    let hasValidationError = false;

    if (!memberId.trim()) {
      setMemberIdError('Member ID is required');
      hasValidationError = true;
    }

    if (!roleCode) {
      setRoleCodeError('Please select a role');
      hasValidationError = true;
    }

    if (hasValidationError) return;

    setSubmitting(true);
    try {
      await orgApi.assignStaff({
        memberId: memberId.trim(),
        roleCode,
        organizationId,
      });
      setSuccess(true);
      setMemberId('');
      setRoleCode('');
      onAssigned();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      if (
        message.includes('409') ||
        message.toLowerCase().includes('already') ||
        message.includes('CONFLICT')
      ) {
        setError(
          'This member already holds the selected role at this organization.',
        );
      } else if (message.includes('INVALID_ROLE_CODE')) {
        setError(message);
      } else if (message.includes('INACTIVE_ORGANIZATION')) {
        setError('The organization is not active.');
      } else if (
        message.toLowerCase().includes('forbidden') ||
        message.includes('403')
      ) {
        setError(
          'Access denied. You do not have permission to assign staff roles.',
        );
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [orgApi, memberId, roleCode, organizationId, onAssigned]);

  const handleReset = useCallback(() => {
    setSuccess(false);
    setError(null);
    setMemberId('');
    setRoleCode('');
    setMemberIdError(null);
    setRoleCodeError(null);
  }, []);

  return (
    <Box data-testid="staff-assignment-form" sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Assign Staff Role
      </Typography>

      {error && (
        <Alert severity="error" data-testid="staff-error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" data-testid="staff-success" sx={{ mb: 2 }}>
          Staff role assigned successfully.
        </Alert>
      )}

      <TextField
        label="Member ID"
        value={memberId}
        onChange={(e) => {
          setMemberId(e.target.value);
          if (memberIdError) setMemberIdError(null);
          if (success) setSuccess(false);
        }}
        fullWidth
        size="small"
        error={!!memberIdError}
        helperText={memberIdError}
        inputProps={{ 'data-testid': 'member-id-input' }}
        sx={{ mb: 2 }}
      />

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Role
        </Typography>
        <Select
          value={roleCode}
          onChange={(e) => {
            setRoleCode(e.target.value);
            if (roleCodeError) setRoleCodeError(null);
            if (success) setSuccess(false);
          }}
          displayEmpty
          fullWidth
          size="small"
          error={!!roleCodeError}
          data-testid="staff-role-select"
          inputProps={{ 'data-testid': 'staff-role-select-input' }}
        >
          <MenuItem value="" disabled>
            Select a role
          </MenuItem>
          {STAFF_ROLE_OPTIONS.map((opt) => (
            <MenuItem
              key={opt.code}
              value={opt.code}
              data-testid={`staff-role-option-${opt.code}`}
            >
              {opt.label}
            </MenuItem>
          ))}
        </Select>
        {roleCodeError && (
          <Typography
            variant="caption"
            color="error"
            data-testid="role-code-error"
            sx={{ mt: 0.5, display: 'block' }}
          >
            {roleCodeError}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          onClick={onCancel}
          disabled={submitting}
          data-testid="staff-cancel-btn"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          data-testid="staff-submit-btn"
        >
          {submitting ? (
            <CircularProgress size={24} data-testid="loading-indicator" />
          ) : (
            'Assign Role'
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default StaffAssignmentForm;
