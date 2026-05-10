/**
 * BrightChatLayout — Three-panel shell for BrightChat.
 *
 * Migrated to use the shared LayoutShell from brightchain-react-components.
 * Wraps all BrightChat routes with BrightChatProvider context.
 *
 * Requirements: 1.6, 1.7, 1.8
 */
import { faComment } from '@awesome.me/kit-a20d532681/icons/chisel/regular';
import { THEME_COLORS } from '@brightchain/brightchain-lib';
import {
  BrightChainSubLogo,
  LayoutShell,
  SubLogoHeight,
  SubLogoIconHeight,
  type NavItem,
  type SidebarConfig,
} from '@brightchain/brightchain-react-components';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ForumIcon from '@mui/icons-material/Forum';
import GroupIcon from '@mui/icons-material/Group';
import { useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import { FC, memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrightChatProvider } from './BrightChatContext';

// ─── Inner layout (must be inside BrightChatProvider) ───────────────────────

const BrightChatLayoutInner: FC = () => {
  const { tBranded: t } = useI18n();
  const navigate = useNavigate();
  const contrastText = useTheme().palette.primary.contrastText;

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

  const navItems: NavItem[] = useMemo(
    () => [
      {
        route: '/brightchat',
        label: t(BrightChatStrings.Nav_Conversations),
        icon: <ChatBubbleOutlineIcon />,
      },
      {
        route: '/brightchat/groups',
        label: t(BrightChatStrings.Nav_Groups),
        icon: <GroupIcon />,
      },
      {
        route: '/brightchat/channels',
        label: t(BrightChatStrings.Nav_Channels),
        icon: <ForumIcon />,
      },
    ],
    [t],
  );

  const handleNavigate = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate],
  );

  const sidebarConfig: SidebarConfig = useMemo(
    () => ({
      items: navItems,
      header: (
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <BrightChainSubLogo
            subText="Chat"
            icon={faComment}
            height={30}
            iconHeight={20}
          />
        </Box>
      ),
      ariaLabel: t(BrightChatStrings.ChatSectionsLabel),
      onNavigate: handleNavigate,
    }),
    [navItems, handleNavigate, t],
  );

  // Detail panel placeholder — empty for now, BrightChat can populate later
  const detailPanel = <Box />;

  return (
    <LayoutShell
      brandConfig={brandConfig}
      sidebar={sidebarConfig}
      detailPanel={detailPanel}
    />
  );
};

// ─── Outer wrapper providing context ────────────────────────────────────────

const BrightChatLayout: FC = () => {
  return (
    <BrightChatProvider>
      <BrightChatLayoutInner />
    </BrightChatProvider>
  );
};

export default memo(BrightChatLayout);
