import { FC } from 'react';
import { IncludeOnMenu } from '../../enumerations/includeOnMenu';
import { DropdownMenu } from './dropdownMenu';

export const BrightChainMenu: FC = () => {
  return (
    <DropdownMenu
      menuType={IncludeOnMenu.BrightChainMenu}
      menuIcon={<i className="fa-duotone fa-sack-dollar" />}
    />
  );
};

export default BrightChainMenu;
