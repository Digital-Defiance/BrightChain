/**
 * EditProfileDialog Component
 *
 * A dialog that lets users edit their own profile fields: displayName, bio,
 * location, and websiteUrl. The bio field includes a live character count,
 * a markdown preview tab, and validation for length and image markdown.
 *
 * @remarks
 * Implements Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */

import { BrightHubStrings, IBaseUserProfile } from '@brightchain/brighthub-lib';
import {
  getCharacterCount,
  parseBioContent,
} from '@brightchain/brighthub-lib/lib/brighthub-lib';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** The fields that can be updated via the edit profile form */
export interface EditProfileUpdates {
  displayName: string;
  bio: string;
  location?: string;
  websiteUrl?: string;
}

/** Props for the EditProfileDialog component */
export interface EditProfileDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** The current user profile data to pre-populate the form */
  profile: IBaseUserProfile<string>;
  /** Maximum bio character length (from BRIGHTHUB_PROFILE_LENGTH) */
  bioMaxLength: number;
  /** Callback when the user saves changes */
  onSave: (updates: EditProfileUpdates) => Promise<void>;
  /** Callback when the dialog is closed/cancelled */
  onClose: () => void;
}

/** Tab indices for the bio editor */
const BIO_TAB_EDIT = 0;
const BIO_TAB_PREVIEW = 1;

/** Regex patterns for image markdown detection */
const INLINE_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/;
const REFERENCE_IMAGE_REGEX = /!\[([^\]]*)\]\[([^\]]*)\]/;

/**
 * EditProfileDialog
 *
 * Renders a MUI Dialog with fields for editing a user's profile.
 * The bio field has Edit/Preview tabs, a live character count, and
 * validation for length and image markdown syntax.
 */
export function EditProfileDialog({
  open,
  profile,
  bioMaxLength,
  onSave,
  onClose,
}: EditProfileDialogProps) {
  const { t } = useBrightHubTranslation();

  // ─── Form state ─────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // ─── UI state ───────────────────────────────────────────────────────────────
  const [bioTab, setBioTab] = useState<number>(BIO_TAB_EDIT);
  const [bioError, setBioError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // ─── Pre-populate fields when dialog opens ──────────────────────────────────
  useEffect(() => {
    if (open) {
      setDisplayName(profile.displayName ?? '');
      setBio(profile.bio ?? '');
      setLocation(profile.location ?? '');
      setWebsiteUrl(profile.websiteUrl ?? '');
      setBioTab(BIO_TAB_EDIT);
      setBioError('');
      setIsSaving(false);
    }
  }, [open, profile]);

  // ─── Derived values ─────────────────────────────────────────────────────────
  const charCount = getCharacterCount(bio, true);
  const isOverLimit = charCount > bioMaxLength;
  const isDisplayNameEmpty = displayName.trim() === '';

  // ─── Validation ─────────────────────────────────────────────────────────────
  function validateBio(): string {
    if (isOverLimit) {
      return t(BrightHubStrings.EditProfileDialog_ErrorBioTooLong, {
        MAX: String(bioMaxLength),
      });
    }
    if (INLINE_IMAGE_REGEX.test(bio) || REFERENCE_IMAGE_REGEX.test(bio)) {
      return t(BrightHubStrings.EditProfileDialog_ErrorBioContainsImage);
    }
    return '';
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleBioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBio(e.target.value);
    // Clear error as user types so they get live feedback on next submit
    if (bioError) {
      setBioError('');
    }
  };

  const handleSubmit = async () => {
    const validationError = validateBio();
    if (validationError) {
      setBioError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        bio,
        location: location || undefined,
        websiteUrl: websiteUrl || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Bio preview rendering ───────────────────────────────────────────────────
  let bioPreviewHtml = '';
  let bioPreviewError = '';
  if (bioTab === BIO_TAB_PREVIEW) {
    try {
      bioPreviewHtml = parseBioContent(bio, bioMaxLength);
    } catch (err) {
      bioPreviewError = err instanceof Error ? err.message : String(err);
    }
  }

  // ─── Submit button state ─────────────────────────────────────────────────────
  const isSubmitDisabled = isDisplayNameEmpty || isOverLimit || isSaving;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t(BrightHubStrings.EditProfileDialog_Title)}</DialogTitle>

      <DialogContent>
        {/* Display Name */}
        <TextField
          label={t(BrightHubStrings.EditProfileDialog_DisplayName)}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          fullWidth
          required
          margin="normal"
          inputProps={{
            'aria-label': t(BrightHubStrings.EditProfileDialog_DisplayName),
          }}
        />

        {/* Bio — Edit / Preview tabs */}
        <Box sx={{ mt: 2 }}>
          <Tabs
            value={bioTab}
            onChange={(_e, newValue: number) => setBioTab(newValue)}
            aria-label={t(BrightHubStrings.EditProfileDialog_Bio)}
          >
            <Tab label={t(BrightHubStrings.EditProfileDialog_Bio)} />
            <Tab label={t(BrightHubStrings.EditProfileDialog_BioPreview)} />
          </Tabs>

          {bioTab === BIO_TAB_EDIT && (
            <Box>
              <TextField
                value={bio}
                onChange={handleBioChange}
                placeholder={t(
                  BrightHubStrings.EditProfileDialog_BioPlaceholder,
                )}
                multiline
                minRows={4}
                fullWidth
                margin="normal"
                error={!!bioError || isOverLimit}
                helperText={bioError || undefined}
                inputProps={{
                  'aria-label': t(BrightHubStrings.EditProfileDialog_Bio),
                }}
              />
              {/* Live character count */}
              <Typography
                variant="caption"
                color={isOverLimit ? 'error' : 'text.secondary'}
                sx={{ display: 'block', textAlign: 'right' }}
              >
                {t(BrightHubStrings.EditProfileDialog_BioCharCountTemplate, {
                  CURRENT: String(charCount),
                  MAX: String(bioMaxLength),
                })}
              </Typography>
            </Box>
          )}

          {bioTab === BIO_TAB_PREVIEW && (
            <Box
              sx={{
                mt: 1,
                minHeight: 80,
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              {bioPreviewError ? (
                <Typography color="error" variant="body2">
                  {bioPreviewError}
                </Typography>
              ) : (
                <Box
                  dangerouslySetInnerHTML={{ __html: bioPreviewHtml }}
                  sx={{ wordBreak: 'break-word', '& p': { m: 0 } }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Location */}
        <TextField
          label={t(BrightHubStrings.EditProfileDialog_Location)}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          fullWidth
          margin="normal"
          inputProps={{
            'aria-label': t(BrightHubStrings.EditProfileDialog_Location),
          }}
        />

        {/* Website URL */}
        <TextField
          label={t(BrightHubStrings.EditProfileDialog_WebsiteUrl)}
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          fullWidth
          margin="normal"
          inputProps={{
            'aria-label': t(BrightHubStrings.EditProfileDialog_WebsiteUrl),
          }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          {t(BrightHubStrings.EditProfileDialog_Cancel)}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {isSaving
            ? t(BrightHubStrings.EditProfileDialog_Saving)
            : t(BrightHubStrings.EditProfileDialog_Save)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditProfileDialog;
