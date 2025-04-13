import { Box, Container } from '@mui/material';
import { FC } from 'react';
import brightChainLogo from '../../assets/images/BrightChain-Square.svg';

export const SplashPage: FC = () => {
  return (
    <Container>
      <Box>
        <h1>Welcome brightchain-react</h1>
      </Box>
      <Box>{brightChainLogo}</Box>
    </Container>
  );
};
