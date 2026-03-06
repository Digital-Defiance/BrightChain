import { faCircleNodes } from '@awesome.me/kit-a20d532681/icons/classic/thin';
import { BrightHubStrings } from '@brightchain/brightchain-lib';
import { BrightChainSubLogo } from '@brightchain/brightchain-react-components';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { Box, Button, Container } from '@mui/material';
import { FC, memo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import './BrightHub.scss';

const BrightHubLayout: FC = () => {
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
          <BrightChainSubLogo
            subText="Hub"
            icon={faCircleNodes}
            height={30}
            iconHeight={20}
          />
        </Box>
        <Button variant="contained" onClick={() => navigate('/brighthub')}>
          {t(BrightHubStrings.MessagingInbox_Title)}
        </Button>
      </Box>
      <Outlet />
    </Container>
  );
};

export default memo(BrightHubLayout);
