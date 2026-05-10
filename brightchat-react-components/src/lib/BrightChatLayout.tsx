/**
 * BrightChatLayout — Three-panel layout for BrightChat.
 *
 * Uses the shared LayoutShell from brightchain-react-components for the
 * AppBar and sub-AppBar (breadcrumb), then renders the Discord-style
 * ServerRail | ChannelSidebar | ChatArea as custom content.
 *
 * Requirements: 4.1, 4.6
 */
import { faComment } from '@awesome.me/kit-a20d532681/icons/chisel/regular';
import type { IServer } from '@brightchain/brightchain-lib';
import { THEME_COLORS } from '@brightchain/brightchain-lib';
import {
  BrightChainSubLogo,
  LayoutShell,
  SubLogoHeight,
  SubLogoIconHeight,
} from '@brightchain/brightchain-react-components';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import LockIcon from '@mui/icons-material/Lock';
import MenuIcon from '@mui/icons-material/Menu';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import { useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { FC, memo, ReactNode, useCallback, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { BrightChatProvider, useBrightChat } from './BrightChatContext';
import type { ChannelSidebarProps } from './ChannelSidebar';
import ChannelSidebar, { CHANNEL_SIDEBAR_WIDTH } from './ChannelSidebar';
import type { DMSidebarProps } from './DMSidebar';
import DMSidebar from './DMSidebar';
import PresenceStatusDropdown from './PresenceStatusDropdown';
import type { ServerRailProps } from './ServerRail';
import ServerRail, { SERVER_RAIL_WIDTH } from './ServerRail';
import type { ChatApiClient } from './services/chatApi';

// ─── Breakpoint ─────────────────────────────────────────────────────────────

const MOBILE_BREAKPOINT = 768;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BrightChatLayoutProps {
  /** Server list for the rail */
  servers: IServer[];
  /** Currently active server ID */
  activeServerId: string | null;
  /** Props forwarded to ChannelSidebar */
  channelSidebarProps: Omit<ChannelSidebarProps, 'serverName' | 'serverIconUrl' | 'serverIconFaClass'>;
  /** Props forwarded to DMSidebar (shown when no server is selected) */
  dmSidebarProps?: Omit<DMSidebarProps, never>;
  /** Server name for the sidebar header */
  serverName: string | null;
  /** Currently active channel name (for breadcrumb display) */
  activeChannelName?: string | null;
  /** Callbacks */
  onServerSelect: (serverId: string) => void;
  onHomeClick: () => void;
  onCreateServer: () => void;
  /** Main chat area content */
  children: ReactNode;
  /** Optional chatApi for the provider */
  chatApi?: ChatApiClient;
}

/** @deprecated Use BrightChatLayoutProps instead */
export type DiscordLayoutProps = BrightChatLayoutProps;

// ─── Breadcrumb item ────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  to?: string;
}

// ─── Sub-AppBar breadcrumb builder ──────────────────────────────────────────

/**
 * Build breadcrumb items from the current route and active context.
 * Exported for testability.
 */
export function buildBrightChatBreadcrumbs(
  pathname: string,
  t: (key: string) => string,
  serverName: string | null,
  channelName?: string | null,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];

  const normalized = pathname.replace(/\/+$/, '');
  if (!normalized.startsWith('/brightchat')) return items;

  // Root crumb: "BrightChat"
  items.push({
    label: t(BrightChatStrings.Breadcrumb_BrightChat),
    to: '/brightchat',
  });

  const rest = normalized.slice('/brightchat'.length);
  const segments = rest.split('/').filter(Boolean);

  if (segments.length === 0) {
    // At /brightchat root — current page
    delete items[items.length - 1].to;
    return items;
  }

  // Server context breadcrumb
  if (serverName) {
    items.push({
      label: serverName,
    });
  }

  if (segments[0] === 'channel' && segments[1]) {
    items.push({
      label: channelName || t(BrightChatStrings.Breadcrumb_Channel),
    });
  } else if (segments[0] === 'conversation' && segments[1]) {
    items.push({
      label: t(BrightChatStrings.Breadcrumb_Conversation),
    });
  } else if (segments[0] === 'group' && segments[1]) {
    items.push({
      label: t(BrightChatStrings.Breadcrumb_Group),
    });
  } else if (segments[0] === 'groups') {
    items.push({
      label: t(BrightChatStrings.Nav_Groups),
    });
  } else if (segments[0] === 'channels') {
    items.push({
      label: t(BrightChatStrings.Nav_Channels),
    });
  }

  // Last item is always non-clickable (current page)
  if (items.length > 0) {
    delete items[items.length - 1].to;
  }

  return items;
}

// ─── SubBar breadcrumb component (rendered via LayoutShell subBar prop) ─────

interface SubBarProps {
  serverName: string | null;
  channelName?: string | null;
}

const BrightChatSubBar: FC<SubBarProps> = ({ serverName, channelName }) => {
  const { pathname } = useLocation();
  const { tBranded: t } = useI18n();

  const items = useMemo(
    () => buildBrightChatBreadcrumbs(pathname, t, serverName, channelName),
    [pathname, t, serverName, channelName],
  );

  return (
    <Box
      data-testid="brightchat-subbar"
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 0.75,
      }}
    >
      <Breadcrumbs
        separator={
          <NavigateNextIcon fontSize="small" sx={{ color: 'inherit' }} />
        }
        aria-label={t(BrightChatStrings.Layout_BreadcrumbLabel)}
      >
        {items.map((item, index) =>
          item.to ? (
            <Link
              key={item.to}
              component={RouterLink}
              to={item.to}
              underline="hover"
              color="inherit"
              variant="body2"
            >
              {item.label}
            </Link>
          ) : (
            <Typography key={`crumb-${index}`} color="inherit" variant="body2">
              {item.label}
            </Typography>
          ),
        )}
      </Breadcrumbs>
      {items.length > 1 && (
        <Tooltip title={t(BrightChatStrings.Encryption_E2E)}>
          <LockIcon
            aria-label={t(BrightChatStrings.Encryption_E2E)}
            data-testid="encryption-icon-breadcrumb"
            sx={{ fontSize: 16, color: 'inherit', ml: 0.5 }}
          />
        </Tooltip>
      )}
    </Box>
  );
};

