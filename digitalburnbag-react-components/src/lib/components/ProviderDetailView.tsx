import type {
  IAggregateStats,
  IHeatmapDay,
  IStreakInfo,
  ITimeBucket,
} from '@brightchain/digitalburnbag-lib';
import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { formatDateWithBD } from '../utils/formatBrightDate';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { IApiProviderConnectionDTO } from '../services/burnbag-api-client';
import {
  getSignalTypeColor,
  getSignalTypeLabel,
} from '../utils/provider-utils';
import { AlertThresholdOverlay } from './AlertThresholdOverlay';
import { ChartView } from './ChartView';
import { DashboardWidgets } from './DashboardWidgets';
import { DateRangeSelector } from './DateRangeSelector';
import { DrillDownPanel } from './DrillDownPanel';
import { HeatmapView } from './HeatmapView';
import { HistoryLedger } from './HistoryLedger';

export interface IStatusHistoryEntryDTO {
  id: string;
  timestamp: string;
  signalType: string;
  eventCount: number;
  confidence: number;
  timeSinceLastActivityMs: number | null;
  httpStatusCode?: number;
  errorMessage?: string;
}

/** Callback-based API for fetching analytics data */
export interface IAnalyticsCallbacks {
  onFetchTimeSeries?: (
    connectionId: string,
    since: Date,
    until: Date,
  ) => Promise<ITimeBucket[]>;
  onFetchStats?: (
    connectionId: string,
    since: Date,
    until: Date,
  ) => Promise<IAggregateStats>;
  onFetchHeatmap?: (
    connectionId: string,
    since: Date,
    until: Date,
  ) => Promise<IHeatmapDay[]>;
  onFetchStreak?: (connectionId: string) => Promise<IStreakInfo>;
  onExportHistory?: (
    connectionId: string,
    format: 'csv' | 'json',
    since?: Date,
    until?: Date,
  ) => Promise<void>;
}

export interface IProviderDetailViewProps {
  connection: IApiProviderConnectionDTO;
  statusHistory: IStatusHistoryEntryDTO[];
  isLoading: boolean;
  onBack: () => void;
  onEdit: (connectionId: string) => void;
  onBindProvider: (connectionId: string) => void;
  /** Optional analytics callbacks for fetching chart/stats data */
  analytics?: IAnalyticsCallbacks;
  /** Optional failure threshold for alert overlay */
  failureThreshold?: number;
  /** Optional absence threshold (ms) for alert overlay */
  absenceThresholdMs?: number;
}

/**
 * Detail view for a single provider connection.
 * Shows status history, configuration, binding management, and analytics.
 */
