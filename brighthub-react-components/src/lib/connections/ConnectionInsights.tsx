/**
 * ConnectionInsights Component
 *
 * Displays interaction statistics for a connection with
 * period selection (7 days, 30 days, 90 days, all time).
 *
 * @remarks
 * Implements Requirements 35.13, 61.4
 */

import type { BrightHubStringKey } from '@brightchain/brighthub-lib';
import { BrightHubStrings } from '@brightchain/brighthub-lib';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import React from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Interaction statistics data */
export interface ConnectionInsightsData {
  interactions: number;
  messages: number;
  likes: number;
  reposts: number;
  replies: number;
}

/** Available insight periods */
export type InsightsPeriod = '7d' | '30d' | '90d' | 'all';

/** Props for the ConnectionInsights component */
export interface ConnectionInsightsProps {
  /** Interaction statistics to display */
  data?: ConnectionInsightsData;
  /** Currently selected period */
  period: InsightsPeriod;
  /** Whether data is loading */
  loading?: boolean;
  /** Callback when the period selection changes */
  onPeriodChange?: (period: InsightsPeriod) => void;
}

const PERIOD_OPTIONS: {
  value: InsightsPeriod;
  labelKey: BrightHubStringKey;
}[] = [
  { value: '7d', labelKey: BrightHubStrings.ConnectionInsights_Period7d },
  { value: '30d', labelKey: BrightHubStrings.ConnectionInsights_Period30d },
  { value: '90d', labelKey: BrightHubStrings.ConnectionInsights_Period90d },
  { value: 'all', labelKey: BrightHubStrings.ConnectionInsights_PeriodAllTime },
];

/**
 * ConnectionInsights
 *
 * Renders interaction statistics for a connection with a
 * period selector toggle. Shows counts for interactions,
 * messages, likes, reposts, and replies in a card grid.
 */
export function ConnectionInsights({
  data,
  period,
  loading = false,
  onPeriodChange,
}: ConnectionInsightsProps) {
  const { t } = useBrightHubTranslation();

  const handlePeriodChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPeriod: InsightsPeriod | null,
  ) => {
    if (newPeriod !== null) {
      onPeriodChange?.(newPeriod);
    }
  };

  if (loading && !data) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        aria-label={t(BrightHubStrings.ConnectionInsights_AriaLabel)}
      >
        <CircularProgress
          aria-label={t(BrightHubStrings.ConnectionInsights_Loading)}
        />
      </Box>
    );
  }

  const statItems: {
    labelKey: BrightHubStringKey;
    value: number;
    testId: string;
  }[] = data
    ? [
        {
          labelKey: BrightHubStrings.ConnectionInsights_Interactions,
          value: data.interactions,
          testId: 'stat-interactions',
        },
        {
          labelKey: BrightHubStrings.ConnectionInsights_Messages,
          value: data.messages,
          testId: 'stat-messages',
        },
        {
          labelKey: BrightHubStrings.ConnectionInsights_Likes,
          value: data.likes,
          testId: 'stat-likes',
        },
        {
          labelKey: BrightHubStrings.ConnectionInsights_Reposts,
          value: data.reposts,
          testId: 'stat-reposts',
        },
        {
          labelKey: BrightHubStrings.ConnectionInsights_Replies,
          value: data.replies,
          testId: 'stat-replies',
        },
      ]
    : [];

  return (
    <Box
      aria-label={t(BrightHubStrings.ConnectionInsights_AriaLabel)}
      data-testid="connection-insights"
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t(BrightHubStrings.ConnectionInsights_Title)}
      </Typography>

      {/* Period selector */}
      <ToggleButtonGroup
        value={period}
        exclusive
        onChange={handlePeriodChange}
        size="small"
        sx={{ mb: 2 }}
        aria-label={t(BrightHubStrings.ConnectionInsights_AriaLabel)}
        data-testid="period-selector"
      >
        {PERIOD_OPTIONS.map((opt) => (
          <ToggleButton
            key={opt.value}
            value={opt.value}
            data-testid={`period-${opt.value}`}
          >
            {t(opt.labelKey)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Empty state */}
      {!data && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
          <Typography variant="body1" color="text.secondary">
            {t(BrightHubStrings.ConnectionInsights_EmptyState)}
          </Typography>
        </Box>
      )}

      {/* Statistics grid */}
      {data && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 2,
          }}
          data-testid="stats-grid"
        >
          {statItems.map((item) => (
            <Card
              key={item.testId}
              variant="outlined"
              data-testid={item.testId}
            >
              <CardContent
                sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}
              >
                <Typography variant="h5" component="div">
                  {item.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(item.labelKey)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default ConnectionInsights;
