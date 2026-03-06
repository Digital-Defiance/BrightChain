import {
  BrightPassStrings,
} from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { BrightChainSubLogo } from '@brightchain/brightchain-react-components';
import { Box, Button, Container, Typography } from '@mui/material';
import { FC, memo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import './BrightPass.scss';
import { faLock } from '@awesome.me/kit-a20d532681/icons/classic/solid'

const BrightPassLayout: FC = () => {
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
          <BrightChainSubLogo subText="Pass" icon={faLock} height={30} iconHeight={20} />
        </Box>
        <Button
          variant="contained"
          onClick={() => navigate('/brightpass')}
        >
          {t(BrightPassStrings.VaultList_Title)}
        </Button>
      </Box>
      <Outlet />
    </Container>
  );
};

export default memo(BrightPassLayout);
