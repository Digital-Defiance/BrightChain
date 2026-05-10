/**
 * BrightMailLayout — Three-panel shell for BrightMail.
 *
 * Migrated to use the shared LayoutShell from brightchain-react-components.
 * Wraps all BrightMail routes with BrightMailProvider context.
 *
 * Requirements: 1.1, 1.2, 1.5, 1.6, 1.8
 */
import { faEnvelope } from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { THEME_COLORS } from '@brightchain/brightchain-lib';
import {
  BrightChainSubLogo,
  LayoutShell,
  SubLogoHeight,
  SubLogoIconHeight,
  type NavItem,
  type SidebarConfig,
} from '@brightchain/brightchain-react-components';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon from '@mui/icons-material/Delete';
import DraftsIcon from '@mui/icons-material/Drafts';
import EditIcon from '@mui/icons-material/Edit';
import InboxIcon from '@mui/icons-material/Inbox';
import LabelIcon from '@mui/icons-material/Label';
import SendIcon from '@mui/icons-material/Send';
import { useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import { FC, memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './BrightMail.scss';
import { BrightMailProvider, useBrightMail } from './BrightMailContext';
import ComposeModal from './ComposeModal';
import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';
import ReadingPane from './ReadingPane';

// ─── Inner layout (must be inside BrightMailProvider) ───────────────────────

const BrightMailLayoutInner: FC = () => {
  const contrastText = useTheme().palette.primary.contrastText;
  const { openCompose, selectedEmailId } = useBrightMail();
  const { t } = useBrightMailTranslation();
  const navigate = useNavigate();

  const brandConfig = useMemo(
    () => ({
      appName: 'BrightMail',
      logo: (
        <BrightChainSubLogo
          subText="Mail"
          icon={faEnvelope}
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
        route: '/brightmail',
        label: t(BrightMailStrings.Nav_Inbox),
        icon: <InboxIcon />,
      },
      {
        route: '/brightmail/sent',
        label: t(BrightMailStrings.Nav_Sent),
        icon: <SendIcon />,
      },
      {
        route: '/brightmail/drafts',
        label: t(BrightMailStrings.Nav_Drafts),
        icon: <DraftsIcon />,
      },
      {
        route: '/brightmail/trash',
        label: t(BrightMailStrings.Nav_Trash),
        icon: <DeleteIcon />,
      },
      {
        route: '/brightmail/labels',
        label: t(BrightMailStrings.Nav_Labels),
        icon: <LabelIcon />,
      },
      {
        route: '/brightmail/calendar',
        label: t(BrightMailStrings.Nav_Calendar),
        icon: <CalendarMonthIcon />,
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

  const sidebarHeader = useMemo(
    () => (
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <BrightChainSubLogo
          subText="Mail"
          icon={faEnvelope}
          height={30}
          iconHeight={20}
        />
        <Box sx={{ mt: 2 }}>
          <Fab
            color="primary"
            variant="extended"
            onClick={() => openCompose()}
            aria-label={t(BrightMailStrings.Nav_Compose)}
            sx={{ width: '100%', textTransform: 'none' }}
          >
            <EditIcon sx={{ mr: 1 }} />
            {t(BrightMailStrings.Nav_Compose)}
          </Fab>
        </Box>
      </Box>
    ),
    [openCompose, t],
  );

  const sidebarConfig: SidebarConfig = useMemo(
    () => ({
      items: navItems,
      header: sidebarHeader,
      ariaLabel: t(BrightMailStrings.Nav_MailFolders),
      onNavigate: handleNavigate,
    }),
    [navItems, sidebarHeader, handleNavigate, t],
  );

  const detailPanel = useMemo(
    () => <ReadingPane emailId={selectedEmailId} />,
    [selectedEmailId],
  );

  return (
    <>
      <LayoutShell
        brandConfig={brandConfig}
        sidebar={sidebarConfig}
        detailPanel={detailPanel}
      />
      <ComposeModal />
    </>
  );
};

// ─── Outer wrapper providing context ────────────────────────────────────────

const BrightMailLayout: FC = () => {
  return (
    <BrightMailProvider>
      <BrightMailLayoutInner />
    </BrightMailProvider>
  );
};

export default memo(BrightMailLayout);
