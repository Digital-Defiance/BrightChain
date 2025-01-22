import { Box, Fade, IconButton, Menu, MenuItem } from '@mui/material';
import { FC, MouseEvent, ReactElement, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IncludeOnMenu } from '../../enumerations/includeOnMenu';
import { IMenuOption } from '../../interfaces/menuOption';
import { useMenu } from '../../menu-context';

interface DropdownMenuProps {
  menuType: IncludeOnMenu;
  menuIcon: ReactElement;
}

export const DropdownMenu: FC<DropdownMenuProps> = ({ menuType, menuIcon }) => {
  const { getMenuOptions } = useMenu();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);
  const handleMenuItemClick = useCallback(
    (option: IMenuOption) => (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      if (option.action) {
        option.action();
      } else if (option.link !== undefined) {
        if (
          typeof option.link === 'object' &&
          'pathname' in option.link &&
          'state' in option.link
        ) {
          navigate(option.link.pathname, { state: option.link.state });
        } else {
          navigate(option.link);
        }
      }
      handleClose(); // Call handleClose after handling the click
    },
    [navigate, handleClose], // Add handleClose to the dependency array
  );

  const handleClick = useCallback((event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const menuItems = getMenuOptions(menuType, false);

  if (menuItems.length === 0) {
    return null;
  }

  return (
    <Box>
      <IconButton color="inherit" onClick={handleClick}>
        {menuIcon}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        TransitionComponent={Fade}
        sx={{
          '& .MuiPopover-paper': {
            opacity: 0.5,
            overflow: 'visible',
          },
        }}
      >
        {menuItems.map((option) => (
          <MenuItem
            key={option.id}
            component="li"
            onClick={handleMenuItemClick(option)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              '& > svg': {
                marginRight: 2,
                width: 24,
                height: 24,
              },
            }}
          >
            {option.icon}
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
