/**
 * ConnectionNoteEditor Component
 *
 * Add, edit, and delete private notes on connections with a 500 character limit.
 *
 * @remarks
 * Implements Requirements 35.4, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { IBaseConnectionNote } from '@brightchain/brighthub-lib';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

const MAX_NOTE_LENGTH = 500;

/** Props for the ConnectionNoteEditor component */
export interface ConnectionNoteEditorProps {
  /** Existing note to edit, or undefined for new note */
  note?: IBaseConnectionNote<string>;
  /** Callback when the user saves a note */
  onSave: (text: string) => void;
  /** Callback when the user deletes the note */
  onDelete?: () => void;
  /** Whether save/delete operations are in progress */
  disabled?: boolean;
}

/**
 * ConnectionNoteEditor
 *
 * Text area with character counter, save button, and delete with confirmation.
 * Shows an empty-state prompt when no note exists.
 */
export function ConnectionNoteEditor({
  note,
  onSave,
  onDelete,
  disabled = false,
}: ConnectionNoteEditorProps) {
  const { t } = useBrightHubTranslation();
  const [text, setText] = useState(note?.note ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_NOTE_LENGTH;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (disabled || isOverLimit || text.trim().length === 0) return;
    onSave(text);
  }, [disabled, isOverLimit, text, onSave]);

  const handleDeleteClick = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setConfirmOpen(false);
    onDelete?.();
  }, [onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  return (
    <Box data-testid="connection-note-editor">
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {t(BrightHubStrings.ConnectionNoteEditor_Title)}
      </Typography>

      {!note && text.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          data-testid="note-empty-state"
          sx={{ mb: 1 }}
        >
          {t(BrightHubStrings.ConnectionNoteEditor_EmptyState)}
        </Typography>
      ) : null}

      <TextField
        multiline
        minRows={3}
        maxRows={6}
        fullWidth
        value={text}
        onChange={handleChange}
        disabled={disabled}
        placeholder={t(BrightHubStrings.ConnectionNoteEditor_Placeholder)}
        error={isOverLimit}
        inputProps={{
          'data-testid': 'note-textarea',
          'aria-label': t(BrightHubStrings.ConnectionNoteEditor_AriaLabel),
        }}
        sx={{ mb: 0.5 }}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="caption"
          color={isOverLimit ? 'error' : 'text.secondary'}
          data-testid="char-count"
        >
          {charCount}/{MAX_NOTE_LENGTH}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {note && onDelete && (
            <Button
              size="small"
              color="error"
              onClick={handleDeleteClick}
              disabled={disabled}
              data-testid="delete-note-button"
            >
              {t(BrightHubStrings.ConnectionNoteEditor_Delete)}
            </Button>
          )}
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={disabled || isOverLimit || text.trim().length === 0}
            data-testid="save-note-button"
          >
            {t(BrightHubStrings.ConnectionNoteEditor_Save)}
          </Button>
        </Box>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={handleDeleteCancel}
        data-testid="delete-confirm-dialog"
      >
        <DialogTitle>
          {t(BrightHubStrings.ConnectionNoteEditor_DeleteConfirmTitle)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightHubStrings.ConnectionNoteEditor_DeleteConfirmMessage)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            data-testid="delete-cancel-button"
          >
            {t(BrightHubStrings.ConnectionNoteEditor_Cancel)}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            data-testid="delete-confirm-button"
          >
            {t(BrightHubStrings.ConnectionNoteEditor_DeleteConfirmAction)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ConnectionNoteEditor;
