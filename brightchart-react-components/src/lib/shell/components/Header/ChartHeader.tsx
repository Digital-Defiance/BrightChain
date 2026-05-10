/**
 * ChartHeader — Sub-header bar for the BrightChart layout.
 *
 * Displays workspace title, notification bell, role switcher,
 * and connectivity indicator.
 *
 * @module shell/components/Header/ChartHeader
 */

import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import React from 'react';
import { useSpecialty } from '../../contexts/SpecialtyContext';
import { ConnectivityIndicator } from './ConnectivityIndicator';
import { NotificationBell } from './NotificationBell';
import { RoleSwitcher } from './RoleSwitcher';

export interface ChartHeaderProps {
  /** Callback when the notification bell is clicked */
  onNotificationClick?: () => void;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({
  onNotificationClick,
}) => {
  const { displayName } = useSpecialty();

  return (
    <AppBar
      position="static"
      color="default"
      elevation={1}
      sx={{ zIndex: (theme) => theme.zIndex.appBar - 1 }}
    >
      <Toolbar variant="dense">
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }} noWrap>
          {displayName}
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <ConnectivityIndicator />
          <RoleSwitcher />
          <NotificationBell onClick={onNotificationClick} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
