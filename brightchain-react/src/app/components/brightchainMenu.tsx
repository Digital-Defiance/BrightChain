import { FC } from 'react';
import { IncludeOnMenu } from '../../enumerations/includeOnMenu';
import { DropdownMenu, createMenuType } from '@digitaldefiance/express-suite-react-components';

export const BrightChainMenu: FC = () => {
  return (
    <DropdownMenu
      menuType={createMenuType(String(IncludeOnMenu.BrightChainMenu))}
      menuIcon={<i className="fa-duotone fa-link" />}
    />
  );
};

export default BrightChainMenu;
