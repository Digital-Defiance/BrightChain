/**
 * BlockExplorerRoutes — Public read-only block explorer.
 *
 * Uses the standard LayoutShell with the blue BrightChain branding bar.
 * No authentication required — all routes are public.
 *
 * Routes:
 *   /explorer           → Block list (default pool)
 *   /explorer/pools     → Pool overview
 *   /explorer/block/:id → Block detail + network locate
 */

import { faCubes } from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightChainStrings, THEME_COLORS } from '@brightchain/brightchain-lib';
import type { NavItem } from '@brightchain/brightchain-react-components';
import {
  BrightChainSubLogo,
  LayoutShell,
  SubLogoHeight,
  SubLogoIconHeight,
} from '@brightchain/brightchain-react-components';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import React, { Suspense, useMemo } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';

// Lazy-load the page components
const BlockListPage = React.lazy(() => import('./pages/BlockExplorerListPage'));
const PoolListPage = React.lazy(() => import('./pages/BlockExplorerPoolsPage'));
const BlockDetailPage = React.lazy(
  () => import('./pages/BlockExplorerDetailPage'),
);

const LoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
    <CircularProgress />
  </Box>
);

export const BlockExplorerRoutes: React.FC = () => {
  const { tBranded: t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const contrastText = useTheme().palette.primary.contrastText;
  const brandConfig = useMemo(
    () => ({
      appName: t(BrightChainStrings.Explorer_Title),
      logo: (
        <BrightChainSubLogo
          leadText="Block"
          subText="Explorer"
          icon={faCubes}
          iconHeight={SubLogoIconHeight}
          height={SubLogoHeight}
          leadColor={contrastText}
          iconColor={contrastText}
        />
      ),
      primaryColor: THEME_COLORS.CHAIN_BLUE,
    }),
    [t, contrastText],
  );

  const sidebarItems: NavItem[] = useMemo(
    () => [
      {
        route: '/explorer',
        label: t(BrightChainStrings.Explorer_Nav_Blocks),
        icon: <ViewListIcon />,
      },
      {
        route: '/explorer/pools',
        label: t(BrightChainStrings.Explorer_Nav_Pools),
        icon: <StorageIcon />,
      },
      {
        route: '/explorer/search',
        label: t(BrightChainStrings.Explorer_Nav_Search),
        icon: <SearchIcon />,
      },
    ],
    [t],
  );

  const sidebar = useMemo(
    () => ({
      items: sidebarItems,
      ariaLabel: 'Block Explorer navigation',
      activeRoute: location.pathname,
      onNavigate: (route: string) => navigate(route),
    }),
    [sidebarItems, location.pathname, navigate],
  );

  return (
    <LayoutShell brandConfig={brandConfig} sidebar={sidebar}>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<BlockListPage />} />
          <Route path="pools" element={<PoolListPage />} />
          <Route path="search" element={<BlockListPage searchMode />} />
          <Route path="block/:blockId" element={<BlockDetailPage />} />
        </Routes>
      </Suspense>
    </LayoutShell>
  );
};

export default BlockExplorerRoutes;