// ─── User profile area with presence dropdown ──────────────────────────────

const UserProfileArea: FC = () => {
  const { presenceStatus, setPresenceStatus } = useBrightChat();
  const { tBranded: t } = useI18n();

  return (
    <Box
      aria-label={t(BrightChatStrings.Layout_UserProfile)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1,
        py: 1,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      <PresenceStatusDropdown
        status={presenceStatus}
        onStatusChange={setPresenceStatus}
      />
    </Box>
  );
};

// ─── Inner layout (inside BrightChatProvider) ───────────────────────────────

const BrightChatLayoutInner: FC<Omit<BrightChatLayoutProps, 'chatApi'>> = ({
  servers,
  activeServerId,
  channelSidebarProps,
  dmSidebarProps,
  serverName,
  activeChannelName,
  onServerSelect,
  onHomeClick,
  onCreateServer,
  children,
}) => {
  const { tBranded: t } = useI18n();
  const contrastText = useTheme().palette.primary.contrastText;
  const isMobile = useMediaQuery(`(max-width:${MOBILE_BREAKPOINT}px)`);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleToggleDrawer = useCallback(() => {
    setMobileDrawerOpen((prev) => !prev);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  const brandConfig = useMemo(
    () => ({
      appName: 'BrightChat',
      logo: (
        <BrightChainSubLogo
          subText="Chat"
          icon={faComment}
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

  const subBar = useMemo(
    () => (
      <BrightChatSubBar
        serverName={serverName}
        channelName={activeChannelName}
      />
    ),
    [serverName, activeChannelName],
  );

  const serverRailProps: ServerRailProps = useMemo(
    () => ({
      servers,
      activeServerId,
      onServerSelect: (id: string) => {
        onServerSelect(id);
        if (isMobile) handleCloseDrawer();
      },
      onHomeClick: () => {
        onHomeClick();
        if (isMobile) handleCloseDrawer();
      },
      onCreateServer,
    }),
    [
      servers,
      activeServerId,
      onServerSelect,
      onHomeClick,
      onCreateServer,
      isMobile,
      handleCloseDrawer,
    ],
  );

  /** Channel sidebar column with user profile area pinned at the bottom */
  const channelSidebarColumn = useMemo(() => {
    // Derive the active server's icon info from the servers list
    const activeServer = activeServerId
      ? servers.find((s) => s.id === activeServerId)
      : undefined;

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: CHANNEL_SIDEBAR_WIDTH,
          minWidth: CHANNEL_SIDEBAR_WIDTH,
        }}
      >
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {activeServerId && serverName ? (
            <ChannelSidebar
              serverName={serverName}
              serverIconUrl={activeServer?.iconUrl}
              serverIconFaClass={activeServer?.iconFaClass}
              {...channelSidebarProps}
              onChannelSelect={(id) => {
                channelSidebarProps.onChannelSelect(id);
                if (isMobile) handleCloseDrawer();
              }}
            />
          ) : dmSidebarProps ? (
            <DMSidebar {...dmSidebarProps} />
          ) : (
            <ChannelSidebar
              serverName={serverName}
              {...channelSidebarProps}
              onChannelSelect={(id) => {
                channelSidebarProps.onChannelSelect(id);
                if (isMobile) handleCloseDrawer();
              }}
            />
          )}
        </Box>
        <UserProfileArea />
      </Box>
    );
  }, [
      servers,
      serverName,
      activeServerId,
      channelSidebarProps,
      dmSidebarProps,
      isMobile,
      handleCloseDrawer,
    ],
  );

  const sidebarContent = (
    <>
      <ServerRail {...serverRailProps} />
      {channelSidebarColumn}
    </>
  );

  // Discord-style three-panel content rendered inside LayoutShell
  const discordContent = (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Desktop: inline sidebar panels */}
      {!isMobile && sidebarContent}

      {/* Mobile: hamburger + drawer overlay */}
      {isMobile && (
        <>
          <IconButton
            onClick={handleToggleDrawer}
            aria-label={t(BrightChatStrings.Layout_OpenNavigation)}
            sx={{ position: 'absolute', zIndex: 1, m: 0.5 }}
          >
            <MenuIcon />
          </IconButton>
          <Drawer
            open={mobileDrawerOpen}
            onClose={handleCloseDrawer}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                width: SERVER_RAIL_WIDTH + CHANNEL_SIDEBAR_WIDTH,
                display: 'flex',
                flexDirection: 'row',
              },
            }}
          >
            {sidebarContent}
          </Drawer>
        </>
      )}

      {/* Chat area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  );

  return (
    <LayoutShell
      brandConfig={brandConfig}
      subBar={subBar}
      shellSx={{ height: 'calc(100vh - 64px)' }}
      contentSx={{ p: 0, width: 'auto', overflow: 'hidden' }}
    >
      {discordContent}
    </LayoutShell>
  );
};

// ─── Outer wrapper ──────────────────────────────────────────────────────────

const BrightChatLayout: FC<BrightChatLayoutProps> = ({ chatApi, ...rest }) => {
  return (
    <BrightChatProvider chatApi={chatApi}>
      <BrightChatLayoutInner {...rest} />
    </BrightChatProvider>
  );
};

export default memo(BrightChatLayout);
