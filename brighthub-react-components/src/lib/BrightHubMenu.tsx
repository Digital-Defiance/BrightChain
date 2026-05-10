/**
 * BrightHub Menu Items
 *
 * Provides menu items for the app-level TopMenu dropdown.
 * The in-feature sidebar navigation is handled by BrightHubLayout's LayoutShell.
 *
 * This is a React hook — must be called inside a component.
 */
import {
  faBell,
  faComment,
  faCompass,
  faHashtag,
  faHouse,
  faMagnifyingGlass,
  faPerson,
  faPlus,
  faUserGroup,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightHubStrings, type IBaseHub } from '@brightchain/brighthub-lib';
import {
  type IMenuOption,
  type MenuType,
  MenuTypes,
  useAuth,
  useI18n,
} from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Badge from '@mui/material/Badge';
import { useMemo } from 'react';

/**
 * Build BrightHub menu items for the app-level TopMenu dropdown.
 * These are the items that appear when you expand the BrightHub section
 * in the top navigation. The full sidebar nav is in BrightHubLayout.
 */
export function useBrightHubMenuItems(
  hubMenu: MenuType,
  subscribedHubs: IBaseHub<string>[],
  startingIndex: number,
  unreadNotificationCount?: number,
): { options: IMenuOption[]; nextIndex: number } {
  const { tBranded: t } = useI18n();
  const { userData } = useAuth();
  const userId = userData?.id;

  return useMemo(() => {
    let idx = startingIndex;
    const items: IMenuOption[] = [
      {
        id: 'hub_home',
        index: idx,
        requiresAuth: true,
        link: '/brighthub',
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
        label: t(BrightHubStrings.Nav_Home),
        icon: <FontAwesomeIcon icon={faHouse} />,
      },
      {
        id: 'hub_explore',
        index: (idx += 10),
        link: '/brighthub/explore',
        requiresAuth: true,
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
        label: t(BrightHubStrings.Nav_Explore),
        icon: <FontAwesomeIcon icon={faCompass} />,
      },
      {
        id: 'hub_search',
        index: (idx += 10),
        link: '/brighthub/search',
        requiresAuth: true,
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
        label: 'Search',
        icon: <FontAwesomeIcon icon={faMagnifyingGlass} />,
      },
      {
        id: 'hub_notifications',
        index: idx + 20,
        link: '/brighthub/notifications',
        requiresAuth: true,
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
        label: t(BrightHubStrings.Nav_Notifications),
        icon: unreadNotificationCount ? (
          <Badge badgeContent={unreadNotificationCount} color="error" max={99}>
            <FontAwesomeIcon icon={faBell} />
          </Badge>
        ) : (
          <FontAwesomeIcon icon={faBell} />
        ),
      },
      {
        id: 'hub_messages',
        index: idx + 30,
        requiresAuth: true,
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
        link: '/brighthub/messages',
        label: t(BrightHubStrings.Nav_Messages),
        icon: <FontAwesomeIcon icon={faComment} />,
      },
      {
        id: 'hub_connections',
        index: idx + 40,
        requiresAuth: true,
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
        link: '/brighthub/connections/suggestions',
        label: t(BrightHubStrings.Nav_Connections),
        icon: <FontAwesomeIcon icon={faUserGroup} />,
      },
      {
        id: 'hub_create',
        index: (idx += 50),
        link: '/brighthub/h/create',
        requiresAuth: true,
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
        label: t(BrightHubStrings.Nav_CreateHub),
        icon: <FontAwesomeIcon icon={faPlus} />,
      },
    ];
    idx += 50;
    startingIndex += 50;

    if (userId) {
      items.push({
        id: 'hub_profile',
        requiresAuth: true,
        index: idx,
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
        link: `/brighthub/profile/${userId}`,
        label: t(BrightHubStrings.Nav_Profile),
        icon: <FontAwesomeIcon icon={faPerson} />,
      });
      idx += 10;
      startingIndex += 10;
    }

    // Add subscribed hubs as quick-access items
    for (const hub of subscribedHubs.slice(0, 5)) {
      idx += 10;
      startingIndex += 10;
      items.push({
        id: `hub_sub_${hub._id}`,
        index: idx,
        link: `/brighthub/h/${hub.slug ?? hub._id}`,
        requiresAuth: true,
        label: hub.name,
        icon: <FontAwesomeIcon icon={faHashtag} />,
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
      });
    }

    return { options: items, nextIndex: startingIndex + 10 };
  }, [t, hubMenu, subscribedHubs, startingIndex, unreadNotificationCount]);
}

export default useBrightHubMenuItems;
