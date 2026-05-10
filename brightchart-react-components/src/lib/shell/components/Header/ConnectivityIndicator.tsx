/**
 * ConnectivityIndicator — Online/offline status indicator.
 *
 * Uses the browser's navigator.onLine and online/offline events.
 *
 * @module shell/components/Header/ConnectivityIndicator
 */

import { BrightChartStrings } from '@brightchain/brightchart-lib';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { Chip } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';

const CONNECTIVITY_COLORS = {
  online: 'lawngreen',
  offline: '#f44336', // MUI error red
} as const;

export const ConnectivityIndicator: React.FC = () => {
  const { t } = useBrightChartTranslation();
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const statusColor = online
    ? CONNECTIVITY_COLORS.online
    : CONNECTIVITY_COLORS.offline;

  return (
    <Chip
      icon={online ? <WifiIcon /> : <WifiOffIcon />}
      label={
        online
          ? t(BrightChartStrings.Connectivity_Online)
          : t(BrightChartStrings.Connectivity_Offline)
      }
      size="small"
      variant="outlined"
      aria-label={t(BrightChartStrings.Connectivity_StatusTemplate).replace(
        '{STATUS}',
        online
          ? t(BrightChartStrings.Connectivity_Online).toLowerCase()
          : t(BrightChartStrings.Connectivity_Offline).toLowerCase(),
      )}
      sx={{
        color: statusColor,
        borderColor: statusColor,
        '& .MuiChip-icon': { color: statusColor },
      }}
    />
  );
};
