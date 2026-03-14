/**
 * MessagingInbox Component
 *
 * Displays conversation list sorted by recent activity with unread counts
 * and pinned conversations.
 *
 * @remarks
 * Implements Requirements 44.1, 61.4
 */

import type { BrightHubStringKey } from '@brightchain/brighthub-lib';
import { BrightHubStrings } from '@brightchain/brighthub-lib';
import type { IBaseConversation } from '@brightchain/brighthub-lib';
import { ConversationType } from '@brightchain/brighthub-lib';
import { Add, Group, PushPin } from '@mui/icons-material';
import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Extended conversation with inbox metadata */
export interface InboxConversation extends IBaseConversation<string> {
  /** Number of unread messages */
  unreadCount: number;
  /** Whether this conversation is pinned */
  isPinned: boolean;
  /** Display name for the conversation */
  displayName: string;
}

/** Props for the MessagingInbox component */
export interface MessagingInboxProps {
  /** Conversations to display */
  conversations: InboxConversation[];
  /** Whether data is loading */
  loading?: boolean;
  /** Currently selected conversation ID */
  selectedId?: string;
  /** Callback when a conversation is selected */
  onSelect?: (conversationId: string) => void;
  /** Callback to start a new conversation */
  onNewConversation?: () => void;
}

/**
 * MessagingInbox
 *
 * Conversation list with pinned items at top, sorted by recent activity.
 */
export function MessagingInbox({
  conversations,
  loading = false,
  selectedId,
  onSelect,
  onNewConversation,
}: MessagingInboxProps) {
  const { t } = useBrightHubTranslation();

  const pinned = conversations.filter((c) => c.isPinned);
  const unpinned = conversations.filter((c) => !c.isPinned);

  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        aria-label={t(BrightHubStrings.MessagingInbox_AriaLabel)}
      >
        <CircularProgress
          aria-label={t(BrightHubStrings.MessagingInbox_Loading)}
        />
      </Box>
    );
  }

  return (
    <Box aria-label={t(BrightHubStrings.MessagingInbox_AriaLabel)}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
          px: 2,
          pt: 1,
        }}
      >
        <Typography variant="h6">
          {t(BrightHubStrings.MessagingInbox_Title)}
        </Typography>
        <Button
          size="small"
          startIcon={<Add />}
          onClick={onNewConversation}
          aria-label={t(BrightHubStrings.MessagingInbox_NewConversation)}
        >
          {t(BrightHubStrings.MessagingInbox_NewConversation)}
        </Button>
      </Box>

      {/* Empty state */}
      {conversations.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
          <Typography variant="body1" color="text.secondary">
            {t(BrightHubStrings.MessagingInbox_EmptyState)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t(BrightHubStrings.MessagingInbox_EmptyStateHint)}
          </Typography>
        </Box>
      )}

      <List disablePadding>
        {/* Pinned conversations */}
        {pinned.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                <PushPin
                  sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }}
                />
                {t(BrightHubStrings.MessagingInbox_Pinned)}
              </Typography>
            </Box>
            {pinned.map((conv) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                selected={conv._id === selectedId}
                onSelect={onSelect}
                t={t}
              />
            ))}
            <Divider />
          </>
        )}

        {/* Regular conversations */}
        {unpinned.map((conv) => (
          <ConversationItem
            key={conv._id}
            conversation={conv}
            selected={conv._id === selectedId}
            onSelect={onSelect}
            t={t}
          />
        ))}
      </List>
    </Box>
  );
}

function ConversationItem({
  conversation,
  selected,
  onSelect,
  t,
}: {
  conversation: InboxConversation;
  selected: boolean;
  onSelect?: (id: string) => void;
  t: (key: BrightHubStringKey, vars?: Record<string, string>) => string;
}) {
  return (
    <ListItemButton
      selected={selected}
      onClick={() => onSelect?.(conversation._id)}
      data-testid={`conversation-${conversation._id}`}
    >
      <ListItemAvatar>
        <Badge
          badgeContent={conversation.unreadCount}
          color="error"
          max={99}
          invisible={conversation.unreadCount === 0}
        >
          <Avatar src={conversation.avatarUrl}>
            {conversation.type === ConversationType.Group ? (
              <Group />
            ) : (
              conversation.displayName.charAt(0).toUpperCase()
            )}
          </Avatar>
        </Badge>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2" noWrap>
              {conversation.displayName}
            </Typography>
            {conversation.type === ConversationType.Group && (
              <Typography variant="caption" color="text.secondary">
                {t(BrightHubStrings.MessagingInbox_GroupBadge)}
              </Typography>
            )}
          </Box>
        }
        secondary={conversation.lastMessagePreview}
        secondaryTypographyProps={{ noWrap: true }}
      />
    </ListItemButton>
  );
}

export default MessagingInbox;
