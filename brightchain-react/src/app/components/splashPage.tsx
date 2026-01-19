import { Box, Button, Container } from '@mui/material';
import { FC } from 'react';
import { Link } from 'react-router-dom';
import brightChainLogo from '../../assets/images/BrightChain-Square.svg';

export const SplashPage: FC = () => {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <h1>Welcome to BrightChain</h1>
        <p>Next-Generation Decentralized Infrastructure</p>

        <Box sx={{ my: 4 }}>
          <img
            src={brightChainLogo}
            alt="BrightChain Logo"
            style={{ maxWidth: '200px' }}
          />
        </Box>

        <Box sx={{ mt: 4 }}>
          <Button
            component={Link}
            to="/demo"
            variant="contained"
            size="large"
            sx={{ mr: 2 }}
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
        </Box>

        <Box sx={{ mt: 4, textAlign: 'left', maxWidth: '600px', mx: 'auto' }}>
          <h2>What is BrightChain?</h2>
          <p>
            BrightChain revolutionizes data storage using the "Bright Block
            Soup" concept. Your files are broken into blocks and mixed with
            random data using XOR operations, making them appear completely
            random while maintaining perfect security.
          </p>
          <ul>
            <li>
              🔒 <strong>Owner-Free Storage:</strong> Data appears random,
              eliminating copyright concerns
            </li>
            <li>
              ⚡ <strong>Energy Efficient:</strong> No wasteful proof-of-work
              mining
            </li>
            <li>
              🌐 <strong>Decentralized:</strong> Distributed across the network
            </li>
            <li>
              🎭 <strong>Anonymous yet Accountable:</strong> Privacy with
              moderation capabilities
            </li>
          </ul>
        </Box>
      </Box>
    </Container>
  );
};
