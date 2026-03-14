/**
 * GroupConversationSettings Component
 *
 * Manage group name, avatar, participants, and admin roles.
 *
 * @remarks
 * Implements Requirements 44.9, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import type { IBaseGroupConversation } from '@brightchain/brighthub-lib';
import { GroupParticipantRole } from '@brightchain/brighthub-lib';
import {
  AdminPanelSettings,
  ExitToApp,
  PersonAdd,
  PersonRemove,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Participant info for display */
export interface ParticipantInfo {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: GroupParticipantRole;
}

/** Props for the GroupConversationSettings component */
export interface GroupConversationSettingsProps {
  /** The group conversation */
  conversation: IBaseGroupConversation<string>;
  /** Participant details */
  participants: ParticipantInfo[];
  /** Current user's ID */
  currentUserId: string;
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Callback to update group name */
  onUpdateName?: (name: string) => void;
  /** Callback to update group avatar */
  onUpdateAvatar?: (url: string) => void;
  /** Callback to add a participant */
  onAddParticipant?: () => void;
  /** Callback to remove a participant */
  onRemoveParticipant?: (userId: string) => void;
  /** Callback to promote a participant to admin */
  onPromoteToAdmin?: (userId: string) => void;
  /** Callback to demote an admin */
  onDemoteFromAdmin?: (userId: string) => void;
  /** Callback to leave the group */
  onLeaveGroup?: () => void;
}

/**
 * GroupConversationSettings
 *
 * Settings panel for group conversations with participant management.
 */
export function GroupConversationSettings({
  conversation,
  participants,
  currentUserId,
  isAdmin,
  onUpdateName,
  onUpdateAvatar,
  onAddParticipant,
  onRemoveParticipant,
  onPromoteToAdmin,
  onDemoteFromAdmin,
  onLeaveGroup,
}: GroupConversationSettingsProps) {
  const { t } = useBrightHubTranslation();
  const [name, setName] = useState(conversation.name ?? '');

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== conversation.name) {
      onUpdateName?.(trimmed);
    }
  };

  return (
    <Box aria-label={t(BrightHubStrings.GroupConversationSettings_AriaLabel)}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t(BrightHubStrings.GroupConversationSettings_Title)}
      </Typography>

      {/* Group name */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          label={t(BrightHubStrings.GroupConversationSettings_GroupName)}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isAdmin}
          slotProps={{
            input: {
              'aria-label': t(
                BrightHubStrings.GroupConversationSettings_GroupName,
              ),
            },
          }}
        />
        {isAdmin && name.trim() !== (conversation.name ?? '') && (
          <Button size="small" onClick={handleSaveName} sx={{ mt: 0.5 }}>
            {t(BrightHubStrings.GroupConversationSettings_Save)}
          </Button>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Participants */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="subtitle1">
          {t(BrightHubStrings.GroupConversationSettings_Participants)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            BrightHubStrings.GroupConversationSettings_ParticipantCountTemplate,
            { COUNT: String(participants.length) },
          )}
        </Typography>
      </Box>

      {isAdmin && (
        <Button
          size="small"
          startIcon={<PersonAdd />}
          onClick={onAddParticipant}
          sx={{ mb: 1 }}
          aria-label={t(
            BrightHubStrings.GroupConversationSettings_AddParticipant,
          )}
        >
          {t(BrightHubStrings.GroupConversationSettings_AddParticipant)}
        </Button>
      )}

      <List disablePadding>
        {participants.map((p) => (
          <ListItem key={p.userId} disableGutters>
            <ListItemAvatar>
              <Avatar src={p.avatarUrl}>
                {p.displayName.charAt(0).toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {p.displayName}
                  {p.role === GroupParticipantRole.Admin && (
                    <Chip
                      label={t(
                        BrightHubStrings.GroupConversationSettings_AdminBadge,
                      )}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                      data-testid={`admin-badge-${p.userId}`}
                    />
                  )}
                </Box>
              }
            />
            {isAdmin && p.userId !== currentUserId && (
              <ListItemSecondaryAction>
                {p.role === GroupParticipantRole.Participant ? (
                  <Tooltip
                    title={t(
                      BrightHubStrings.GroupConversationSettings_PromoteToAdmin,
                    )}
                  >
                    <IconButton
                      size="small"
                      onClick={() => onPromoteToAdmin?.(p.userId)}
                      aria-label={t(
                        BrightHubStrings.GroupConversationSettings_PromoteToAdmin,
                      )}
                    >
                      <AdminPanelSettings fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    title={t(
                      BrightHubStrings.GroupConversationSettings_DemoteFromAdmin,
                    )}
                  >
                    <IconButton
                      size="small"
                      onClick={() => onDemoteFromAdmin?.(p.userId)}
                      aria-label={t(
                        BrightHubStrings.GroupConversationSettings_DemoteFromAdmin,
                      )}
                    >
                      <AdminPanelSettings fontSize="small" color="disabled" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip
                  title={t(
                    BrightHubStrings.GroupConversationSettings_RemoveParticipant,
                  )}
                >
                  <IconButton
                    size="small"
                    onClick={() => onRemoveParticipant?.(p.userId)}
                    aria-label={t(
                      BrightHubStrings.GroupConversationSettings_RemoveParticipant,
                    )}
                  >
                    <PersonRemove fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Leave group */}
      <Button
        color="error"
        startIcon={<ExitToApp />}
        onClick={onLeaveGroup}
        aria-label={t(BrightHubStrings.GroupConversationSettings_LeaveGroup)}
      >
        {t(BrightHubStrings.GroupConversationSettings_LeaveGroup)}
      </Button>
    </Box>
  );
}

export default GroupConversationSettings;
