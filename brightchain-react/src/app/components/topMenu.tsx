import { StringNames } from '@brightchain/brightchain-lib';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import { FC, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import brightchainLogo from '../../assets/images/BrightChain-Square-Half-notext.svg';
import { AuthContext } from '../../auth-provider';
import { useAppTranslation } from '../../i18n-provider';
import { BrightChainMenu } from './brightchainMenu';
import { SideMenu } from './sideMenu';
import { UserLanguageSelector } from './userLanguageSelector';
import { UserMenu } from './userMenu';

export const TopMenu: FC = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  const handleOpenSideMenu = () => setIsSideMenuOpen(true);
  const handleCloseSideMenu = () => setIsSideMenuOpen(false);
  const { t } = useAppTranslation();

  return (
    <AppBar position="fixed" sx={{ top: 10 }}>
      <Toolbar>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
          onClick={handleOpenSideMenu}
        >
          <MenuIcon />
        </IconButton>
        <Box
          component="img"
          sx={{
            height: 40,
            width: 40,
            marginRight: 2,
          }}
          alt={`${t(StringNames.Common_Site)} ${t(StringNames.Common_Logo)}`}
          src={brightchainLogo}
        />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {t(StringNames.Common_Site)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isAuthenticated ? (
            <>
              <Button color="inherit" component={Link} to="/dashboard">
                {t(StringNames.Common_Dashboard)}
              </Button>
              <BrightChainMenu />
              <UserMenu />
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                {t(StringNames.Login_LoginButton)}
              </Button>
              <Button color="inherit" component={Link} to="/register">
                {t(StringNames.Register_Button)}
              </Button>
            </>
          )}
          <UserLanguageSelector />
        </Box>
      </Toolbar>
      <SideMenu isOpen={isSideMenuOpen} onClose={handleCloseSideMenu} />
    </AppBar>
  );
};

export default TopMenu;
