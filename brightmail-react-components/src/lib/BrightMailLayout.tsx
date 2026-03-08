/**
 * BrightMailLayout — Three-panel shell for BrightMail.
 *
 * Wraps all BrightMail routes with BrightMailProvider context, renders:
 * - Sidebar (permanent on >960px, temporary drawer on ≤960px)
 * - Center content area via <Outlet />
 * - Optional ReadingPane on the right at ≥1280px (~40% width)
 * - ComposeModal via React Portal (placeholder until Task 7)
 * - Hamburger IconButton for toggling sidebar on narrow viewports
 *
 * Requirements: 1.1, 1.2, 1.5, 1.6, 1.8
 */
import MenuIcon from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { FC, memo, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrightMailProvider, useBrightMail } from './BrightMailContext';
import ComposeModal from './ComposeModal';
import ReadingPane from './ReadingPane';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';
import './BrightMail.scss';

// ─── Inner layout (must be inside BrightMailProvider) ───────────────────────

const BrightMailLayoutInner: FC = () => {
  const theme = useTheme();
  const {
    sidebarOpen,
    setSidebarOpen,
    selectedEmailId,
  } = useBrightMail();
  const location = useLocation();
  const navigate = useNavigate();

  // Breakpoints
  const isDesktop = useMediaQuery('(min-width:961px)');
  const isWideDesktop = useMediaQuery('(min-width:1280px)');

  const sidebarVariant = isDesktop ? 'permanent' : 'temporary';

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen, setSidebarOpen]);

  const handleNavigate = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate],
  );

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Sidebar
        open={isDesktop ? true : sidebarOpen}
        onToggle={handleSidebarToggle}
        variant={sidebarVariant}
        activeRoute={location.pathname}
        onNavigate={handleNavigate}
      />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ml: isDesktop ? 0 : 0,
        }}
      >
        {/* Top bar with hamburger on narrow viewports */}
        {!isDesktop && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 1,
              py: 0.5,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <IconButton
              aria-label="Toggle sidebar"
              onClick={handleSidebarToggle}
              edge="start"
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        {/* Content row: center + optional reading pane */}
        <Box
          sx={{
            display: 'flex',
            flexGrow: 1,
            overflow: 'hidden',
          }}
        >
          {/* Center content — Outlet fills remaining space */}
          <Box
            sx={{
              flexGrow: 1,
              flexBasis: 0,
              overflow: 'auto',
              p: 2,
            }}
          >
            <Outlet />
          </Box>

          {/* ReadingPane — only on wide desktops (≥1280px) */}
          {isWideDesktop && (
            <Box
              sx={{
                width: '40%',
                flexShrink: 0,
                borderLeft: 1,
                borderColor: 'divider',
                overflow: 'auto',
              }}
            >
              <ReadingPane emailId={selectedEmailId} />
            </Box>
          )}
        </Box>
      </Box>

      {/* ComposeModal — rendered via React Portal */}
      <ComposeModal />
    </Box>
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
