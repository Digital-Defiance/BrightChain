import {
  faCubes,
  faGauge,
  faUserGear,
} from '@awesome.me/kit-a20d532681/icons/chisel/regular';
import {
  faComment,
  faEnvelope,
  faInfoCircle,
  faLock,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { faCircleNodes } from '@awesome.me/kit-a20d532681/icons/classic/thin';
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

    const unregisters = [
      registerMenuOption({
        id: 'admin-dashboard',
        label: t(BrightChainStrings.Admin_Menu_Dashboard),
        icon: <FontAwesomeIcon icon={faGauge} />,
        link: '/admin/dashboard',
        requiresAuth: true,
        includeOnMenus: [MenuTypes.UserMenu, MenuTypes.SideMenu],
        index: 1,
      }),
      registerMenuOption({
        id: 'admin-users',
        label: t(BrightChainStrings.Admin_Menu_Users),
        icon: <FontAwesomeIcon icon={faUserGear} />,
        link: '/admin/users',
        requiresAuth: true,
        includeOnMenus: [MenuTypes.UserMenu, MenuTypes.SideMenu],
        index: 2,
      }),
      registerMenuOption({
        id: 'admin-blocks',
        label: t(BrightChainStrings.Admin_Menu_Blocks),
        icon: <FontAwesomeIcon icon={faCubes} />,
        link: '/admin/blocks',
        requiresAuth: true,
        includeOnMenus: [MenuTypes.UserMenu, MenuTypes.SideMenu],
        index: 3,
      }),
      registerMenuOption({
        id: 'admin-hub',
        label: t(BrightChainStrings.Admin_Menu_Hub),
        icon: <FontAwesomeIcon icon={faCircleNodes} />,
        link: '/admin/hub',
        requiresAuth: true,
        includeOnMenus: [MenuTypes.UserMenu, MenuTypes.SideMenu],
        index: 4,
      }),
      registerMenuOption({
        id: 'admin-chat',
        label: t(BrightChainStrings.Admin_Menu_Chat),
        icon: <FontAwesomeIcon icon={faComment} />,
        link: '/admin/chat',
        requiresAuth: true,
        includeOnMenus: [MenuTypes.UserMenu, MenuTypes.SideMenu],
        index: 5,
      }),
      registerMenuOption({
        id: 'admin-mail',
        label: t(BrightChainStrings.Admin_Menu_Mail),
        icon: <FontAwesomeIcon icon={faEnvelope} />,
        link: '/admin/mail',
        requiresAuth: true,
        includeOnMenus: [MenuTypes.UserMenu, MenuTypes.SideMenu],
        index: 6,
      }),
      registerMenuOption({
        id: 'admin-pass',
        label: t(BrightChainStrings.Admin_Menu_Pass),
        icon: <FontAwesomeIcon icon={faLock} />,
        link: '/admin/pass',
        requiresAuth: true,
        includeOnMenus: [MenuTypes.UserMenu, MenuTypes.SideMenu],
        index: 7,
      }),
      registerMenuOption({
        id: 'admin-about',
        label: t(BrightChainStrings.Admin_Menu_About),
        icon: <FontAwesomeIcon icon={faInfoCircle} />,
        link: '/admin/about',
        requiresAuth: true,
        includeOnMenus: [MenuTypes.UserMenu, MenuTypes.SideMenu],
        index: 8,
      }),
    ];

    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [isAdmin, registerMenuOption, t]);

  return null;
};
