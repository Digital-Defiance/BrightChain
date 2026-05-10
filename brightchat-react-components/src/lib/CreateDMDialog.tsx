/**
 * CreateDMDialog — MUI Dialog for initiating a new direct message conversation.
 *
 * Provides a searchable user list with debounced input. Checks for existing
 * conversations before creating duplicates.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  ChangeEvent,
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { filterUsersByQuery } from './CreateDMDialog.helpers';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DMUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface DMConversation {
  id: string;
  participantIds: string[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface CreateDMDialogProps {
  open: boolean;
  onClose: () => void;
  onConversationStarted: (conversationId: string) => void;
  /** Current user ID for deduplication check */
  currentUserId: string;
  /** Available users to message */
  users: DMUser[];
  /** Existing conversations for deduplication */
  existingConversations: DMConversation[];
  /** API call to send a DM. Returns the conversation ID. */
  sendDirectMessage: (recipientId: string) => Promise<string>;
  /** Optional callback to search users server-side. Called with the debounced query. */
  onSearchUsers?: (query: string) => void;
}

const DEBOUNCE_MS = 300;

const CreateDMDialog: FC<CreateDMDialogProps> = ({
  open,
  onClose,
  onConversationStarted,
  currentUserId,
  users,
  existingConversations,
  sendDirectMessage,
  onSearchUsers,
}) => {
  const { tBranded: t } = useI18n();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Trigger server-side search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    onSearchUsers?.(debouncedQuery);
  }, [debouncedQuery, onSearchUsers]);

  const filteredUsers = useMemo(
    () => filterUsersByQuery(users, debouncedQuery),
    [users, debouncedQuery],
  );

  const handleQueryChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setError(null);
  }, []);

  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setError(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedUserId) {
      setError(t(BrightChatStrings.Create_DM_SelectUser));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Check for existing conversation (Requirement 6.4)
      const existing = existingConversations.find(
        (conv) =>
          conv.participantIds.includes(currentUserId) &&
          conv.participantIds.includes(selectedUserId) &&
          conv.participantIds.length === 2,
      );

      if (existing) {
        onConversationStarted(existing.id);
        handleClose();
        return;
      }

      const conversationId = await sendDirectMessage(selectedUserId);
      onConversationStarted(conversationId);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(BrightChatStrings.Create_DM_Failed),
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedUserId,
    existingConversations,
    currentUserId,
    sendDirectMessage,
    onConversationStarted,
    t,
  ]);

  const handleClose = useCallback(() => {
    if (!submitting) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedUserId(null);
      setError(null);
      onClose();
    }
  }, [submitting, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="create-dm-dialog-title"
    >
      <DialogTitle id="create-dm-dialog-title">
        {t(BrightChatStrings.Create_DM_Title)}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label={t(BrightChatStrings.Create_DM_SearchLabel)}
          value={query}
          onChange={handleQueryChange}
          disabled={submitting}
          placeholder={t(BrightChatStrings.Create_DM_SearchHint)}
        />
        <List dense sx={{ maxHeight: 300, overflow: 'auto', mt: 1 }}>
          {filteredUsers.map((user) => (
            <ListItemButton
              key={user.id}
              selected={user.id === selectedUserId}
              onClick={() => handleSelectUser(user.id)}
            >
              <ListItemAvatar>
                <Avatar src={user.avatarUrl} alt={user.displayName}>
                  {user.displayName.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={user.displayName} />
            </ListItemButton>
          ))}
          {filteredUsers.length === 0 && debouncedQuery && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 2, py: 1 }}
            >
              {t(BrightChatStrings.Create_DM_NoUsersFound)}
            </Typography>
          )}
        </List>
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {t(BrightChatStrings.Create_DM_Cancel)}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={submitting || !selectedUserId}
        >
          {submitting
            ? t(BrightChatStrings.Create_DM_Starting)
            : t(BrightChatStrings.Create_DM_StartConversation)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(CreateDMDialog);
