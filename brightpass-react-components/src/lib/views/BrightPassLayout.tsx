/**
 * BrightPassLayout — Container-only layout for BrightPass.
 *
 * Migrated to use the shared LayoutShell from brightchain-react-components.
 * No sidebar — uses toolbarActions for the vault button.
 */
import { faLock } from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { THEME_COLORS } from '@brightchain/brightchain-lib';
import {
  BrightChainSubLogo,
  LayoutShell,
  SubLogoHeight,
  SubLogoIconHeight,
} from '@brightchain/brightchain-react-components';
import { BrightPassStrings } from '@brightchain/brightpass-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { Button, useTheme } from '@mui/material';
import { FC, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './BrightPass.scss';

const BrightPassLayout: FC = () => {
  const contrastText = useTheme().palette.primary.contrastText;
  const { tBranded: t } = useI18n();
  const navigate = useNavigate();

  const brandConfig = useMemo(
    () => ({
      appName: 'BrightPass',
      logo: (
        <BrightChainSubLogo
          subText="Pass"
          icon={faLock}
          iconColor={contrastText}
          height={SubLogoHeight}
          iconHeight={SubLogoIconHeight}
          leadColor={contrastText}
        />
      ),
      primaryColor: THEME_COLORS.CHAIN_BLUE,
    }),
    [contrastText],
  );

  const toolbarActions = useMemo(
    () => (
      <Button
        variant="contained"
        color="inherit"
        onClick={() => navigate('/brightpass')}
        sx={{ color: 'primary.main' }}
      >
        {t(BrightPassStrings.VaultList_Title)}
      </Button>
    ),
    [navigate, t],
  );

  return (
    <LayoutShell brandConfig={brandConfig} toolbarActions={toolbarActions} />
  );
};

export default memo(BrightPassLayout);
