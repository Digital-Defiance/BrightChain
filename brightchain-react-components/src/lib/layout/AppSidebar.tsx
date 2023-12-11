import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import * as React from 'react';
import { useCallback, useRef } from 'react';
import { AppSidebarProps } from './types';

const DRAWER_WIDTH = 240;

export function AppSidebar({
  open,
  onToggle,
  variant,
  activeRoute,
  items,
  header,
  footer,
  ariaLabel = 'Navigation',
  onNavigate,
}: AppSidebarProps) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleItemClick = useCallback(
    (route: string) => {
      onNavigate?.(route);
      if (variant === 'temporary') {
        onToggle();
      }
    },
    [onNavigate, variant, onToggle],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const n = items.length;
      if (n === 0) return;

      let nextIndex: number | null = null;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        nextIndex = (index + 1) % n;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        nextIndex = (index - 1 + n) % n;
      }

      if (nextIndex !== null) {
        itemRefs.current[nextIndex]?.focus();
      }
    },
    [items.length],
  );

  const drawerContent = (
    <Box
      sx={{
        width: DRAWER_WIDTH,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {header && <Box data-testid="sidebar-header">{header}</Box>}

      <List
        role="menu"
        aria-label={ariaLabel}
        sx={{ flexGrow: 1 }}
        data-testid="sidebar-nav-list"
      >
        {items.map((item, index) => (
          <React.Fragment key={item.route}>
            {item.dividerBefore && (
              <Divider data-testid={`divider-before-${item.route}`} />
            )}
            <ListItemButton
              role="menuitem"
              selected={item.route === activeRoute}
              onClick={() => handleItemClick(item.route)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              data-testid={`nav-item-${item.route}`}
              sx={{
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: -2,
                },
              }}
            >
              <ListItemIcon>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <Badge badgeContent={item.badgeCount} color="primary">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </React.Fragment>
        ))}
      </List>

      {footer && <Box data-testid="sidebar-footer">{footer}</Box>}
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={variant === 'permanent' ? true : open}
      onClose={variant === 'temporary' ? onToggle : undefined}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          ...(variant === 'permanent' && {
            position: 'relative',
          }),
        },
      }}
      data-testid="app-sidebar-drawer"
    >
      {drawerContent}
    </Drawer>
  );
}

export default AppSidebar;
