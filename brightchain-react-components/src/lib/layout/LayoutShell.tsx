import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { ThemeOptions, ThemeProvider, createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import deepmerge from '@mui/utils/deepmerge';
import * as React from 'react';
import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { BrandConfigContext } from './BrandConfigContext';
import { LayoutShellProps } from './types';

export const SubLogoHeight = 30;
export const SubLogoIconHeight = 20;

export function LayoutShell({
  brandConfig,
  sidebar,
  subBar,
  titleContent,
  toolbarActions,
  detailPanel,
  children,
}: LayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width:961px)');
  const isWideDesktop = useMediaQuery('(min-width:1280px)');
  const location = useLocation();
  const activeRoute = sidebar?.activeRoute ?? location.pathname;

  const theme = useMemo(() => {
    const base: ThemeOptions = {
      palette: { primary: { main: brandConfig.primaryColor } },
    };
    return createTheme(deepmerge(base, brandConfig.themeOverrides ?? {}));
  }, [brandConfig.primaryColor, brandConfig.themeOverrides]);

  const handleSidebarToggle = React.useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const showHamburger = !isDesktop && !!sidebar;
  const showDetailPanel = isWideDesktop && !!detailPanel;
  const drawerVariant = isDesktop ? 'permanent' : 'temporary';

  return (
    <ThemeProvider theme={theme}>
      <BrandConfigContext.Provider value={brandConfig}>
        <Box
          data-testid="layout-shell"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100vw',
          }}
        >
          {/* AppBar */}
          <AppBar position="static" data-testid="layout-appbar">
            <Toolbar>
              {showHamburger && (
                <IconButton
                  edge="start"
                  color="inherit"
                  aria-label="Toggle navigation"
                  onClick={handleSidebarToggle}
                  data-testid="layout-hamburger"
                  sx={{ mr: 1 }}
                >
                  <MenuIcon />
                </IconButton>
              )}

              {brandConfig.logo ? (
                <Box data-testid="layout-logo">{brandConfig.logo}</Box>
              ) : (
                <Typography
                  variant="h6"
                  component="div"
                  data-testid="layout-appname"
                >
                  {brandConfig.appName}
                </Typography>
              )}

              {titleContent && (
                <Box
                  data-testid="layout-title-content"
                  sx={{
                    ml: 2,
                    minWidth: 0,
                    overflow: 'hidden',
                    flex: '0 1 auto',
                  }}
                >
                  {titleContent}
                </Box>
              )}

              <Box sx={{ flexGrow: 1 }} />

              {toolbarActions && (
                <Box data-testid="layout-toolbar-actions">{toolbarActions}</Box>
              )}
            </Toolbar>
          </AppBar>

          {/* Optional SubBar */}
          {subBar && <Box data-testid="layout-subbar">{subBar}</Box>}

          {/* Content row: optional Sidebar + Content_Area + optional Detail_Panel */}
          <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
            {sidebar && (
              <AppSidebar
                open={sidebarOpen}
                onToggle={handleSidebarToggle}
                variant={drawerVariant}
                activeRoute={activeRoute}
                items={sidebar.items}
                header={sidebar.header}
                footer={sidebar.footer}
                ariaLabel={sidebar.ariaLabel}
                onNavigate={sidebar.onNavigate}
              />
            )}

            <Box
              component="main"
              data-testid="layout-content-area"
              sx={{
                flexGrow: 1,
                overflow: 'auto',
                width: 0,
                p: 2,
              }}
            >
              {children ?? <Outlet />}
            </Box>

            {showDetailPanel && (
              <>
                <Divider orientation="vertical" flexItem />
                <Box
                  data-testid="layout-detail-panel"
                  sx={{
                    width: '40%',
                    flexShrink: 0,
                    overflow: 'auto',
                  }}
                >
                  {detailPanel}
                </Box>
              </>
            )}
          </Box>
        </Box>
      </BrandConfigContext.Provider>
    </ThemeProvider>
  );
}

export default LayoutShell;
