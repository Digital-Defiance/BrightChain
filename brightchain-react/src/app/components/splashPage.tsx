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
import { FC } from 'react';
import { Link } from 'react-router-dom';
import brightChainLogo from '../../assets/images/BrightChain-Square.svg';

interface ShowcaseCard {
  title: string;
  icon: string;
  description: string;
  path: string;
}

const showcaseCards: ShowcaseCard[] = [
  {
    title: 'Soup Can Demo',
    icon: '🥫',
    description:
      'See how BrightChain breaks data into blocks and mixes them with random data using XOR operations for Owner-Free Storage.',
    path: '/demo',
  },
  {
    title: 'Storage Pools',
    icon: '🗄️',
    description:
      'Explore namespace-isolated pools, content-addressed blocks, pool-scoped whitening, and cross-pool isolation guarantees.',
    path: '/showcase/storage-pools',
  },
  {
    title: 'Messaging',
    icon: '💬',
    description:
      'ECIES-encrypted direct messages, pool-shared group chats, channels with visibility modes, exploding messages, and presence.',
    path: '/showcase/messaging',
  },
  {
    title: 'BrightPass',
    icon: '🔑',
    description:
      'Decentralised password vault with credential storage, password generation, breach checking, and TOTP/2FA setup.',
    path: '/showcase/brightpass',
  },
  {
    title: 'Database',
    icon: '📦',
    description:
      'Document database with copy-on-write blocks, pool isolation, optimistic concurrency transactions, and aggregation pipelines.',
    path: '/showcase/database',
  },
  {
    title: 'Identity & Security',
    icon: '🛡️',
    description:
      'Paper key backup, device management, identity proofs across platforms, and profile search in the public key directory.',
    path: '/showcase/identity',
  },
];

export const SplashPage: FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h3" gutterBottom>
          Welcome to BrightChain
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Next-Generation Decentralized Infrastructure
        </Typography>

        <Box sx={{ my: 4 }}>
          <img
            src={brightChainLogo}
            alt="BrightChain Logo"
            style={{ maxWidth: '200px' }}
          />
        </Box>

        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          sx={{ mb: 4 }}
        >
          <Button
            component={Link}
            to="/demo"
            variant="contained"
            size="large"
          >
            🥫 Try the Soup Can Demo
          </Button>
          <Button
            component={Link}
            to="/register"
            variant="outlined"
            size="large"
          >
            Get Started
          </Button>
        </Stack>
      </Box>

      {/* What is BrightChain */}
      <Box sx={{ maxWidth: '700px', mx: 'auto', mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          What is BrightChain?
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          BrightChain revolutionizes data storage using the &ldquo;Bright Block
          Soup&rdquo; concept. Your files are broken into blocks and mixed with
          random data using XOR operations, making them appear completely random
          while maintaining perfect security.
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              icon: '🔒',
              label: 'Owner-Free Storage',
              text: 'Data appears random, eliminating copyright concerns',
            },
            {
              icon: '⚡',
              label: 'Energy Efficient',
              text: 'No wasteful proof-of-work mining',
            },
            {
              icon: '🌐',
              label: 'Decentralized',
              text: 'Distributed across the network',
            },
            {
              icon: '🎭',
              label: 'Anonymous yet Accountable',
              text: 'Privacy with moderation capabilities',
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
          Explore the Platform
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: 'center', mb: 3 }}
        >
          Interactive demos showcasing BrightChain&rsquo;s core capabilities
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
                    {card.icon} {card.title}
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
                    Launch Demo
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
