/**
 * ChatSidebar — Navigation sidebar for BrightChat.
 *
 * Renders a MUI Drawer (permanent on >960px, temporary on ≤960px) containing
 * the BrightChainSubLogo and navigation items for Conversations, Groups,
 * and Channels with unread badge indicators and keyboard navigation.
 *
 * Requirements: 1.6, 1.7, 1.8
 */
import { faComment } from '@awesome.me/kit-a20d532681/icons/chisel/regular';
import { BrightChainSubLogo } from '@brightchain/brightchain-react-components';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import React, { useCallback, useRef } from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────

export const SIDEBAR_WIDTH = 240;

/** Navigation items rendered in the sidebar. */
const NAV_ITEMS = [
  {
    labelStringKey: BrightChatStrings.Nav_DirectMessages,
    icon: <ChatBubbleOutlineIcon />,
    route: '/brightchat',
    badge: 0,
  },
] as const;

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ChatSidebarProps {
  open: boolean;
  onToggle: () => void;
  variant: 'permanent' | 'temporary';
  activeRoute: string;
  onNavigate?: (route: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  open,
  onToggle,
  variant,
  activeRoute,
  onNavigate,
}) => {
  const { tBranded: t } = useI18n();
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * Keyboard navigation handler for the nav list.
   * Supports ArrowDown/ArrowUp to move between items.
   */
  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLUListElement>) => {
      const list = listRef.current;
      if (!list) return;

      const items = Array.from(
        list.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      );
      const ownerDoc = list.ownerDocument;
      const currentIndex = items.findIndex(
        (item) => item === ownerDoc.activeElement,
      );

      let nextIndex = -1;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      }

      if (nextIndex >= 0) {
        items[nextIndex].focus();
      }
    },
    [],
  );

  const handleNavClick = useCallback(
    (route: string) => {
      onNavigate?.(route);
      if (variant === 'temporary') {
        onToggle();
      }
    },
    [onNavigate, variant, onToggle],
  );

  const drawerContent = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        pt: 2,
        px: 1,
      }}
    >
      {/* Logo */}
      <Box sx={{ px: 1, mb: 2 }}>
        <BrightChainSubLogo
          subText="Chat"
          icon={faComment}
          height={30}
          iconHeight={20}
        />
      </Box>

      {/* Navigation list */}
      <List
        ref={listRef}
        role="menu"
        aria-label={t(BrightChatStrings.ChatSectionsLabel)}
        onKeyDown={handleListKeyDown}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeRoute === item.route;
          return (
            <ListItemButton
              key={item.route}
              role="menuitem"
              tabIndex={0}
              selected={isActive}
              onClick={() => handleNavClick(item.route)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: -2,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Badge
                  badgeContent={item.badge}
                  color="error"
                  invisible={item.badge === 0}
                >
                  {item.icon}
                </Badge>
              </ListItemIcon>
              <ListItemText primary={t(item.labelStringKey)} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onToggle}
      sx={{
        width: variant === 'permanent' ? SIDEBAR_WIDTH : undefined,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          ...(variant === 'permanent' && {
            top: '64px',
            height: 'calc(100vh - 64px)',
          }),
        },
      }}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default ChatSidebar;
