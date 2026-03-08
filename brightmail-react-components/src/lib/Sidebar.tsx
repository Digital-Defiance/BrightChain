/**
 * Sidebar component for BrightMail.
 *
 * Renders a MUI Drawer (permanent on >960px, temporary on ≤960px) containing
 * the BrightChainSubLogo, a ComposeFAB, and navigation items for mail folders.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 2.1, 2.2, 2.3, 2.4, 8.1
 */
import { BrightChainSubLogo } from '@brightchain/brightchain-react-components';
import { faEnvelope } from '@awesome.me/kit-a20d532681/icons/classic/solid';
import DeleteIcon from '@mui/icons-material/Delete';
import DraftsIcon from '@mui/icons-material/Drafts';
import EditIcon from '@mui/icons-material/Edit';
import InboxIcon from '@mui/icons-material/Inbox';
import LabelIcon from '@mui/icons-material/Label';
import SendIcon from '@mui/icons-material/Send';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import React, { useCallback, useRef } from 'react';
import { useBrightMail } from './BrightMailContext';

// ─── Constants ──────────────────────────────────────────────────────────────

export const SIDEBAR_WIDTH = 240;

/** Navigation items rendered in the sidebar. */
const NAV_ITEMS = [
  { label: 'Inbox', icon: <InboxIcon />, route: '/brightmail' },
  { label: 'Sent', icon: <SendIcon />, route: '/brightmail/sent' },
  { label: 'Drafts', icon: <DraftsIcon />, route: '/brightmail/drafts' },
  { label: 'Trash', icon: <DeleteIcon />, route: '/brightmail/trash' },
  { label: 'Labels', icon: <LabelIcon />, route: '/brightmail/labels' },
] as const;

// ─── Props ──────────────────────────────────────────────────────────────────

export interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  variant: 'permanent' | 'temporary';
  activeRoute: string;
  onNavigate?: (route: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onToggle,
  variant,
  activeRoute,
  onNavigate,
}) => {
  const { openCompose } = useBrightMail();
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * Keyboard navigation handler for the nav list.
   * Supports ArrowDown/ArrowUp to move between items (Requirement 8.1).
   */
  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLUListElement>) => {
      const list = listRef.current;
      if (!list) return;

      const items = Array.from(
        list.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      );
      const currentIndex = items.findIndex(
        (item) => item === document.activeElement,
      );

      let nextIndex = -1;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        nextIndex =
          currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        nextIndex =
          currentIndex > 0 ? currentIndex - 1 : items.length - 1;
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

  const isExpanded = variant === 'permanent' || open;

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
          subText="Mail"
          icon={faEnvelope}
          height={30}
          iconHeight={20}
        />
      </Box>

      {/* Compose FAB */}
      <Box sx={{ px: 1, mb: 2 }}>
        <Fab
          color="primary"
          variant={isExpanded ? 'extended' : 'circular'}
          onClick={() => openCompose()}
          aria-label="Compose"
          sx={{
            width: isExpanded ? '100%' : undefined,
            textTransform: 'none',
          }}
        >
          <EditIcon sx={{ mr: isExpanded ? 1 : 0 }} />
          {isExpanded && 'Compose'}
        </Fab>
      </Box>

      {/* Navigation list */}
      <List
        ref={listRef}
        role="menu"
        aria-label="Mail folders"
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
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
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

export default Sidebar;
