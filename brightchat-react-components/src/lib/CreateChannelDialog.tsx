/**
 * CreateChannelDialog — Dialog for creating a new channel within a server.
 *
 * Allows setting channel name, topic, visibility, and category assignment.
 * Only visible to users with admin/owner roles.
 *
 * Requirements: 7.1, 7.5
 */
import type { IServerCategory } from '@brightchain/brightchain-lib';
import { ChannelVisibility } from '@brightchain/brightchain-lib';
import type { CreateChannelParams } from '@brightchain/brightchat-lib';
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

export interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (channel: { id: string; name: string }) => void;
  createChannel: (
    params: CreateChannelParams,
  ) => Promise<{ id: string; name: string }>;
  serverId: string;
  categories: IServerCategory[];
  initialCategoryId?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

const CreateChannelDialog: FC<CreateChannelDialogProps> = ({
  open,
  onClose,
  onCreated,
  createChannel,
  serverId,
  categories,
  initialCategoryId,
}) => {
  const { tBranded: t } = useI18n();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [visibility, setVisibility] = useState<ChannelVisibility>(
    ChannelVisibility.PUBLIC,
  );
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setTopic('');
    setVisibility(ChannelVisibility.PUBLIC);
    setCategoryId(initialCategoryId ?? '');
    setError(null);
  }, [initialCategoryId]);

  // Sync initialCategoryId when dialog opens or prop changes
  useEffect(() => {
    if (open) {
      setCategoryId(initialCategoryId ?? '');
    }
  }, [open, initialCategoryId]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t(BrightChatStrings.Create_Channel_NameRequired));
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 100) {
      setError(t(BrightChatStrings.Create_Channel_NameLength));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const channel = await createChannel({
        name: trimmed,
        topic: topic.trim() || undefined,
        visibility,
        serverId,
        categoryId: categoryId || undefined,
      });
      onCreated(channel);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(BrightChatStrings.Create_Channel_Failed),
      );
    } finally {
      setSaving(false);
    }
  }, [
    name,
    topic,
    visibility,
    serverId,
    categoryId,
    createChannel,
    onCreated,
    handleClose,
  ]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      data-testid="create-channel-dialog"
    >
      <DialogTitle>{t(BrightChatStrings.Create_Channel_Title)}</DialogTitle>
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
          label={t(BrightChatStrings.Create_Channel_NameLabel)}
          placeholder={t(BrightChatStrings.Create_Channel_NamePlaceholder)}
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
          label={t(BrightChatStrings.Create_Channel_TopicLabel)}
          placeholder={t(BrightChatStrings.Create_Channel_TopicPlaceholder)}
          value={topic}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setTopic(e.target.value)
          }
          fullWidth
          size="small"
          multiline
          maxRows={3}
        />

        <FormControl fullWidth size="small">
          <InputLabel>
            {t(BrightChatStrings.Create_Channel_VisibilityLabel)}
          </InputLabel>
          <Select
            value={visibility}
            label={t(BrightChatStrings.Create_Channel_VisibilityLabel)}
            onChange={(e: SelectChangeEvent) =>
              setVisibility(e.target.value as ChannelVisibility)
            }
          >
            <MenuItem value={ChannelVisibility.PUBLIC}>
              {`${t(BrightChatStrings.Channel_Visibility_Public)} — ${t(BrightChatStrings.Channel_Visibility_Public_Desc)}`}
            </MenuItem>
            <MenuItem value={ChannelVisibility.PRIVATE}>
              {`${t(BrightChatStrings.Channel_Visibility_Private)} — ${t(BrightChatStrings.Channel_Visibility_Private_Desc)}`}
            </MenuItem>
            <MenuItem value={ChannelVisibility.SECRET}>
              {`${t(BrightChatStrings.Channel_Visibility_Secret)} — ${t(BrightChatStrings.Channel_Visibility_Secret_Desc)}`}
            </MenuItem>
          </Select>
        </FormControl>

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
          {t(BrightChatStrings.Create_Channel_Cancel)}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || !name.trim()}
        >
          {saving
            ? t(BrightChatStrings.Create_Channel_Creating)
            : t(BrightChatStrings.Create_Channel_Submit)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(CreateChannelDialog);
