/**
 * CreateVaultDialog — Form dialog for creating a new vault.
 *
 * Requires vault name and master password. On submit, calls
 * `brightPassApiService.createVault()` and refreshes the vault list.
 * On error, displays an i18n error message and keeps the dialog open.
 *
 * Requirements: 3.6, 3.7
 */

import { VALIDATION } from '@brightchain/brightchain-lib';
import { BrightPassStrings } from '@brightchain/brightpass-lib';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useFormik } from 'formik';
import React, { useState } from 'react';
import * as Yup from 'yup';
import { useBrightPassApi } from '../hooks/useBrightPassApi';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

export interface CreateVaultDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback to close the dialog. */
  onClose: () => void;
  /** Callback invoked after a vault is successfully created (e.g. to refresh the vault list). */
  onVaultCreated: () => void;
}

const CreateVaultDialog: React.FC<CreateVaultDialogProps> = ({
  open,
  onClose,
  onVaultCreated,
}) => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();
  const [error, setError] = useState<string | null>(null);

  const validationSchema = Yup.object({
    name: Yup.string()
      .min(
        VALIDATION.VAULT_NAME_MIN_LENGTH,
        t(BrightPassStrings.Validation_VaultNameMinLengthTemplate, {
          MIN_LENGTH: String(VALIDATION.VAULT_NAME_MIN_LENGTH),
        })
      )
      .max(
        VALIDATION.VAULT_NAME_MAX_LENGTH,
        t(BrightPassStrings.Validation_VaultNameMaxLengthTemplate, {
          MAX_LENGTH: String(VALIDATION.VAULT_NAME_MAX_LENGTH),
        })
      )
      .required(t(BrightPassStrings.Validation_VaultNameRequired)),
    masterPassword: Yup.string()
      .min(
        VALIDATION.PASSWORD_MIN_LENGTH,
        t(BrightPassStrings.Validation_PasswordMinLengthTemplate, {
          MIN_LENGTH: String(VALIDATION.PASSWORD_MIN_LENGTH),
        })
      )
      .matches(/[A-Z]/, t(BrightPassStrings.Validation_PasswordUppercase))
      .matches(/[a-z]/, t(BrightPassStrings.Validation_PasswordLowercase))
      .matches(/[0-9]/, t(BrightPassStrings.Validation_PasswordNumber))
      .matches(/[^A-Za-z0-9]/, t(BrightPassStrings.Validation_PasswordSpecialChar))
      .required(t(BrightPassStrings.Validation_PasswordRequired)),
    confirmMasterPassword: Yup.string()
      .oneOf([Yup.ref('masterPassword')], t(BrightPassStrings.VaultList_PasswordsMustMatch))
      .required(t(BrightPassStrings.Validation_ConfirmPasswordRequired)),
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      masterPassword: '',
      confirmMasterPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setError(null);
      try {
        await brightPassApi.createVault(values.name, values.masterPassword);
        formik.resetForm();
        onVaultCreated();
        onClose();
      } catch {
        setError(t(BrightPassStrings.Error_Generic));
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t(BrightPassStrings.VaultList_CreateVault)}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          margin="dense"
          label={t(BrightPassStrings.VaultList_CreateVaultName)}
          fullWidth
          variant="outlined"
          name="name"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.name && Boolean(formik.errors.name)}
          helperText={formik.touched.name && formik.errors.name}
        />
        <TextField
          margin="dense"
          label={t(BrightPassStrings.VaultList_EnterMasterPassword)}
          aria-label={t(BrightPassStrings.VaultList_EnterMasterPassword)}
          type="password"
          fullWidth
          variant="outlined"
          name="masterPassword"
          value={formik.values.masterPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.masterPassword && Boolean(formik.errors.masterPassword)}
          helperText={formik.touched.masterPassword && formik.errors.masterPassword}
        />
        <TextField
          margin="dense"
          label={t(BrightPassStrings.VaultList_ConfirmMasterPassword)}
          aria-label={t(BrightPassStrings.VaultList_ConfirmMasterPassword)}
          type="password"
          fullWidth
          variant="outlined"
          name="confirmMasterPassword"
          value={formik.values.confirmMasterPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.confirmMasterPassword && Boolean(formik.errors.confirmMasterPassword)}
          helperText={formik.touched.confirmMasterPassword && formik.errors.confirmMasterPassword}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {t(BrightPassStrings.VaultList_Cancel)}
        </Button>
        <Button
          onClick={() => formik.handleSubmit()}
          variant="contained"
          disabled={formik.isSubmitting || !formik.isValid || !formik.dirty}
        >
          {t(BrightPassStrings.VaultList_CreateVault)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateVaultDialog;
