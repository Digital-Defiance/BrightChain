import {
  BrightChainComponentId,
  BrightChainStrings,
} from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { Mail as MailIcon } from '@mui/icons-material';
import { Box, Button, Container, Typography } from '@mui/material';
import { FC, memo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const BrightMailLayout: FC = () => {
  const { tComponent } = useI18n();
  const navigate = useNavigate();

  const t = (key: string) => tComponent(BrightChainComponentId, key);

  return (
    <Container maxWidth="lg">
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        my={2}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <MailIcon color="primary" />
          <Typography variant="h5" component="h1">
            {t(BrightChainStrings.BrightMail_MenuLabel)}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => navigate('/brightmail/compose')}
        >
          {t(BrightChainStrings.BrightMail_Compose_Title)}
        </Button>
      </Box>
      <Outlet />
    </Container>
  );
};

export default memo(BrightMailLayout);
