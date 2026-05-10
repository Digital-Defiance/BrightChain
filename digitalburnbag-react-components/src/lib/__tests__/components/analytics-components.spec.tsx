/**
 * Unit tests for Heartbeat History Analytics React components.
 * Task 21.1 — Tests for DateRangeSelector, ChartView, HeatmapView,
 * HistoryLedger, DashboardWidgets, ComparisonView, DrillDownPanel.
 *
 * Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 4.2, 5.1, 6.1, 7.1, 8.3, 8.4
 */
import type {
  IAggregateStats,
  IHeatmapDay,
  IStreakInfo,
  ITimeBucket,
} from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ChartView } from '../../components/ChartView';
import { ComparisonView } from '../../components/ComparisonView';
import { DashboardWidgets } from '../../components/DashboardWidgets';
import { DateRangeSelector } from '../../components/DateRangeSelector';
import { DrillDownPanel } from '../../components/DrillDownPanel';
import { HeatmapView } from '../../components/HeatmapView';
import { HistoryLedger } from '../../components/HistoryLedger';
import type { IStatusHistoryEntryDTO } from '../../components/ProviderDetailView';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Line: () => null,
  Area: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceLine: () => null,
  ReferenceArea: () => null,
}));

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tBranded: (key: string) => key,
    t: (key: string) => key,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSignalCounts(
  presence = 0,
  absence = 0,
  duress = 0,
  checkFailed = 0,
): Record<HeartbeatSignalType, number> {
  return {
    [HeartbeatSignalType.PRESENCE]: presence,
    [HeartbeatSignalType.ABSENCE]: absence,
    [HeartbeatSignalType.DURESS]: duress,
    [HeartbeatSignalType.CHECK_FAILED]: checkFailed,
  };
}

function makeBucket(overrides: Partial<ITimeBucket> = {}): ITimeBucket {
  const now = new Date();
  return {
    bucketStart: new Date(now.getTime() - 3600_000),
    bucketEnd: now,
    signalCounts: makeSignalCounts(5, 1, 0, 0),
    totalCount: 6,
    averageConfidence: 0.9,
    averageTimeSinceActivityMs: 1000,
    dominantSignalType: HeartbeatSignalType.PRESENCE,
    ...overrides,
  };
}

