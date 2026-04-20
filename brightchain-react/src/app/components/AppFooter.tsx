import { BrightChainStrings } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { Box, Button, Typography } from '@mui/material';
import { FC } from 'react';
import { Link } from 'react-router-dom';

export const AppFooter: FC = () => {
  const { tBranded: t } = useI18n();

  return (
    <Box
      component="footer"
      sx={{
        textAlign: 'center',
        py: 3,
        mt: 4,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Button
        href="https://github.brightchain.org/docs"
        variant="text"
        size="small"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t(BrightChainStrings.Splash_Documentation)}
      </Button>
      <Button
        href="https://github.brightchain.org/faq"
        variant="text"
        size="small"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t(BrightChainStrings.Splash_FAQ)}
      </Button>
      <Button
        href="https://github.brightchain.org/privacy"
        variant="text"
        size="small"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t(BrightChainStrings.Splash_PrivacyPolicy)}
      </Button>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mt: 1 }}
      >
        © 2026 DigitalDefiance, JessicaMulein
      </Typography>
    </Box>
  );
};
