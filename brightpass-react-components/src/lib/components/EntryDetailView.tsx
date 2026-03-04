/**
 * EntryDetailView — Displays a single decrypted vault entry's fields.
 *
 * - Fetches the full decrypted entry via BrightPassApiService.getEntry()
 * - Displays all fields based on entry type
 * - Masks sensitive fields (password, cardNumber, cvv) by default with toggle
 * - For login entries, checks breach status automatically
 * - Provides "Edit" and "Delete" actions
 *
 * Requirements: 4.3, 4.4, 4.8, 4.9, 8.5
 */

import type {
  CreditCardEntry,
  IBreachCheckResult,
  IdentityEntry,
  LoginEntry,
  SecureNoteEntry,
  VaultEntry,
} from '@brightchain/brightchain-lib';
import { BrightPassStrings } from '@brightchain/brightchain-lib';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useBrightPassApi } from '../hooks/useBrightPassApi';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

export interface EntryDetailViewProps {
  vaultId: string;
  entryId: string;
  onEdit?: (entry: VaultEntry) => void;
  onDelete?: () => void;
}

const MASK = '••••••••';

const EntryDetailView: React.FC<EntryDetailViewProps> = ({
  vaultId,
  entryId,
  onEdit,
  onDelete,
}) => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();

  const [entry, setEntry] = useState<VaultEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which sensitive fields are revealed
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());

  // Breach check state (login entries only)
  const [breachResult, setBreachResult] = useState<IBreachCheckResult | null>(
    null,
  );
  const [breachLoading, setBreachLoading] = useState(false);

  // Delete confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch entry on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    brightPassApi
      .getEntry(vaultId, entryId)
      .then((data) => {
        if (!cancelled) {
          setEntry(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? t(BrightPassStrings.Error_Generic));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [vaultId, entryId, t]);

  // Auto-check breach status for login entries
  useEffect(() => {
    if (!entry || entry.type !== 'login') return;

    let cancelled = false;
    setBreachLoading(true);

    brightPassApi
      .checkBreach(entry.password)
      .then((result) => {
        if (!cancelled) {
          setBreachResult(result);
        }
      })
      .catch(() => {
        // Silently ignore breach check failures
      })
      .finally(() => {
        if (!cancelled) {
          setBreachLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entry]);

  const toggleField = useCallback((fieldName: string) => {
    setRevealedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await brightPassApi.deleteEntry(vaultId, entryId);
      setShowDeleteConfirm(false);
      onDelete?.();
    } catch (err) {
      const message =
        (err as { message?: string })?.message ??
        t(BrightPassStrings.Error_Generic);
      setError(message);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }, [vaultId, entryId, onDelete, t]);

  /** Renders a read-only text field. */
  const renderField = (label: string, value: string | undefined) => {
    if (value === undefined || value === '') return null;
    return (
      <TextField
        label={label}
        value={value}
        fullWidth
        margin="dense"
        slotProps={{ input: { readOnly: true } }}
      />
    );
  };

  /** Renders a sensitive field with mask/reveal toggle. */
  const renderSensitiveField = (
    label: string,
    value: string,
    fieldName: string,
  ) => {
    const isRevealed = revealedFields.has(fieldName);
    return (
      <TextField
        label={label}
        value={isRevealed ? value : MASK}
        fullWidth
        margin="dense"
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={
                    isRevealed
                      ? t(BrightPassStrings.EntryDetail_HidePassword)
                      : t(BrightPassStrings.EntryDetail_ShowPassword)
                  }
                  onClick={() => toggleField(fieldName)}
                  edge="end"
                >
                  {isRevealed ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
    );
  };

  /** Renders type-specific fields for a login entry. */
  const renderLoginFields = (e: LoginEntry) => (
    <>
      {renderField(t(BrightPassStrings.EntryDetail_SiteUrl), e.siteUrl)}
      {renderField(t(BrightPassStrings.EntryDetail_Username), e.username)}
      {renderSensitiveField(
        t(BrightPassStrings.EntryDetail_Password),
        e.password,
        'password',
      )}
      {e.totpSecret &&
        renderField(t(BrightPassStrings.EntryDetail_TotpSecret), e.totpSecret)}
    </>
  );

  /** Renders type-specific fields for a secure note entry. */
  const renderSecureNoteFields = (e: SecureNoteEntry) => (
    <>{renderField(t(BrightPassStrings.EntryDetail_Content), e.content)}</>
  );

  /** Renders type-specific fields for a credit card entry. */
  const renderCreditCardFields = (e: CreditCardEntry) => (
    <>
      {renderField(
        t(BrightPassStrings.EntryDetail_CardholderName),
        e.cardholderName,
      )}
      {renderSensitiveField(
        t(BrightPassStrings.EntryDetail_CardNumber),
        e.cardNumber,
        'cardNumber',
      )}
      {renderField(
        t(BrightPassStrings.EntryDetail_ExpirationDate),
        e.expirationDate,
      )}
      {renderSensitiveField(t(BrightPassStrings.EntryDetail_CVV), e.cvv, 'cvv')}
    </>
  );

  /** Renders type-specific fields for an identity entry. */
  const renderIdentityFields = (e: IdentityEntry) => (
    <>
      {renderField(t(BrightPassStrings.EntryDetail_FirstName), e.firstName)}
      {renderField(t(BrightPassStrings.EntryDetail_LastName), e.lastName)}
      {renderField(t(BrightPassStrings.EntryDetail_Email), e.email)}
      {renderField(t(BrightPassStrings.EntryDetail_Phone), e.phone)}
      {renderField(t(BrightPassStrings.EntryDetail_Address), e.address)}
    </>
  );

  /** Renders the type-specific fields based on entry type. */
  const renderEntryFields = (e: VaultEntry) => {
    switch (e.type) {
      case 'login':
        return renderLoginFields(e);
      case 'secure_note':
        return renderSecureNoteFields(e);
      case 'credit_card':
        return renderCreditCardFields(e);
      case 'identity':
        return renderIdentityFields(e);
      default:
        return null;
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  // --- No entry ---
  if (!entry) {
    return null;
  }

  return (
    <Box>
      {/* Header with title and actions */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" component="h2">
          {entry.title}
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => onEdit?.(entry)}
          >
            {t(BrightPassStrings.EntryDetail_Edit)}
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t(BrightPassStrings.EntryDetail_Delete)}
          </Button>
        </Box>
      </Box>

      {/* Breach status indicator for login entries */}
      {entry.type === 'login' && !breachLoading && breachResult && (
        <Alert
          severity={breachResult.breached ? 'warning' : 'success'}
          sx={{ mb: 2 }}
        >
          {breachResult.breached
            ? t(BrightPassStrings.EntryDetail_BreachWarning, {
                COUNT: String(breachResult.count),
              })
            : t(BrightPassStrings.EntryDetail_BreachSafe)}
        </Alert>
      )}
      {entry.type === 'login' && breachLoading && (
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            {t(BrightPassStrings.Breach_Check)}
          </Typography>
        </Box>
      )}

      {/* Type-specific fields */}
      {renderEntryFields(entry)}

      {/* Common fields */}
      {renderField(t(BrightPassStrings.EntryDetail_Notes), entry.notes)}

      {entry.tags && entry.tags.length > 0 && (
        <Box mt={1} mb={1}>
          <Typography variant="caption" color="text.secondary">
            {t(BrightPassStrings.EntryDetail_Tags)}
          </Typography>
          <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
            {entry.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
      )}

      <Box display="flex" gap={2} mt={2}>
        <Typography variant="caption" color="text.secondary">
          {t(BrightPassStrings.EntryDetail_CreatedAt)}:{' '}
          {new Date(entry.createdAt).toLocaleString()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t(BrightPassStrings.EntryDetail_UpdatedAt)}:{' '}
          {new Date(entry.updatedAt).toLocaleString()}
        </Typography>
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {t(BrightPassStrings.EntryDetail_ConfirmDelete)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightPassStrings.EntryDetail_ConfirmDeleteMessage)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowDeleteConfirm(false)}
            disabled={deleting}
          >
            {t(BrightPassStrings.EntryDetail_Cancel)}
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? (
              <CircularProgress size={20} />
            ) : (
              t(BrightPassStrings.EntryDetail_Delete)
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntryDetailView;
