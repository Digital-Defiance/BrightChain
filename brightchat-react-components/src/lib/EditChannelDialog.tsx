/**
 * EditChannelDialog — Dialog for renaming a channel, updating its topic,
 * and changing its category assignment.
 *
 * Requirements: 7.1, 7.5
 */
import type {
  IChannel,
  IChannelUpdate,
  IServerCategory,
} from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ChangeEvent, FC, memo, useCallback, useEffect, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EditChannelDialogProps {
  open: boolean;
  channel: IChannel | null;
  categories: IServerCategory[];
  currentCategoryId: string;
  onClose: () => void;
  onUpdated: (channel: IChannel, newCategoryId: string) => void;
  updateChannel: (
    channelId: string,
    params: IChannelUpdate,
  ) => Promise<IChannel>;
}

// ─── Component ──────────────────────────────────────────────────────────────

const EditChannelDialog: FC<EditChannelDialogProps> = ({
  open,
  channel,
  categories,
  currentCategoryId,
  onClose,
  onUpdated,
  updateChannel,
}) => {
  const { tBranded: t } = useI18n();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form state when dialog opens or channel changes
  useEffect(() => {
    if (open && channel) {
      setName(channel.name);
      setTopic(channel.topic ?? '');
      setCategoryId(currentCategoryId);
      setError(null);
    }
  }, [open, channel, currentCategoryId]);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t(BrightChatStrings.Edit_Channel_NameRequired));
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 100) {
      setError(t(BrightChatStrings.Edit_Channel_NameLength));
      return;
    }
    if (!channel) return;

    setSaving(true);
    setError(null);

    try {
      const updates: IChannelUpdate = {};
      if (trimmed !== channel.name) updates.name = trimmed;
      const trimmedTopic = topic.trim();
      if (trimmedTopic !== (channel.topic ?? '')) updates.topic = trimmedTopic;

      const updated = await updateChannel(channel.id, updates);
      onUpdated(updated, categoryId);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(BrightChatStrings.Edit_Channel_Failed),
      );
    } finally {
      setSaving(false);
    }
  }, [
    name,
    topic,
    categoryId,
    channel,
    updateChannel,
    onUpdated,
    handleClose,
    t,
  ]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      data-testid="edit-channel-dialog"
    >
      <DialogTitle>{t(BrightChatStrings.Edit_Channel_Title)}</DialogTitle>
      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
      >
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
        <TextField
          autoFocus
          label={t(BrightChatStrings.Edit_Channel_NameLabel)}
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
          fullWidth
          required
          size="small"
          inputProps={{ maxLength: 100 }}
          sx={{ mt: 1 }}
        />
        <TextField
          label={t(BrightChatStrings.Edit_Channel_TopicLabel)}
          value={topic}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setTopic(e.target.value)
          }
          fullWidth
          size="small"
          multiline
          maxRows={3}
        />
        {categories.length > 0 && (
          <FormControl fullWidth size="small">
            <InputLabel>
              {t(BrightChatStrings.Create_Channel_CategoryLabel)}
            </InputLabel>
            <Select
              value={categoryId}
              label={t(BrightChatStrings.Create_Channel_CategoryLabel)}
              onChange={(e: SelectChangeEvent) => setCategoryId(e.target.value)}
            >
              <MenuItem value="">
                <em>{t(BrightChatStrings.Create_Channel_CategoryNone)}</em>
              </MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          {t(BrightChatStrings.Edit_Channel_Cancel)}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || !name.trim()}
        >
          {saving
            ? t(BrightChatStrings.Edit_Channel_Saving)
            : t(BrightChatStrings.Edit_Channel_Save)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(EditChannelDialog);
