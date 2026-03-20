import { faGauge } from '@awesome.me/kit-a20d532681/icons/chisel/regular';
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import {
  MenuTypes,
  useAuth,
  useI18n,
  useMenu,
} from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect } from 'react';

export const AdminMenuRegistration: React.FC = () => {
  const { registerMenuOption } = useMenu();
  const { userData } = useAuth();
  const { tBranded: t } = useI18n();

  const isAdmin = userData?.roles?.some((role) => role.admin) ?? false;

  useEffect(() => {
    if (!isAdmin) return;

    const unregister = registerMenuOption({
      id: 'admin-dashboard',
      label: t(BrightChainStrings.Admin_Menu_Dashboard),
      icon: <FontAwesomeIcon icon={faGauge} />,
      link: '/admin/dashboard',
      requiresAuth: true,
      includeOnMenus: [MenuTypes.UserMenu, MenuTypes.SideMenu],
      index: 1, // right after the regular dashboard
    });

    return unregister;
  }, [isAdmin, registerMenuOption, t]);

  return null;
};
