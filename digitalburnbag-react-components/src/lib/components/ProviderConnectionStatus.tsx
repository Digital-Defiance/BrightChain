import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningIcon from '@mui/icons-material/Warning';
import { Chip, ChipProps } from '@mui/material';
import React from 'react';

export type ConnectionStatus =
  | 'not_connected'
  | 'pending'
  | 'connected'
  | 'expired'
  | 'invalid'
  | 'error';

export interface IProviderConnectionStatusProps {
  status: ConnectionStatus;
  size?: ChipProps['size'];
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    color: ChipProps['color'];
    icon: React.ReactElement | null;
    labelKey: string;
  }
> = {
  connected: {
    color: 'success',
    icon: <CheckCircleIcon fontSize="small" />,
    labelKey: DigitalBurnbagStrings.ProviderStatus_Connected,
  },
  pending: {
    color: 'warning',
    icon: <HourglassEmptyIcon fontSize="small" />,
    labelKey: DigitalBurnbagStrings.ProviderStatus_Pending,
  },
  expired: {
    color: 'warning',
    icon: <WarningIcon fontSize="small" />,
    labelKey: DigitalBurnbagStrings.ProviderStatus_Expired,
  },
  invalid: {
    color: 'error',
    icon: <ErrorIcon fontSize="small" />,
    labelKey: DigitalBurnbagStrings.ProviderStatus_Invalid,
  },
  error: {
    color: 'error',
    icon: <ErrorIcon fontSize="small" />,
    labelKey: DigitalBurnbagStrings.ProviderStatus_Error,
  },
  not_connected: {
    color: 'default',
    icon: null,
    labelKey: DigitalBurnbagStrings.ProviderStatus_NotConnected,
  },
};

/**
 * Status indicator chip for provider connections.
 */
export function ProviderConnectionStatus({
  status,
  size = 'small',
  showIcon = true,
}: IProviderConnectionStatusProps) {
  const { tBranded: t } = useI18n();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_connected;

  return (
    <Chip
      label={t(config.labelKey)}
      color={config.color}
      size={size}
      icon={showIcon && config.icon ? config.icon : undefined}
      variant={status === 'not_connected' ? 'outlined' : 'filled'}
    />
  );
}
