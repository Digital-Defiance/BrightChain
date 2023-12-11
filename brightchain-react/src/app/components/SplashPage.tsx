import { BrightChainStrings, THEME_COLORS } from '@brightchain/brightchain-lib';
import { BrightChainLogoI18N } from '@brightchain/brightchain-react-components';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { FC, JSX } from 'react';
import { Link } from 'react-router-dom';

interface ShowcaseCard {
  logo?: JSX.Element;
  title: string;
  icon: string;
  description: string;
  path: string;
}

export const SplashPage: FC = () => {
  const { tBranded: t } = useI18n();
  const showcaseCards: ShowcaseCard[] = [
    {
      title: t(BrightChainStrings.Splash_SoupCanDemo),
      icon: '🥫',
      description: t(BrightChainStrings.Splash_SoupCanDemoDescription),
      path: '/demo',
    },
    {
      title: t(BrightChainStrings.Splash_StoragePools),
      icon: '🗄️',
      description: t(BrightChainStrings.Splash_StoragePoolsDescription),
      path: '/showcase/storage-pools',
    },
    {
      logo: (
        <img
          src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightchat.png"
          height="40"
          width="187"
        />
      ),
      title: t(BrightChainStrings.Splash_Messaging),
      icon: '💬',
      description: t(BrightChainStrings.Splash_MessagingDescription),
      path: '/showcase/messaging',
    },
    {
      logo: (
        <img
          src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightpass.png"
          height="40"
          width="187"
        />
      ),
      title: t(BrightChainStrings.Splash_BrightPass),
      icon: '🔑',
      description: t(BrightChainStrings.Splash_BrightPassDescription),
      path: '/showcase/brightpass',
    },
    {
      logo: (
        <img
          src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightdb.png"
          height="40"
          width="187"
        />
      ),
      title: t(BrightChainStrings.Splash_Database),
      icon: '📦',
      description: t(BrightChainStrings.Splash_DatabaseDescription),
      path: '/showcase/database',
    },
    {
      logo: (
        <img
          src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightid.png"
          height="40"
          width="187"
        />
      ),
      title: t(BrightChainStrings.Splash_IdentityAndSecurity),
      icon: '🛡️',
      description: t(BrightChainStrings.Splash_IdentityAndSecurityDescription),
      path: '/showcase/identity',
    },
  ];
  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h3" gutterBottom>
          {t(BrightChainStrings.Splash_Welcome)}
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {t(BrightChainStrings.Splash_NextGenInfrastructure)}
        </Typography>

        <Box sx={{ my: 4 }}>
          <BrightChainLogoI18N
            primaryColor={THEME_COLORS.CHAIN_BLUE_DARK}
            secondaryColor={THEME_COLORS.CHAIN_BLUE_LIGHT}
            taglineColor={THEME_COLORS.TAGLINE_DARK_COLOR}
            height={40}
            width={200}
          />
        </Box>

        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          sx={{ mb: 4 }}
        >
          <Button component={Link} to="/demo" variant="contained" size="large">
            🥫 {t(BrightChainStrings.Splash_TrySoupCanDemo)}
          </Button>
          <Button
            component={Link}
            to="/register"
            variant="outlined"
            size="large"
          >
            {t(BrightChainStrings.Splash_GetStarted)}
          </Button>
        </Stack>
      </Box>

      {/* What is BrightChain */}
      <Box sx={{ maxWidth: '700px', mx: 'auto', mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          {t(BrightChainStrings.Splash_WhatIsBrightChain)}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {t(BrightChainStrings.Splash_WhatIsBrightChainDescription)}
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              icon: '🔒',
              label: t(BrightChainStrings.Splash_OwnerFreeStorage),
              text: t(BrightChainStrings.Splash_OwnerFreeStorageDescription),
            },
            {
              icon: '⚡',
              label: t(BrightChainStrings.Splash_EnergyEfficient),
              text: t(BrightChainStrings.Splash_EnergyEfficientDescription),
            },
            {
              icon: '🌐',
              label: t(BrightChainStrings.Splash_Decentralized),
              text: t(BrightChainStrings.Splash_DecentralizedDescription),
            },
            {
              icon: '🎭',
              label: t(BrightChainStrings.Splash_AnonymousYetAccountable),
              text: t(
                BrightChainStrings.Splash_AnonymousYetAccountableDescription,
              ),
            },
          ].map((item) => (
            <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2">
                    {item.icon} {item.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Not a Cryptocurrency */}
      <Box
        sx={{
          maxWidth: '700px',
          mx: 'auto',
          mb: 6,
          p: 3,
          borderRadius: 2,
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="h5" gutterBottom>
          🚫 {t(BrightChainStrings.Splash_NotACryptocurrency)}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {t(BrightChainStrings.Splash_NotACryptocurrencyDescription)}
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              icon: '💰',
              label: t(BrightChainStrings.Splash_NoCurrency),
              text: t(BrightChainStrings.Splash_NoCurrencyDescription),
            },
            {
              icon: '⛏️',
              label: t(BrightChainStrings.Splash_NoMining),
              text: t(BrightChainStrings.Splash_NoMiningDescription),
            },
            {
              icon: '⚡',
              label: t(BrightChainStrings.Splash_Joules),
              text: t(BrightChainStrings.Splash_JoulesDescription),
            },
            {
              icon: '📐',
              label: t(BrightChainStrings.Splash_RealWorldValue),
              text: t(BrightChainStrings.Splash_RealWorldValueDescription),
            },
          ].map((item) => (
            <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2">
                    {item.icon} {item.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Build with BrightStack */}
      <Box sx={{ maxWidth: '700px', mx: 'auto', mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          🚀 {t(BrightChainStrings.Splash_BuildWithBrightStack)}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {t(BrightChainStrings.Splash_BuildWithBrightStackDescription)}
        </Typography>
        <Typography
          variant="subtitle1"
          color="primary"
          sx={{ fontStyle: 'italic', mb: 2 }}
        >
          {t(BrightChainStrings.Splash_BrightStackSubtitle)}
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              icon: '🗄️',
              label: t(BrightChainStrings.Splash_BrightDb),
              text: t(BrightChainStrings.Splash_BrightDbDescription),
            },
            {
              icon: '🔌',
              label: t(BrightChainStrings.Splash_FamiliarApi),
              text: t(BrightChainStrings.Splash_FamiliarApiDescription),
            },
            {
              icon: '🏗️',
              label: t(BrightChainStrings.Splash_BuiltOnBrightStack),
              text: t(BrightChainStrings.Splash_BuiltOnBrightStackDescription),
            },
            {
              icon: '🌍',
              label: t(BrightChainStrings.Splash_OpenSource),
              text: t(BrightChainStrings.Splash_OpenSourceDescription),
            },
          ].map((item) => (
            <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2">
                    {item.icon} {item.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Showcase Demos */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
          {t(BrightChainStrings.Splash_ExploreThePlatform)}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: 'center', mb: 3 }}
        >
          {t(BrightChainStrings.Splash_InteractiveDemos)}
        </Typography>
        <Grid container spacing={3}>
          {showcaseCards.map((card) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.path}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 4 },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {card.logo || `${card.icon} ${card.title}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    component={Link}
                    to={card.path}
                    variant="outlined"
                    fullWidth
                  >
                    {t(BrightChainStrings.Splash_LaunchDemo)}
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};
