/**
 * ChannelSidebar — 240px panel listing channels grouped by category
 * within a server, with collapsible sections and role-based controls.
 *
 * Requirements: 4.3, 4.5, 7.1, 7.3, 7.4, 7.5
 */
import type { IChannel, IServerCategory } from '@brightchain/brightchain-lib';
import { DefaultRole } from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import SettingsIcon from '@mui/icons-material/Settings';
import TagIcon from '@mui/icons-material/Tag';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { FC, memo, MouseEvent, useCallback, useState } from 'react';
import {
  groupChannelsByCategory,
  isAdminOrOwner,
} from './ChannelSidebar.helpers';
import SafeFaIcon from './SafeFaIcon';

// ─── Constants ──────────────────────────────────────────────────────────────

export const CHANNEL_SIDEBAR_WIDTH = 240;

// ─── Component ──────────────────────────────────────────────────────────────

export interface ChannelSidebarProps {
  serverName: string | null;
  /** Server image icon URL (optional) */
  serverIconUrl?: string;
  /** Server FontAwesome icon class, e.g. "fa-solid fa-gamepad" (optional, takes precedence over iconUrl) */
  serverIconFaClass?: string;
  channels: IChannel[];
  categories: IServerCategory[];
  activeChannelId: string | null;
  userRole: DefaultRole | null;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel?: (categoryId?: string) => void;
  onEditChannel?: (channelId: string) => void;
  onDeleteChannel?: (channelId: string) => void;
  onMuteChannel?: (channelId: string) => void;
  onSettingsClick?: () => void;
}

const ChannelSidebar: FC<ChannelSidebarProps> = ({
  serverName,
  serverIconUrl,
  serverIconFaClass,
  channels,
  categories,
  activeChannelId,
  userRole,
  onChannelSelect,
  onCreateChannel,
  onEditChannel,
  onDeleteChannel,
  onMuteChannel,
  onSettingsClick,
}) => {
  const { tBranded: t } = useI18n();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    channelId: string;
  } | null>(null);

  const canManage = isAdminOrOwner(userRole);
  const groups = groupChannelsByCategory(channels, categories);

  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e: MouseEvent, channelId: string) => {
    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      channelId,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return (
    <Box
      component="aside"
      aria-label={t(BrightChatStrings.Channel_Sidebar)}
      data-testid="channel-sidebar"
      sx={{
        width: CHANNEL_SIDEBAR_WIDTH,
        minWidth: CHANNEL_SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        overflowY: 'auto',
      }}
    >
      {/* Server name header */}
      {serverName && (
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            {serverIconFaClass ? (
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                  fontSize: 14,
                }}
              >
                <SafeFaIcon className={serverIconFaClass} />
              </Avatar>
            ) : serverIconUrl ? (
              <Avatar
                src={serverIconUrl}
                alt={serverName}
                sx={{ width: 28, height: 28 }}
              />
            ) : null}
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {serverName}
            </Typography>
          </Box>
          {canManage && onSettingsClick && (
            <Tooltip title={t(BrightChatStrings.Server_Settings_Title)}>
              <IconButton
                size="small"
                onClick={onSettingsClick}
                aria-label={t(BrightChatStrings.Server_Settings_Title)}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Channel list grouped by category */}
      <List dense disablePadding sx={{ flex: 1 }}>
        {groups.map((group) => {
          const catId = group.category?.id ?? '__uncategorized__';
          const catName =
            group.category?.name ??
            t(BrightChatStrings.Channel_Sidebar_Uncategorized);
          const isCollapsed = collapsedCategories.has(catId);

          return (
            <Box key={catId}>
              {/* Category header */}
              <ListItemButton
                onClick={() => toggleCategory(catId)}
                sx={{ py: 0.5, px: 1 }}
              >
                {isCollapsed ? (
                  <ExpandMoreIcon sx={{ fontSize: 16, mr: 0.5 }} />
                ) : (
                  <ExpandLessIcon sx={{ fontSize: 16, mr: 0.5 }} />
                )}
                <Typography
                  variant="caption"
                  fontWeight={600}
                  textTransform="uppercase"
                  sx={{ flex: 1 }}
                >
                  {catName}
                </Typography>
                {canManage && onCreateChannel && (
                  <Tooltip
                    title={t(BrightChatStrings.Channel_Sidebar_CreateChannel)}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateChannel(group.category?.id);
                      }}
                      aria-label={t(
                        BrightChatStrings.Channel_Sidebar_CreateChannel,
                      )}
                      sx={{ p: 0.25 }}
                    >
                      <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </ListItemButton>

              {/* Channel items */}
              <Collapse in={!isCollapsed}>
                {group.channels.map((channel) => (
                  <ListItemButton
                    key={channel.id}
                    selected={channel.id === activeChannelId}
                    onClick={() => onChannelSelect(channel.id)}
                    onContextMenu={(e) => handleContextMenu(e, channel.id)}
                    sx={{
                      pl: 3,
                      py: 0.25,
                      '&:hover .channel-actions': { opacity: 1 },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <TagIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </ListItemIcon>
                    <Tooltip title={t(BrightChatStrings.Encryption_E2E)}>
                      <LockIcon
                        aria-label={t(BrightChatStrings.Encryption_E2E)}
                        data-testid="encryption-icon-channel"
                        sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }}
                      />
                    </Tooltip>
                    <ListItemText
                      primary={channel.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        noWrap: true,
                      }}
                    />
                    {canManage && (onEditChannel || onDeleteChannel) && (
                      <Box
                        className="channel-actions"
                        sx={{
                          display: 'flex',
                          opacity: 0,
                          transition: 'opacity 0.15s',
                          ml: 'auto',
                        }}
                      >
                        {onEditChannel && (
                          <Tooltip title={t(BrightChatStrings.Channel_Edit)}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditChannel(channel.id);
                              }}
                              aria-label={t(BrightChatStrings.Channel_Edit)}
                              sx={{ p: 0.25 }}
                            >
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onDeleteChannel && (
                          <Tooltip title={t(BrightChatStrings.Channel_Delete)}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChannel(channel.id);
                              }}
                              aria-label={t(BrightChatStrings.Channel_Delete)}
                              sx={{ p: 0.25 }}
                            >
                              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </ListItemButton>
                ))}
              </Collapse>
            </Box>
          );
        })}
      </List>

      {/* Context menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {canManage && onEditChannel && (
          <MenuItem
            onClick={() => {
              if (contextMenu) onEditChannel(contextMenu.channelId);
              handleCloseContextMenu();
            }}
          >
            {t(BrightChatStrings.Channel_Edit)}
          </MenuItem>
        )}
        {canManage && onDeleteChannel && (
          <MenuItem
            onClick={() => {
              if (contextMenu) onDeleteChannel(contextMenu.channelId);
              handleCloseContextMenu();
            }}
          >
            {t(BrightChatStrings.Channel_Delete)}
          </MenuItem>
        )}
        {onMuteChannel && (
          <MenuItem
            onClick={() => {
              if (contextMenu) onMuteChannel(contextMenu.channelId);
              handleCloseContextMenu();
            }}
          >
            {t(BrightChatStrings.Channel_Mute)}
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default memo(ChannelSidebar);
