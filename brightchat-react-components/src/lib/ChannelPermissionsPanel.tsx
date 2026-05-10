/**
 * ChannelPermissionsPanel — Discord-style role-based permissions editor
 * for a channel. Shows a matrix of roles × permissions with toggle switches.
 *
 * Requirements: 7.5, 8.5
 */
import type { IChannel, IChannelMember } from '@brightchain/brightchain-lib';
import {
  DEFAULT_ROLE_PERMISSIONS,
  DefaultRole,
  Permission,
} from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import {
  FC,
  memo,
  SyntheticEvent,
  useCallback,
  useMemo,
  useState,
} from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChannelPermissionsPanelProps {
  channel: IChannel | null;
  currentUserRole: DefaultRole | null;
  onAssignRole?: (memberId: string, role: DefaultRole) => Promise<void>;
}

// ─── i18n string key maps ───────────────────────────────────────────────────

const PERMISSION_STRING_KEYS: Record<Permission, string> = {
  [Permission.SEND_MESSAGES]:
    BrightChatStrings.Channel_Permissions_SendMessages,
  [Permission.DELETE_OWN_MESSAGES]:
    BrightChatStrings.Permissions_DeleteOwnMessages,
  [Permission.DELETE_ANY_MESSAGE]:
    BrightChatStrings.Permissions_DeleteAnyMessage,
  [Permission.MANAGE_MEMBERS]:
    BrightChatStrings.Channel_Permissions_ManageMembers,
  [Permission.MANAGE_ROLES]: BrightChatStrings.Permissions_ManageRoles,
  [Permission.MANAGE_CHANNEL]:
    BrightChatStrings.Channel_Permissions_ManageChannel,
  [Permission.CREATE_INVITES]:
    BrightChatStrings.Channel_Permissions_CreateInvites,
  [Permission.PIN_MESSAGES]: BrightChatStrings.Channel_Permissions_PinMessages,
  [Permission.MUTE_MEMBERS]: BrightChatStrings.Channel_Permissions_MuteMembers,
  [Permission.KICK_MEMBERS]: BrightChatStrings.Channel_Permissions_KickMembers,
};

const ROLE_STRING_KEYS: Record<DefaultRole, string> = {
  [DefaultRole.OWNER]: BrightChatStrings.Role_Owner,
  [DefaultRole.ADMIN]: BrightChatStrings.Role_Admin,
  [DefaultRole.MODERATOR]: BrightChatStrings.Role_Moderator,
  [DefaultRole.MEMBER]: BrightChatStrings.Role_Member,
};

const ROLE_COLORS: Record<
  DefaultRole,
  'error' | 'warning' | 'info' | 'default'
> = {
  [DefaultRole.OWNER]: 'error',
  [DefaultRole.ADMIN]: 'warning',
  [DefaultRole.MODERATOR]: 'info',
  [DefaultRole.MEMBER]: 'default',
};

const ORDERED_ROLES: DefaultRole[] = [
  DefaultRole.OWNER,
  DefaultRole.ADMIN,
  DefaultRole.MODERATOR,
  DefaultRole.MEMBER,
];

// ─── Component ──────────────────────────────────────────────────────────────

const ChannelPermissionsPanel: FC<ChannelPermissionsPanelProps> = ({
  channel,
  currentUserRole,
}) => {
  const { tBranded: t } = useI18n();
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);

  const handleTabChange = useCallback((_: SyntheticEvent, newValue: number) => {
    setSelectedRoleIndex(newValue);
  }, []);

  const selectedRole = ORDERED_ROLES[selectedRoleIndex];
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[selectedRole];

  const membersByRole = useMemo(() => {
    if (!channel) return new Map<DefaultRole, IChannelMember[]>();
    const map = new Map<DefaultRole, IChannelMember[]>();
    for (const role of ORDERED_ROLES) {
      map.set(role, []);
    }
    for (const member of channel.members) {
      const list = map.get(member.role) ?? [];
      list.push(member);
      map.set(member.role, list);
    }
    return map;
  }, [channel]);

  if (!channel) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">
          {t(BrightChatStrings.Permissions_SelectChannel)}
        </Typography>
      </Box>
    );
  }

  const isOwnerOrAdmin =
    currentUserRole === DefaultRole.OWNER ||
    currentUserRole === DefaultRole.ADMIN;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            {t(BrightChatStrings.Channel_Permissions_Title)}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          #{channel.name} — {channel.visibility} channel
        </Typography>
      </Box>

      {/* Role tabs */}
      <Tabs
        value={selectedRoleIndex}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {ORDERED_ROLES.map((role) => (
          <Tab
            key={role}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {t(ROLE_STRING_KEYS[role])}
                <Chip
                  size="small"
                  label={membersByRole.get(role)?.length ?? 0}
                  color={ROLE_COLORS[role]}
                  sx={{ height: 18, fontSize: '0.7rem' }}
                />
              </Box>
            }
          />
        ))}
      </Tabs>

      {/* Permission list for selected role */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
          {t(BrightChatStrings.Permissions_PermissionsFor)}{' '}
          {t(ROLE_STRING_KEYS[selectedRole])}
        </Typography>
        <List dense>
          {Object.values(Permission).map((perm) => {
            const hasPermission = rolePermissions.includes(perm);
            return (
              <ListItem key={perm} sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <LockIcon
                    fontSize="small"
                    color={hasPermission ? 'primary' : 'disabled'}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={t(PERMISSION_STRING_KEYS[perm])}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={hasPermission}
                      disabled={
                        !isOwnerOrAdmin || selectedRole === DefaultRole.OWNER
                      }
                    />
                  }
                  label=""
                />
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 1 }} />

        {/* Members with this role */}
        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
          {t(BrightChatStrings.Permissions_MembersWith)}{' '}
          {t(ROLE_STRING_KEYS[selectedRole])} (
          {membersByRole.get(selectedRole)?.length ?? 0})
        </Typography>
        <List dense>
          {(membersByRole.get(selectedRole) ?? []).map((member) => (
            <ListItem key={String(member.memberId)}>
              <ListItemText
                primary={String(member.memberId)}
                secondary={`${t(BrightChatStrings.Permissions_Joined)} ${new Date(member.joinedAt).toLocaleDateString()}`}
                primaryTypographyProps={{ variant: 'body2' }}
              />
              <Chip
                size="small"
                label={t(ROLE_STRING_KEYS[member.role])}
                color={ROLE_COLORS[member.role]}
              />
            </ListItem>
          ))}
          {(membersByRole.get(selectedRole)?.length ?? 0) === 0 && (
            <ListItem>
              <ListItemText
                primary={t(BrightChatStrings.Permissions_NoMembers)}
                primaryTypographyProps={{
                  variant: 'body2',
                  color: 'text.secondary',
                }}
              />
            </ListItem>
          )}
        </List>
      </Box>
    </Box>
  );
};

export default memo(ChannelPermissionsPanel);
