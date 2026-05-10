/**
 * EditPostDialog — Modal dialog for editing an existing post.
 * Shows a textarea pre-filled with the current content.
 * Enforces the 15-minute edit window on the frontend side.
 */
import { BrightHubStrings } from '@brightchain/brighthub-lib';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

export interface EditPostDialogProps {
  open: boolean;
  postId: string;
  currentContent: string;
  createdAt: string;
  onClose: () => void;
  onSave: (postId: string, newContent: string) => Promise<void>;
}

/** 15 minutes in milliseconds */
const EDIT_WINDOW_MS = 15 * 60 * 1000;

export function EditPostDialog({
  open,
  postId,
  currentContent,
  createdAt,
  onClose,
  onSave,
}: EditPostDialogProps) {
  const { t } = useBrightHubTranslation();
  const [content, setContent] = useState(currentContent);
  const [saving, setSaving] = useState(false);

  const elapsed = Date.now() - new Date(createdAt).getTime();
  const remaining = Math.max(0, EDIT_WINDOW_MS - elapsed);
  const minutesLeft = Math.ceil(remaining / 60000);
  const windowExpired = remaining <= 0;

  const handleSave = async () => {
    if (!content.trim() || windowExpired) return;
    setSaving(true);
    try {
      await onSave(postId, content);
      onClose();
    } catch {
      // Error handling done by caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Post</DialogTitle>
      <DialogContent>
        {windowExpired ? (
          <Typography color="error" sx={{ py: 2 }}>
            The 15-minute edit window has expired. This post can no longer be
            edited.
          </Typography>
        ) : (
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1, display: 'block' }}
            >
              {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''} remaining to
              edit
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              maxRows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={saving}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t(BrightHubStrings.CreateHub_Cancel)}
        </Button>
        {!windowExpired && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!content.trim() || saving || content === currentContent}
          >
            {saving ? (
              <CircularProgress size={20} />
            ) : (
              t(BrightHubStrings.HubManager_Save)
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default EditPostDialog;
