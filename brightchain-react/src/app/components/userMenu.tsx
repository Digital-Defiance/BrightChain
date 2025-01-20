import { FC } from 'react';
import { IncludeOnMenu } from '../../enumerations/includeOnMenu';
import { DropdownMenu } from './dropdownMenu';

export const UserMenu: FC = () => {
  return (
    <DropdownMenu
      menuType={IncludeOnMenu.UserMenu}
      menuIcon={<i className="fa-duotone fa-user-circle" />}
    />
  );
};

export default UserMenu;