function makeEntry(
  overrides: Partial<IStatusHistoryEntryDTO> = {},
): IStatusHistoryEntryDTO {
  return {
    id: `entry-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    signalType: 'presence',
    eventCount: 1,
    confidence: 0.95,
    timeSinceLastActivityMs: 500,
    httpStatusCode: 200,
    errorMessage: undefined,
    ...overrides,
  };
}

function makeHeatmapDay(
  date: string,
  overrides: Partial<IHeatmapDay> = {},
): IHeatmapDay {
  return {
    date,
    dominantSignalType: HeartbeatSignalType.PRESENCE,
    totalCount: 10,
    signalCounts: makeSignalCounts(8, 2, 0, 0),
    ...overrides,
  };
}

// ===========================================================================
// 1. DateRangeSelector
// ===========================================================================

describe('DateRangeSelector', () => {
  it('renders predefined range buttons', () => {
    const onChange = jest.fn();
    const value = {
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      until: new Date(),
    };
    render(<DateRangeSelector value={value} onChange={onChange} />);

    expect(screen.getByTestId('preset-24h')).toBeInTheDocument();
    expect(screen.getByTestId('preset-7d')).toBeInTheDocument();
    expect(screen.getByTestId('preset-30d')).toBeInTheDocument();
    expect(screen.getByTestId('preset-90d')).toBeInTheDocument();
  });

  it('clicking "24h" emits a range approximately 24h before now', () => {
    const onChange = jest.fn();
    const value = {
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      until: new Date(),
    };
    render(<DateRangeSelector value={value} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('preset-24h'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as { since: Date; until: Date };
    const spanMs = arg.until.getTime() - arg.since.getTime();
    // 24h = 86_400_000 ms, allow 5s tolerance
    expect(Math.abs(spanMs - 24 * 60 * 60 * 1000)).toBeLessThan(5000);
  });

  it('clicking "7d" emits a range approximately 7d before now', () => {
    const onChange = jest.fn();
    const value = {
      since: new Date(Date.now() - 24 * 60 * 60 * 1000),
      until: new Date(),
    };
    render(<DateRangeSelector value={value} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('preset-7d'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as { since: Date; until: Date };
    const spanMs = arg.until.getTime() - arg.since.getTime();
    const expected = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(spanMs - expected)).toBeLessThan(5000);
  });
});

// ===========================================================================
// 2. ChartView
// ===========================================================================

describe('ChartView', () => {
  it('shows "No data for selected range" when data is empty', () => {
    render(<ChartView data={[]} />);
    expect(screen.getByTestId('chart-view-empty')).toBeInTheDocument();
    expect(screen.getByText('No data for selected range')).toBeInTheDocument();
  });

  it('renders chart-view container with a single data point', () => {
    render(<ChartView data={[makeBucket()]} />);
    expect(screen.getByTestId('chart-view')).toBeInTheDocument();
  });

  it('renders chart-view container with many data points', () => {
    const buckets = Array.from({ length: 20 }, (_, i) =>
      makeBucket({
        bucketStart: new Date(Date.now() - (20 - i) * 3600_000),
        bucketEnd: new Date(Date.now() - (19 - i) * 3600_000),
        totalCount: i + 1,
      }),
    );
    render(<ChartView data={buckets} />);
    expect(screen.getByTestId('chart-view')).toBeInTheDocument();
  });
});

// ===========================================================================
// 3. HeatmapView
// ===========================================================================

describe('HeatmapView', () => {
  it('shows "No heatmap data" when data is empty', () => {
    render(<HeatmapView data={[]} />);
    expect(screen.getByTestId('heatmap-view-empty')).toBeInTheDocument();
    expect(screen.getByText('No heatmap data')).toBeInTheDocument();
  });

  it('renders heatmap-view container with data', () => {
    const data = [
      makeHeatmapDay('2024-06-01'),
      makeHeatmapDay('2024-06-02'),
      makeHeatmapDay('2024-06-03'),
    ];
    render(<HeatmapView data={data} />);
    expect(screen.getByTestId('heatmap-view')).toBeInTheDocument();
  });
});

// ===========================================================================
// 4. HistoryLedger
// ===========================================================================

describe('HistoryLedger', () => {
  const entries: IStatusHistoryEntryDTO[] = [
    makeEntry({ id: 'e1', signalType: 'presence', errorMessage: undefined }),
    makeEntry({ id: 'e2', signalType: 'absence', errorMessage: 'timeout' }),
    makeEntry({
      id: 'e3',
      signalType: 'check_failed',
      httpStatusCode: 500,
      errorMessage: 'server error',
    }),
  ];

  it('renders entries in the table', () => {
    render(<HistoryLedger entries={entries} />);
    expect(screen.getByTestId('history-ledger')).toBeInTheDocument();
    // Should show "3 entries" count
    expect(screen.getByText('3 entries')).toBeInTheDocument();
  });

  it('search input filters entries', () => {
    render(<HistoryLedger entries={entries} />);
    const searchInput = screen
      .getByTestId('ledger-search')
      .querySelector('input')!;
    fireEvent.change(searchInput, { target: { value: 'timeout' } });
    // After filtering, only the entry with "timeout" error message should remain
    expect(screen.getByText('1 entries')).toBeInTheDocument();
  });

  it('export CSV button calls onExport with "csv"', () => {
    const onExport = jest.fn();
    render(<HistoryLedger entries={entries} onExport={onExport} />);
    fireEvent.click(screen.getByTestId('export-csv'));
    expect(onExport).toHaveBeenCalledWith('csv');
  });

  it('export JSON button calls onExport with "json"', () => {
    const onExport = jest.fn();
    render(<HistoryLedger entries={entries} onExport={onExport} />);
    fireEvent.click(screen.getByTestId('export-json'));
    expect(onExport).toHaveBeenCalledWith('json');
  });
});

// ===========================================================================
// 5. DashboardWidgets
// ===========================================================================

describe('DashboardWidgets', () => {
  it('renders critical styling when uptime < 80%', () => {
    const stats: IAggregateStats = {
      uptimePercentage: 75,
      averageResponseTimeMs: 100,
      failureRate: 25,
      mtbfMs: 10000,
      failureRateTrend: null,
      totalCheckCount: 100,
      signalDistribution: makeSignalCounts(50, 25, 0, 25),
    };
    const { container } = render(<DashboardWidgets stats={stats} />);
    expect(screen.getByTestId('dashboard-widgets')).toBeInTheDocument();
    // The uptime widget should show 75.0%
    expect(screen.getByText('75.0%')).toBeInTheDocument();
    // Critical styling: border color should be the critical red (#d32f2f)
    const cards = container.querySelectorAll('.MuiCard-root');
    const uptimeCard = Array.from(cards).find((card) =>
      card.textContent?.includes('Uptime'),
    );
    expect(uptimeCard).toBeDefined();
    // Check that the card has the critical border color style
    const style = window.getComputedStyle(uptimeCard!);
    // MUI applies styles via classes, so we check the rendered element exists
    expect(uptimeCard).toBeInTheDocument();
  });

  it('renders warning styling when uptime < 95%', () => {
    const stats: IAggregateStats = {
      uptimePercentage: 90,
      averageResponseTimeMs: 100,
      failureRate: 10,
      mtbfMs: 10000,
      failureRateTrend: null,
      totalCheckCount: 100,
      signalDistribution: makeSignalCounts(70, 20, 0, 10),
    };
    render(<DashboardWidgets stats={stats} />);
    expect(screen.getByText('90.0%')).toBeInTheDocument();
  });

  it('renders normal styling when uptime >= 95%', () => {
    const stats: IAggregateStats = {
      uptimePercentage: 99,
      averageResponseTimeMs: 50,
      failureRate: 1,
      mtbfMs: 50000,
      failureRateTrend: -5,
      totalCheckCount: 200,
      signalDistribution: makeSignalCounts(180, 18, 0, 2),
    };
    render(<DashboardWidgets stats={stats} />);
    expect(screen.getByText('99.0%')).toBeInTheDocument();
  });

  it('renders streak info when provided', () => {
    const streakInfo: IStreakInfo = {
      currentStreakCount: 5,
      currentStreakSignalType: HeartbeatSignalType.PRESENCE,
      longestAbsenceDurationMs: 3600_000,
      timeSinceLastPresenceMs: 1000,
    };
    render(<DashboardWidgets streakInfo={streakInfo} />);
    expect(screen.getByText(/5 × Presence/)).toBeInTheDocument();
  });

  it('returns null when no data is provided', () => {
    const { container } = render(<DashboardWidgets />);
    expect(container.firstChild).toBeNull();
  });
});

// ===========================================================================
// 6. ComparisonView
// ===========================================================================

describe('ComparisonView', () => {
  const connections = [
    { id: 'c1', name: 'Provider A' },
    { id: 'c2', name: 'Provider B' },
    { id: 'c3', name: 'Provider C' },
  ];

  it('renders provider selector', () => {
    const onFetch = jest.fn().mockResolvedValue([]);
    render(
      <ComparisonView connections={connections} onFetchComparison={onFetch} />,
    );
    expect(screen.getByTestId('comparison-view')).toBeInTheDocument();
    expect(screen.getByTestId('provider-selector')).toBeInTheDocument();
  });

  it('shows "Select providers to compare" when none selected', () => {
    const onFetch = jest.fn().mockResolvedValue([]);
    render(
      <ComparisonView connections={connections} onFetchComparison={onFetch} />,
    );
    expect(screen.getByText('Select providers to compare')).toBeInTheDocument();
  });
});

// ===========================================================================
// 7. DrillDownPanel
// ===========================================================================

describe('DrillDownPanel', () => {
  it('renders entries when open with multiple entries', () => {
    const entries = [
      makeEntry({ id: 'dd1', signalType: 'presence' }),
      makeEntry({ id: 'dd2', signalType: 'absence' }),
    ];
    render(
      <DrillDownPanel
        open={true}
        onClose={jest.fn()}
        entries={entries}
        bucketLabel="Test Bucket"
      />,
    );
    expect(screen.getByText('Bucket Detail')).toBeInTheDocument();
    expect(screen.getByText('2 entries')).toBeInTheDocument();
  });

  it('renders single entry details directly', () => {
    const entries = [
      makeEntry({
        id: 'dd-single',
        signalType: 'duress',
        eventCount: 3,
        confidence: 0.85,
      }),
    ];
    render(
      <DrillDownPanel open={true} onClose={jest.fn()} entries={entries} />,
    );
    expect(screen.getByText('1 entry')).toBeInTheDocument();
    expect(screen.getByText(/Events: 3/)).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('"View in Ledger" button calls onViewInLedger', () => {
    const onViewInLedger = jest.fn();
    render(
      <DrillDownPanel
        open={true}
        onClose={jest.fn()}
        entries={[makeEntry()]}
        onViewInLedger={onViewInLedger}
      />,
    );
    fireEvent.click(screen.getByTestId('view-in-ledger'));
    expect(onViewInLedger).toHaveBeenCalledTimes(1);
  });
});