export function ProviderDetailView({
  connection,
  statusHistory,
  isLoading,
  onBack,
  onEdit,
  onBindProvider,
  analytics,
  failureThreshold,
  absenceThresholdMs,
}: IProviderDetailViewProps) {
  const { tBranded: t } = useI18n();
  const [signalFilter, setSignalFilter] = useState<string>('all');

  // Analytics state
  const [dateRange, setDateRange] = useState<{ since: Date; until: Date }>({
    since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    until: new Date(),
  });
  const [timeSeries, setTimeSeries] = useState<ITimeBucket[]>([]);
  const [stats, setStats] = useState<IAggregateStats | undefined>();
  const [heatmapData, setHeatmapData] = useState<IHeatmapDay[]>([]);
  const [streakInfo, setStreakInfo] = useState<IStreakInfo | undefined>();
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownEntries, setDrillDownEntries] = useState<
    IStatusHistoryEntryDTO[]
  >([]);
  const [drillDownLabel, setDrillDownLabel] = useState<string>('');

  const filteredHistory =
    signalFilter === 'all'
      ? statusHistory
      : statusHistory.filter((e) => e.signalType === signalFilter);

  const formatTime = (dateStr: string) => formatDateWithBD(dateStr);

  // Fetch analytics data when date range changes or on mount
  const fetchAnalytics = useCallback(
    async (range: { since: Date; until: Date }) => {
      if (!analytics) return;
      const id = connection.id;

      const promises: Promise<void>[] = [];

      if (analytics.onFetchTimeSeries) {
        promises.push(
          analytics
            .onFetchTimeSeries(id, range.since, range.until)
            .then(setTimeSeries)
            .catch(() => setTimeSeries([])),
        );
      }
      if (analytics.onFetchStats) {
        promises.push(
          analytics
            .onFetchStats(id, range.since, range.until)
            .then(setStats)
            .catch(() => setStats(undefined)),
        );
      }
      if (analytics.onFetchHeatmap) {
        promises.push(
          analytics
            .onFetchHeatmap(id, range.since, range.until)
            .then(setHeatmapData)
            .catch(() => setHeatmapData([])),
        );
      }
      if (analytics.onFetchStreak) {
        promises.push(
          analytics
            .onFetchStreak(id)
            .then(setStreakInfo)
            .catch(() => setStreakInfo(undefined)),
        );
      }

      await Promise.allSettled(promises);
    },
    [analytics, connection.id],
  );

  useEffect(() => {
    fetchAnalytics(dateRange);
  }, [dateRange, fetchAnalytics]);

  const handleDateRangeChange = useCallback(
    (range: { since: Date; until: Date }) => {
      setDateRange(range);
    },
    [],
  );

  const handleBucketClick = useCallback(
    (bucket: ITimeBucket) => {
      const bucketStart = new Date(bucket.bucketStart).getTime();
      const bucketEnd = new Date(bucket.bucketEnd).getTime();
      const entries = statusHistory.filter((e) => {
        const ts = new Date(e.timestamp).getTime();
        return ts >= bucketStart && ts < bucketEnd;
      });
      setDrillDownEntries(entries);
      setDrillDownLabel(
        `${formatDateWithBD(bucket.bucketStart)} — ${formatDateWithBD(bucket.bucketEnd)}`,
      );
      setDrillDownOpen(true);
    },
    [statusHistory],
  );

  const handleExport = useCallback(
    (format: 'csv' | 'json') => {
      analytics?.onExportHistory?.(
        connection.id,
        format,
        dateRange.since,
        dateRange.until,
      );
    },
    [analytics, connection.id, dateRange],
  );

  const handleHeatmapDayClick = useCallback((date: string) => {
    const dayStart = new Date(date + 'T00:00:00Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');
    setDateRange({ since: dayStart, until: dayEnd });
  }, []);

  const hasAnalytics = !!analytics;

  return (
    <Box data-testid="provider-detail-view">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={onBack} aria-label="back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flex: 1 }}>
          {connection.providerDisplayName ||
            connection.providerUsername ||
            connection.providerId}
        </Typography>
        <Chip
          label={connection.status}
          color={connection.status === 'connected' ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>

      {/* Connection Info */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            {t(DigitalBurnbagStrings.Detail_ConnectionSettings)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Provider: {connection.providerId}
          </Typography>
          {connection.providerUsername && (
            <Typography variant="body2" color="text.secondary">
              Username: @{connection.providerUsername}
            </Typography>
          )}
          {connection.lastCheckedAt && (
            <Typography variant="body2" color="text.secondary">
              Last checked: {formatTime(connection.lastCheckedAt)}
            </Typography>
          )}
          {connection.lastCheckResult && (
            <Box sx={{ mt: 1 }}>
              <Chip
                label={getSignalTypeLabel(connection.lastCheckResult)}
                color={getSignalTypeColor(connection.lastCheckResult)}
                size="small"
              />
            </Box>
          )}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onEdit(connection.id)}
            >
              Edit Settings
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onBindProvider(connection.id)}
            >
              {t(DigitalBurnbagStrings.Binding_BindToProvider)}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Dashboard Widgets (when analytics available) */}
      {hasAnalytics && (
        <Box sx={{ mb: 3 }}>
          <DashboardWidgets
            streakInfo={streakInfo}
            stats={stats}
            absenceThresholdMs={absenceThresholdMs}
          />
        </Box>
      )}

      {/* Analytics Section */}
      {hasAnalytics && (
        <Box sx={{ mb: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Analytics
          </Typography>

          {/* Date Range Selector */}
          <Box sx={{ mb: 2 }}>
            <DateRangeSelector
              value={dateRange}
              onChange={handleDateRangeChange}
            />
          </Box>

          {/* Time-Series Chart */}
          <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Signal Activity
            </Typography>
            <ChartView data={timeSeries} onBucketClick={handleBucketClick}>
              <AlertThresholdOverlay
                failureThreshold={failureThreshold}
                absenceThreshold={absenceThresholdMs}
              />
            </ChartView>
          </Card>

          {/* Heatmap */}
          {heatmapData.length > 0 && (
            <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Activity Heatmap
              </Typography>
              <HeatmapView
                data={heatmapData}
                onDayClick={handleHeatmapDayClick}
              />
            </Card>
          )}

          {/* History Ledger */}
          <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              History Ledger
            </Typography>
            <HistoryLedger
              entries={statusHistory}
              onExport={analytics.onExportHistory ? handleExport : undefined}
            />
          </Card>
        </Box>
      )}

      {/* Drill-Down Panel */}
      <DrillDownPanel
        open={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        entries={drillDownEntries}
        bucketLabel={drillDownLabel}
      />

      {/* Status History (existing) */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6">
            {t(DigitalBurnbagStrings.Detail_StatusHistory)}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>
              {t(DigitalBurnbagStrings.Detail_FilterBySignal)}
            </InputLabel>
            <Select
              value={signalFilter}
              label={t(DigitalBurnbagStrings.Detail_FilterBySignal)}
              onChange={(e) => setSignalFilter(e.target.value)}
              data-testid="signal-filter"
            >
              <MenuItem value="all">
                {t(DigitalBurnbagStrings.Detail_AllSignals)}
              </MenuItem>
              <MenuItem value="presence">Presence</MenuItem>
              <MenuItem value="absence">Absence</MenuItem>
              <MenuItem value="duress">Duress</MenuItem>
              <MenuItem value="check_failed">Check Failed</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Timeline visualization */}
        {filteredHistory.length > 0 && (
          <Box
            data-testid="signal-timeline"
            sx={{
              display: 'flex',
              gap: 0.5,
              mb: 2,
              overflowX: 'auto',
              py: 1,
            }}
          >
            {filteredHistory.map((entry) => (
              <Box
                key={entry.id}
                sx={{
                  width: 8,
                  height: 32,
                  borderRadius: 0.5,
                  bgcolor:
                    entry.signalType === 'presence'
                      ? 'success.main'
                      : entry.signalType === 'absence'
                        ? 'warning.main'
                        : entry.signalType === 'duress'
                          ? 'error.main'
                          : 'info.main',
                  flexShrink: 0,
                }}
                title={`${entry.signalType} at ${entry.timestamp}`}
              />
            ))}
          </Box>
        )}

        {/* History list */}
        {isLoading ? (
          <Typography color="text.secondary">
            {t(DigitalBurnbagStrings.Common_Loading)}
          </Typography>
        ) : filteredHistory.length === 0 ? (
          <Typography color="text.secondary">
            {t(DigitalBurnbagStrings.Detail_NoHistory)}
          </Typography>
        ) : (
          filteredHistory.map((entry) => (
            <Card
              key={entry.id}
              variant="outlined"
              sx={{
                mb: 1,
                borderLeft: 3,
                borderLeftColor:
                  entry.signalType === 'duress'
                    ? 'error.main'
                    : entry.signalType === 'check_failed'
                      ? 'info.main'
                      : entry.signalType === 'absence'
                        ? 'warning.main'
                        : 'success.main',
              }}
              data-testid={`history-entry-${entry.signalType}`}
            >
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={getSignalTypeLabel(entry.signalType)}
                      color={getSignalTypeColor(entry.signalType)}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Events: {entry.eventCount} | Confidence:{' '}
                      {(entry.confidence * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(entry.timestamp)}
                  </Typography>
                </Box>
                {entry.errorMessage && (
                  <Typography variant="caption" color="error" display="block">
                    {entry.errorMessage}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
}
