/**
 * OrganizationCreateDialog — Modal dialog for creating a new Organization.
 *
 * Displays a form with a required name field and optional contact fields
 * (phone, email, address). Validates that the name is non-empty before
 * submitting. On success, closes the dialog, calls `onCreated`, and
 * triggers `refetchRoles()` so the new ADMIN role appears in the
 * RoleSwitcher.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 11.1
 *
 * @module organizations/components/OrganizationCreateDialog
 */

import type {
  IAddress,
  IContactPoint,
  IOrganization,
} from '@brightchain/brightchart-lib';
import { ContactPointSystem } from '@brightchain/brightchart-lib';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import React, { useCallback, useState } from 'react';
import { useActiveContext } from '../../shell/contexts/ActiveContext';
import { useOrgApi } from '../hooks/useOrgApi';

export interface OrganizationCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (org: IOrganization) => void;
}

export const OrganizationCreateDialog: React.FC<
  OrganizationCreateDialogProps
> = ({ open, onClose, onCreated }) => {
  const orgApi = useOrgApi();
  const { refetchRoles } = useActiveContext();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Validates the name field. Returns true if valid.
   */
  const validateName = useCallback((value: string): boolean => {
    if (!value || value.trim().length === 0) {
      setNameError('Organization name is required');
      return false;
    }
    setNameError(null);
    return true;
  }, []);

  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNameError(null);
    setServerError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  }, [submitting, resetForm, onClose]);

  const handleSubmit = useCallback(async () => {
    setServerError(null);

    if (!validateName(name)) {
      return;
    }

    setSubmitting(true);
    try {
      const telecom: IContactPoint[] = [];
      if (phone.trim()) {
        telecom.push({ system: ContactPointSystem.Phone, value: phone.trim() });
      }
      if (email.trim()) {
        telecom.push({ system: ContactPointSystem.Email, value: email.trim() });
      }

      const addressArr: IAddress[] = [];
      if (address.trim()) {
        addressArr.push({ text: address.trim() });
      }

      const org = await orgApi.createOrganization({
        name: name.trim(),
        ...(telecom.length > 0 ? { telecom } : {}),
        ...(addressArr.length > 0 ? { address: addressArr } : {}),
      });

      resetForm();
      onClose();
      onCreated(org);
      refetchRoles?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    name,
    phone,
    email,
    address,
    orgApi,
    validateName,
    resetForm,
    onClose,
    onCreated,
    refetchRoles,
  ]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      data-testid="org-create-dialog"
      aria-labelledby="org-create-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="org-create-dialog-title">
        Create Organization
      </DialogTitle>
      <DialogContent>
        {serverError && (
          <Alert severity="error" data-testid="server-error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}
        <TextField
          autoFocus
          required
          margin="dense"
          label="Organization Name"
          fullWidth
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          error={!!nameError}
          helperText={nameError}
          inputProps={{ 'data-testid': 'org-name-input' }}
          data-testid="org-name-field"
        />
        <TextField
          margin="dense"
          label="Phone"
          fullWidth
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputProps={{ 'data-testid': 'org-phone-input' }}
        />
        <TextField
          margin="dense"
          label="Email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputProps={{ 'data-testid': 'org-email-input' }}
        />
        <TextField
          margin="dense"
          label="Address"
          fullWidth
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          inputProps={{ 'data-testid': 'org-address-input' }}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={submitting}
          data-testid="cancel-btn"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          data-testid="submit-btn"
        >
          {submitting ? (
            <CircularProgress size={24} data-testid="loading-indicator" />
          ) : (
            'Create'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrganizationCreateDialog;
