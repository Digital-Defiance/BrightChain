/**
 * DMSidebar — 240px panel listing Direct Messages and Group DMs
 * when the user is in "Home" mode (no server selected).
 *
 * Mirrors the ChannelSidebar layout but shows DM conversations
 * and group chats instead of server channels. Styled like Discord's
 * Home sidebar with a "New Message" button and collapsible sections.
 *
 * Requirements: 3.1, 4.1, 6.1
 */
import type { IConversation, IGroup } from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import {
  useAuth,
  useI18n,
} from '@digitaldefiance/express-suite-react-components';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupIcon from '@mui/icons-material/Group';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { FC, memo, useCallback, useMemo, useState } from 'react';

import { CHANNEL_SIDEBAR_WIDTH } from './ChannelSidebar';
import { useUserNames } from './hooks/useUserNames';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DMSidebarProps {
  conversations: IConversation[];
  groups: IGroup[];
  activeConversationId: string | null;
  activeGroupId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onGroupSelect: (groupId: string) => void;
  onNewMessage: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getOtherParticipantId(
  conversation: IConversation,
  currentUserId?: string,
): string {
  const [first, second] = conversation.participants;
  if (currentUserId) {
    return first === currentUserId ? second : first;
  }
  return first || second || 'Unknown';
}

// ─── Component ──────────────────────────────────────────────────────────────

const DMSidebar: FC<DMSidebarProps> = ({
  conversations,
  groups,
  activeConversationId,
  activeGroupId,
  onConversationSelect,
  onGroupSelect,
  onNewMessage,
}) => {
  const { tBranded: t } = useI18n();
  const { userData } = useAuth();
  const [dmExpanded, setDmExpanded] = useState(true);
  const [groupsExpanded, setGroupsExpanded] = useState(true);

  // Collect all other-participant IDs for batch name resolution
  const participantIds = useMemo(
    () =>
      conversations.map((conv) => getOtherParticipantId(conv, userData?.id)),
    [conversations, userData?.id],
  );
  const userNames = useUserNames(participantIds);

  const toggleDm = useCallback(() => setDmExpanded((p) => !p), []);
  const toggleGroups = useCallback(() => setGroupsExpanded((p) => !p), []);

  return (
    <Box
      data-testid="dm-sidebar"
      sx={{
        width: CHANNEL_SIDEBAR_WIDTH,
        minWidth: CHANNEL_SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold" noWrap>
          {t(BrightChatStrings.Nav_DirectMessages)}
        </Typography>
        <Tooltip title={t(BrightChatStrings.Create_DM_NewMessage)}>
          <IconButton
            size="small"
            onClick={onNewMessage}
            aria-label={t(BrightChatStrings.Create_DM_NewMessage)}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Scrollable list area */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {/* Direct Messages section */}
        <Box>
          <ListItemButton onClick={toggleDm} sx={{ py: 0.5, px: 1 }} dense>
            {dmExpanded ? (
              <ExpandLessIcon fontSize="small" sx={{ mr: 0.5 }} />
            ) : (
              <ExpandMoreIcon fontSize="small" sx={{ mr: 0.5 }} />
            )}
            <Typography
              variant="caption"
              fontWeight="bold"
              textTransform="uppercase"
              color="text.secondary"
            >
              {t(BrightChatStrings.Nav_DirectMessages)}
            </Typography>
          </ListItemButton>

          <Collapse in={dmExpanded}>
            <List disablePadding dense>
              {conversations.length === 0 && (
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t(BrightChatStrings.DMSidebar_NoConversations)}
                  </Typography>
                </Box>
              )}
              {conversations.map((conv) => {
                const convId = String(conv.id);
                const isActive = convId === activeConversationId;
                const otherId = getOtherParticipantId(conv, userData?.id);
                const displayName =
                  userNames.get(otherId) ??
                  (otherId.length > 16 ? `${otherId.slice(0, 8)}…` : otherId);
                return (
                  <ListItemButton
                    key={convId}
                    selected={isActive}
                    onClick={() => onConversationSelect(convId)}
                    sx={{
                      borderRadius: 1,
                      mx: 0.5,
                      mb: 0.25,
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ChatBubbleOutlineIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={displayName}
                      primaryTypographyProps={{
                        variant: 'body2',
                        noWrap: true,
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </Box>

        {/* Group DMs section */}
        <Box>
          <ListItemButton onClick={toggleGroups} sx={{ py: 0.5, px: 1 }} dense>
            {groupsExpanded ? (
              <ExpandLessIcon fontSize="small" sx={{ mr: 0.5 }} />
            ) : (
              <ExpandMoreIcon fontSize="small" sx={{ mr: 0.5 }} />
            )}
            <Typography
              variant="caption"
              fontWeight="bold"
              textTransform="uppercase"
              color="text.secondary"
            >
              {t(BrightChatStrings.Nav_Groups)}
            </Typography>
          </ListItemButton>

          <Collapse in={groupsExpanded}>
            <List disablePadding dense>
              {groups.length === 0 && (
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t(BrightChatStrings.DMSidebar_NoGroups)}
                  </Typography>
                </Box>
              )}
              {groups.map((group) => {
                const groupId = String(group.id);
                const isActive = groupId === activeGroupId;
                return (
                  <ListItemButton
                    key={groupId}
                    selected={isActive}
                    onClick={() => onGroupSelect(groupId)}
                    sx={{
                      borderRadius: 1,
                      mx: 0.5,
                      mb: 0.25,
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <GroupIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={group.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        noWrap: true,
                      }}
                      secondary={`${group.members.length} member${group.members.length !== 1 ? 's' : ''}`}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        noWrap: true,
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </Box>
      </Box>
    </Box>
  );
};

export default memo(DMSidebar);
