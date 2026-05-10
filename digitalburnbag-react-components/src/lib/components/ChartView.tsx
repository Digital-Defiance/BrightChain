import type {
  IComparisonDataset,
  ITimeBucket,
} from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import { Box, Typography } from '@mui/material';
import { useCallback, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSignalTypeLabel } from '../utils/provider-utils';

export interface IChartViewProps {
  /** Time-series bucket data */
  data: ITimeBucket[];
  /** Chart type to render */
  chartType?: 'line' | 'area' | 'bar';
  /** Callback when a bucket is clicked for drill-down */
  onBucketClick?: (bucket: ITimeBucket) => void;
  /** Optional comparison datasets for multi-series mode */
  comparisonData?: IComparisonDataset[];
  /** Optional children (e.g. AlertThresholdOverlay) */
  children?: React.ReactNode;
  /** Chart height in pixels */
  height?: number;
}

const SIGNAL_COLORS: Record<string, string> = {
  [HeartbeatSignalType.PRESENCE]: '#2e7d32',
  [HeartbeatSignalType.ABSENCE]: '#ed6c02',
  [HeartbeatSignalType.DURESS]: '#d32f2f',
  [HeartbeatSignalType.CHECK_FAILED]: '#607d8b',
};

const COMPARISON_COLORS = [
  '#1976d2',
  '#9c27b0',
  '#00897b',
  '#f57c00',
  '#5c6bc0',
];

interface ChartDataPoint {
  time: string;
  timestamp: number;
  [HeartbeatSignalType.PRESENCE]: number;
  [HeartbeatSignalType.ABSENCE]: number;
  [HeartbeatSignalType.DURESS]: number;
  [HeartbeatSignalType.CHECK_FAILED]: number;
  totalCount: number;
  averageConfidence: number;
  bucketIndex: number;
  // comparison series keyed by connectionId
  [key: string]: string | number;
}

function formatBucketTime(d: Date): string {
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartDataPoint | undefined;
  if (!d) return null;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        minWidth: 180,
      }}
    >
      <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
        {d.time}
      </Typography>
      {Object.values(HeartbeatSignalType).map((st) => {
        const count = (d as any)[st] as number;
        if (count === 0) return null;
        return (
          <Typography key={st} variant="caption" display="block">
            {getSignalTypeLabel(st)}: {count}
          </Typography>
        );
      })}
      <Typography variant="caption" display="block" color="text.secondary">
        Total: {d.totalCount} | Confidence:{' '}
        {(d.averageConfidence * 100).toFixed(0)}%
      </Typography>
    </Box>
  );
}

/**
 * Recharts-based chart component for rendering ITimeBucket[] data.
 * Supports line, area, and bar chart types with color-coded signal series.
 */
export function ChartView({
  data,
  chartType = 'area',
  onBucketClick,
  comparisonData,
  children,
  height = 350,
}: IChartViewProps) {
  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map((bucket, idx) => {
      const point: ChartDataPoint = {
        time: formatBucketTime(new Date(bucket.bucketStart)),
        timestamp: new Date(bucket.bucketStart).getTime(),
        [HeartbeatSignalType.PRESENCE]:
          bucket.signalCounts[HeartbeatSignalType.PRESENCE] ?? 0,
        [HeartbeatSignalType.ABSENCE]:
          bucket.signalCounts[HeartbeatSignalType.ABSENCE] ?? 0,
        [HeartbeatSignalType.DURESS]:
          bucket.signalCounts[HeartbeatSignalType.DURESS] ?? 0,
        [HeartbeatSignalType.CHECK_FAILED]:
          bucket.signalCounts[HeartbeatSignalType.CHECK_FAILED] ?? 0,
        totalCount: bucket.totalCount,
        averageConfidence: bucket.averageConfidence,
        bucketIndex: idx,
      };

      // Add comparison series
      if (comparisonData) {
        for (const ds of comparisonData) {
          const cBucket = ds.buckets[idx];
          point[`cmp_${ds.connectionId}`] = cBucket?.totalCount ?? 0;
        }
      }

      return point;
    });
  }, [data, comparisonData]);

  const handleClick = useCallback(
    (state: any) => {
      if (!onBucketClick || !state?.activePayload?.length) return;
      const idx = state.activePayload[0]?.payload?.bucketIndex;
      if (idx != null && data[idx]) {
        onBucketClick(data[idx]);
      }
    },
    [onBucketClick, data],
  );

  if (data.length === 0) {
    return (
      <Box data-testid="chart-view-empty" sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No data for selected range
        </Typography>
      </Box>
    );
  }

  const signalTypes = Object.values(HeartbeatSignalType);

  const sharedProps = {
    data: chartData,
    onClick: handleClick,
    margin: { top: 10, right: 20, left: 0, bottom: 0 },
  };

  const renderAxes = () => (
    <>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
    </>
  );

  const renderComparisonSeries = (
    Component: typeof Line | typeof Area | typeof Bar,
  ) =>
    comparisonData?.map((ds, i) => (
      <Component
        key={ds.connectionId}
        type="monotone"
        dataKey={`cmp_${ds.connectionId}`}
        name={ds.connectionName}
        stroke={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
        fill={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
        fillOpacity={0.15}
        strokeWidth={2}
        dot={false}
      />
    ));

  return (
    <Box data-testid="chart-view" sx={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'line' ? (
          <LineChart {...sharedProps}>
            {renderAxes()}
            {children}
            {signalTypes.map((st) => (
              <Line
                key={st}
                type="monotone"
                dataKey={st as string}
                name={getSignalTypeLabel(st)}
                stroke={SIGNAL_COLORS[st]}
                strokeWidth={2}
                dot={false}
              />
            ))}
            {renderComparisonSeries(Line)}
          </LineChart>
        ) : chartType === 'bar' ? (
          <BarChart {...sharedProps}>
            {renderAxes()}
            {children}
            {signalTypes.map((st) => (
              <Bar
                key={st}
                dataKey={st as string}
                name={getSignalTypeLabel(st)}
                fill={SIGNAL_COLORS[st]}
                stackId="signals"
              />
            ))}
            {renderComparisonSeries(Bar)}
          </BarChart>
        ) : (
          <AreaChart {...sharedProps}>
            {renderAxes()}
            {children}
            {signalTypes.map((st) => (
              <Area
                key={st}
                type="monotone"
                dataKey={st as string}
                name={getSignalTypeLabel(st)}
                stroke={SIGNAL_COLORS[st]}
                fill={SIGNAL_COLORS[st]}
                fillOpacity={0.2}
                stackId="signals"
              />
            ))}
            {renderComparisonSeries(Area)}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </Box>
  );
}
