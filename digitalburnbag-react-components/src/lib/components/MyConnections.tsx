import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { formatDateWithBD } from '../utils/formatBrightDate';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import {
  IApiProviderConnectionDTO,
  IApiProviderConnectionsSummaryDTO,
} from '../services/burnbag-api-client';
import {
  ConnectionStatus,
  ProviderConnectionStatus,
} from './ProviderConnectionStatus';

export interface IMyConnectionsProps {
  connections: IApiProviderConnectionDTO[];
  summary: IApiProviderConnectionsSummaryDTO | null;
  isLoading: boolean;
  error?: string;
  onAddProvider: () => void;
  onDisconnect: (connectionId: string) => Promise<void>;
  onCheckNow: (connectionId: string) => Promise<void>;
  onSettings: (connectionId: string) => void;
  onRefresh: () => void;
}

function ConnectionCard({
  connection,
  onDisconnect,
  onCheckNow,
  onSettings,
}: {
  connection: IApiProviderConnectionDTO;
  onDisconnect: (id: string) => Promise<void>;
  onCheckNow: (id: string) => Promise<void>;
  onSettings: (id: string) => void;
}) {
  const { tBranded: t } = useI18n();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCheckNow = async () => {
    handleMenuClose();
    setIsChecking(true);
    try {
      await onCheckNow(connection.id);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDisconnect = async () => {
    handleMenuClose();
    await onDisconnect(connection.id);
  };

  const handleSettings = () => {
    handleMenuClose();
    onSettings(connection.id);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return t(DigitalBurnbagStrings.Provider_NeverChecked);
    return formatDateWithBD(dateStr);
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      {isChecking && <LinearProgress />}
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Avatar */}
          <Avatar
            src={connection.providerAvatarUrl}
            sx={{ width: 48, height: 48 }}
          >
            {connection.providerDisplayName?.[0] ||
              connection.providerUsername?.[0] ||
              connection.providerId[0].toUpperCase()}
          </Avatar>

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {connection.providerDisplayName ||
                  connection.providerUsername ||
                  connection.providerId}
              </Typography>
              <ProviderConnectionStatus
                status={connection.status as ConnectionStatus}
              />
            </Box>

            {connection.providerUsername && connection.providerDisplayName && (
              <Typography variant="body2" color="text.secondary">
                @{connection.providerUsername}
              </Typography>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {t(DigitalBurnbagStrings.Provider_LastChecked).replace(
                '{time}',
                formatTime(connection.lastCheckedAt),
              )}
            </Typography>

            {connection.errorMessage && (
              <Typography variant="caption" color="error" display="block">
                {connection.errorMessage}
              </Typography>
            )}
          </Box>

          {/* Actions menu */}
          <IconButton onClick={handleMenuOpen} size="small">
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleCheckNow}>
              <ListItemIcon>
                <RefreshIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {t(DigitalBurnbagStrings.Provider_CheckNow)}
              </ListItemText>
            </MenuItem>
            <MenuItem onClick={handleSettings}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {t(DigitalBurnbagStrings.Provider_Settings)}
              </ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDisconnect} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <i
                  className="fa-solid fa-unlink"
                  style={{ color: 'inherit' }}
                />
              </ListItemIcon>
              <ListItemText>
                {t(DigitalBurnbagStrings.Common_Disconnect)}
              </ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  summary,
}: {
  summary: IApiProviderConnectionsSummaryDTO;
}) {
  const { tBranded: t } = useI18n();

  const getStatusColor = () => {
    switch (summary.overallStatus) {
      case 'healthy':
        return 'success.main';
      case 'degraded':
        return 'warning.main';
      case 'critical':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  const getStatusText = () => {
    switch (summary.overallStatus) {
      case 'healthy':
        return t(DigitalBurnbagStrings.Summary_Healthy);
      case 'degraded':
        return t(DigitalBurnbagStrings.Summary_Degraded);
      case 'critical':
        return t(DigitalBurnbagStrings.Summary_Critical);
      default:
        return t(DigitalBurnbagStrings.Summary_None);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 3,
        borderLeft: 4,
        borderLeftColor: getStatusColor(),
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ color: getStatusColor() }}>
              {getStatusText()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(DigitalBurnbagStrings.Summary_ConnectedProviders, {
                count: summary.connectedCount,
              })}
              {summary.needsAttentionCount > 0 && (
                <>
                  {' • '}
                  <Typography component="span" color="warning.main">
                    {t(DigitalBurnbagStrings.Summary_NeedsAttention, {
                      count: summary.needsAttentionCount,
                    })}
                  </Typography>
                </>
              )}
            </Typography>
          </Box>
          {summary.lastHeartbeatAt && (
            <Typography variant="caption" color="text.secondary">
              {t(DigitalBurnbagStrings.Summary_LastHeartbeat).replace(
                '{time}',
                formatDateWithBD(summary.lastHeartbeatAt),
              )}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard showing user's connected providers.
 */
export function MyConnections({
  connections,
  summary,
  isLoading,
  error,
  onAddProvider,
  onDisconnect,
  onCheckNow,
  onSettings,
  onRefresh,
}: IMyConnectionsProps) {
  const { tBranded: t } = useI18n();

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button size="small" onClick={onRefresh} sx={{ ml: 2 }}>
          {t(DigitalBurnbagStrings.Common_Retry)}
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {t(DigitalBurnbagStrings.Provider_MyConnections)}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddProvider}
          size="small"
        >
          {t(DigitalBurnbagStrings.Provider_AddProvider)}
        </Button>
      </Box>

      {/* Summary */}
      {isLoading && !summary ? (
        <Skeleton
          variant="rectangular"
          height={80}
          sx={{ mb: 3, borderRadius: 1 }}
        />
      ) : summary ? (
        <SummaryCard summary={summary} />
      ) : null}

      {/* Connections list */}
      {isLoading && connections.length === 0 ? (
        <>
          <Skeleton
            variant="rectangular"
            height={100}
            sx={{ mb: 2, borderRadius: 1 }}
          />
          <Skeleton
            variant="rectangular"
            height={100}
            sx={{ mb: 2, borderRadius: 1 }}
          />
        </>
      ) : connections.length === 0 ? (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {t(DigitalBurnbagStrings.Provider_NoConnections)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t(DigitalBurnbagStrings.Provider_NoConnectionsDesc)}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddProvider}
          >
            {t(DigitalBurnbagStrings.Provider_AddProvider)}
          </Button>
        </Card>
      ) : (
        connections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            onDisconnect={onDisconnect}
            onCheckNow={onCheckNow}
            onSettings={onSettings}
          />
        ))
      )}
    </Box>
  );
}
