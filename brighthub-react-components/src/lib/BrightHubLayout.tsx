/**
 * BrightHubLayout — Container layout for BrightHub.
 *
 * Uses the shared LayoutShell from brightchain-react-components.
 * Renders a left sidebar with hub navigation items so that the
 * includeOnMenus SideMenu entries are visible.
 */
import {
  faBell,
  faComment,
  faCompass,
  faHashtag,
  faHouse,
  faPerson,
  faPlus,
  faUserGroup,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { faCircleNodes } from '@awesome.me/kit-a20d532681/icons/classic/thin';
import { THEME_COLORS } from '@brightchain/brightchain-lib';
import {
  BrightChainSubLogo,
  LayoutShell,
  SubLogoHeight,
  SubLogoIconHeight,
  type NavItem,
  type SidebarConfig,
} from '@brightchain/brightchain-react-components';
import type { IBaseHub } from '@brightchain/brighthub-lib';
import { BrightHubStrings } from '@brightchain/brighthub-lib';
import {
  useAuth,
  useAuthenticatedApi,
  useI18n,
} from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Badge, useTheme } from '@mui/material';
import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './BrightHub.scss';
import {
  DetailPanelProvider,
  useDetailPanel,
} from './hooks/useBrightHubDetailPanel';

const BrightHubLayoutInner: FC<{ subscribedHubs?: IBaseHub<string>[] }> = ({
  subscribedHubs = [],
}) => {
  const navigate = useNavigate();
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const { tBranded: t } = useI18n();
  const contrastText = useTheme().palette.primary.contrastText;
  const userId = userData?.id;

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    api
      .get(`/brighthub/notifications?userId=${userId}&limit=10`)
      .then((res) => {
        const data = res.data?.data;
        if (Array.isArray(data)) {
          setUnreadCount(
            (data as { isRead?: boolean }[]).filter((n) => !n.isRead).length,
          );
        } else if (data?.notifications) {
          setUnreadCount(data.unreadCount ?? 0);
        }
      })
      .catch(() => {});
  }, [api, userId]);

  const brandConfig = useMemo(
    () => ({
      appName: 'BrightHub',
      logo: (
        <BrightChainSubLogo
          subText="Hub"
          icon={faCircleNodes}
          iconColor={contrastText}
          height={SubLogoHeight}
          iconHeight={SubLogoIconHeight}
          leadColor={contrastText}
        />
      ),
      primaryColor: THEME_COLORS.CHAIN_BLUE,
    }),
    [contrastText],
  );

  const { content: detailPanelContent } = useDetailPanel();

  const handleNavigate = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate],
  );

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      {
        route: '/brighthub',
        label: t(BrightHubStrings.Nav_Home),
        icon: <FontAwesomeIcon icon={faHouse} />,
      },
      {
        route: '/brighthub/explore',
        label: t(BrightHubStrings.Nav_Explore),
        icon: <FontAwesomeIcon icon={faCompass} />,
      },
      {
        route: '/brighthub/notifications',
        label: t(BrightHubStrings.Nav_Notifications),
        icon: (
          <Badge badgeContent={unreadCount || undefined} color="error" max={99}>
            <FontAwesomeIcon icon={faBell} />
          </Badge>
        ),
        badgeCount: unreadCount,
      },
      {
        route: '/brighthub/messages',
        label: t(BrightHubStrings.Nav_Messages),
        icon: <FontAwesomeIcon icon={faComment} />,
      },
      {
        route: '/brighthub/connections/suggestions',
        label: t(BrightHubStrings.Nav_Connections),
        icon: <FontAwesomeIcon icon={faUserGroup} />,
      },
      {
        route: '/brighthub/h/create',
        label: t(BrightHubStrings.Nav_CreateHub),
        icon: <FontAwesomeIcon icon={faPlus} />,
        dividerBefore: true,
      },
    ];

    if (userId) {
      items.push({
        route: `/brighthub/profile/${userId}`,
        label: t(BrightHubStrings.Nav_Profile),
        icon: <FontAwesomeIcon icon={faPerson} />,
      });
    }

    for (const hub of subscribedHubs.slice(0, 5)) {
      items.push({
        route: `/brighthub/h/${hub.slug ?? hub._id}`,
        label: hub.name,
        icon: <FontAwesomeIcon icon={faHashtag} />,
        dividerBefore: items.length === (userId ? 8 : 7),
      });
    }

    return items;
  }, [t, unreadCount, userId, subscribedHubs]);

  const sidebarConfig: SidebarConfig = useMemo(
    () => ({
      items: navItems,
      ariaLabel: t(BrightHubStrings.Nav_SidebarLabel),
      onNavigate: handleNavigate,
    }),
    [navItems, handleNavigate, t],
  );

  return (
    <LayoutShell
      brandConfig={brandConfig}
      sidebar={sidebarConfig}
      detailPanel={detailPanelContent}
    />
  );
};

const BrightHubLayout: FC = () => (
  <DetailPanelProvider>
    <BrightHubLayoutInner />
  </DetailPanelProvider>
);

export default memo(BrightHubLayout);
