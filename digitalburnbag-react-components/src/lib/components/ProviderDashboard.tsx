import type {
  IAggregateStats,
  IStreakInfo,
} from '@brightchain/digitalburnbag-lib';
import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { formatDateWithBD } from '../utils/formatBrightDate';
import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Skeleton,
  Typography,
} from '@mui/material';
import {
  IApiProviderConnectionDTO,
  IApiProviderConnectionsSummaryDTO,
} from '../services/burnbag-api-client';
import {
  getSignalTypeColor,
  getSignalTypeLabel,
} from '../utils/provider-utils';
import { DashboardWidgets } from './DashboardWidgets';

export interface IProviderDashboardProps {
  connections: IApiProviderConnectionDTO[];
  summary: IApiProviderConnectionsSummaryDTO | null;
  isLoading: boolean;
  error?: string;
  onAddProvider: () => void;
  onProviderClick: (connectionId: string) => void;
  onRefresh: () => void;
  /** Optional aggregate streak info across all connections */
  aggregateStreakInfo?: IStreakInfo;
  /** Optional aggregate stats across all connections */
  aggregateStats?: IAggregateStats;
  /** Optional absence threshold in ms for widget styling */
  absenceThresholdMs?: number;
}

function HealthBanner({
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
      data-testid="health-banner"
      sx={{ mb: 3, borderLeft: 4, borderLeftColor: getStatusColor() }}
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
        </Box>
      </CardContent>
    </Card>
  );
}

function DashboardConnectionCard({
  connection,
  onClick,
}: {
  connection: IApiProviderConnectionDTO;
  onClick: () => void;
}) {
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return formatDateWithBD(dateStr);
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardActionArea onClick={onClick}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 40, height: 40 }}>
              {(connection.providerDisplayName ||
                connection.providerUsername ||
                connection.providerId)[0].toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {connection.providerDisplayName ||
                  connection.providerUsername ||
                  connection.providerId}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={connection.status}
                  size="small"
                  color={
                    connection.status === 'connected' ? 'success' : 'default'
                  }
                  variant="outlined"
                />
                {connection.lastCheckResult && (
                  <Chip
                    label={getSignalTypeLabel(connection.lastCheckResult)}
                    size="small"
                    color={getSignalTypeColor(connection.lastCheckResult)}
                    variant="filled"
                  />
                )}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Last checked: {formatTime(connection.lastCheckedAt)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

/**
 * Top-level Provider Dashboard page component.
 * Displays aggregate health, provider cards, and "Add Provider" entry point.
 */
export function ProviderDashboard({
  connections,
  summary,
  isLoading,
  error,
  onAddProvider,
  onProviderClick,
  onRefresh,
  aggregateStreakInfo,
  aggregateStats,
  absenceThresholdMs,
}: IProviderDashboardProps) {
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
    <Box data-testid="provider-dashboard">
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h5">
          {t(DigitalBurnbagStrings.Dashboard_Title)}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddProvider}
          data-testid="add-provider-button"
        >
          {t(DigitalBurnbagStrings.Provider_AddProvider)}
        </Button>
      </Box>

      {/* Health Banner */}
      {isLoading && !summary ? (
        <Skeleton
          variant="rectangular"
          height={80}
          sx={{ mb: 3, borderRadius: 1 }}
        />
      ) : summary ? (
        <HealthBanner summary={summary} />
      ) : null}

      {/* Aggregate Dashboard Widgets */}
      {(aggregateStreakInfo || aggregateStats) && (
        <Box sx={{ mb: 3 }}>
          <DashboardWidgets
            streakInfo={aggregateStreakInfo}
            stats={aggregateStats}
            absenceThresholdMs={absenceThresholdMs}
          />
        </Box>
      )}

      {/* Provider Cards */}
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
          <DashboardConnectionCard
            key={connection.id}
            connection={connection}
            onClick={() => onProviderClick(connection.id)}
          />
        ))
      )}
    </Box>
  );
}
