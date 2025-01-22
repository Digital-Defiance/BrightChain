import {
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { FC, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IMenuOption } from '../interfaces/menu-option';

interface SideMenuListItemProps {
  menuItem: IMenuOption;
  onClose: () => void;
}

export const SideMenuListItem: FC<SideMenuListItemProps> = ({
  menuItem,
  onClose,
}) => {
  const navigate = useNavigate();
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
      onClose();
    },
    [navigate, onClose],
  );

  if (menuItem.divider) {
    return <Divider key={menuItem.label} />;
  } else if (menuItem.link) {
    return (
      <ListItemButton key={menuItem.id} onClick={handleMenuItemClick(menuItem)}>
        {menuItem.icon && <ListItemIcon>{menuItem.icon}</ListItemIcon>}
        <ListItemText primary={menuItem.label} />
      </ListItemButton>
    );
  } else if (menuItem.action) {
    const action = menuItem.action;
    return (
      <ListItemButton
        key={menuItem.id}
        onClick={async () => {
          await action();
          onClose();
        }}
      >
        {menuItem.icon && <ListItemIcon>{menuItem.icon}</ListItemIcon>}
        <ListItemText primary={menuItem.label} />
      </ListItemButton>
    );
  }
  return null;
};

export default SideMenuListItem;
