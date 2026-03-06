import {
  BrightChainStrings,
} from '@brightchain/brightchain-lib';
import { BrightChainSubLogo } from '@brightchain/brightchain-react-components';
import { faEnvelope} from '@awesome.me/kit-a20d532681/icons/classic/solid'
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { Box, Button, Container } from '@mui/material';
import { FC, memo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import './BrightMail.scss';

const BrightMailLayout: FC = () => {
  const { tBranded: t } = useI18n();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        my={2}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <BrightChainSubLogo subText="Mail" icon={faEnvelope} height={30} iconHeight={20} />
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
