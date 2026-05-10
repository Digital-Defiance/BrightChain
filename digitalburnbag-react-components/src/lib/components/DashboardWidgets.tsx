import type {
  IAggregateStats,
  IStreakInfo,
} from '@brightchain/digitalburnbag-lib';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useMemo } from 'react';
import { getSignalTypeLabel } from '../utils/provider-utils';

export interface IDashboardWidgetsProps {
  /** Streak information */
  streakInfo?: IStreakInfo;
  /** Aggregate statistics */
  stats?: IAggregateStats;
  /** Absence threshold in ms for warning/critical styling */
  absenceThresholdMs?: number;
}

type Severity = 'normal' | 'warning' | 'critical';

function getSeverityColors(severity: Severity) {
  switch (severity) {
    case 'critical':
      return { borderColor: '#d32f2f', bgcolor: 'rgba(211,47,47,0.04)' };
    case 'warning':
      return { borderColor: '#ed6c02', bgcolor: 'rgba(237,108,2,0.04)' };
    default:
      return { borderColor: 'divider', bgcolor: 'transparent' };
  }
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

interface WidgetData {
  label: string;
  value: string;
  severity: Severity;
}

/**
 * Compact MUI Card widgets showing key metrics at a glance.
 * Applies warning (amber) and critical (red) styling based on thresholds.
 */
export function DashboardWidgets({
  streakInfo,
  stats,
  absenceThresholdMs,
}: IDashboardWidgetsProps) {
  const widgets: WidgetData[] = useMemo(() => {
    const result: WidgetData[] = [];
    const threshold = absenceThresholdMs ?? Infinity;

    // Current streak
    if (streakInfo) {
      const streakLabel = streakInfo.currentStreakSignalType
        ? getSignalTypeLabel(streakInfo.currentStreakSignalType)
        : 'None';
      result.push({
        label: 'Current Streak',
        value: `${streakInfo.currentStreakCount} × ${streakLabel}`,
        severity: 'normal',
      });
    }

    // Longest absence duration
    if (streakInfo) {
      let severity: Severity = 'normal';
      if (streakInfo.longestAbsenceDurationMs != null && threshold < Infinity) {
        if (streakInfo.longestAbsenceDurationMs > threshold * 2) {
          severity = 'critical';
        } else if (streakInfo.longestAbsenceDurationMs > threshold) {
          severity = 'warning';
        }
      }
      result.push({
        label: 'Longest Absence',
        value: formatDuration(streakInfo.longestAbsenceDurationMs),
        severity,
      });
    }

    // Uptime %
    if (stats) {
      let severity: Severity = 'normal';
      if (stats.uptimePercentage != null) {
        if (stats.uptimePercentage < 80) {
          severity = 'critical';
        } else if (stats.uptimePercentage < 95) {
          severity = 'warning';
        }
      }
      result.push({
        label: 'Uptime',
        value:
          stats.uptimePercentage != null
            ? `${stats.uptimePercentage.toFixed(1)}%`
            : '—',
        severity,
      });
    }

    // Time since last presence
    if (streakInfo) {
      result.push({
        label: 'Since Last Presence',
        value: formatDuration(streakInfo.timeSinceLastPresenceMs),
        severity: 'normal',
      });
    }

    return result;
  }, [streakInfo, stats, absenceThresholdMs]);

  if (widgets.length === 0) {
    return null;
  }

  return (
    <Box
      data-testid="dashboard-widgets"
      sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}
    >
      {widgets.map((w) => {
        const colors = getSeverityColors(w.severity);
        return (
          <Card
            key={w.label}
            variant="outlined"
            sx={{
              minWidth: 160,
              flex: '1 1 160px',
              borderLeft: 4,
              borderLeftColor: colors.borderColor,
              bgcolor: colors.bgcolor,
            }}
          >
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                {w.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {w.value}
              </Typography>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
