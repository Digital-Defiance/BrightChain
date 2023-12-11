# Implementation Plan: Heartbeat History Analytics

## Overview

This plan implements the Heartbeat History Analytics feature by building shared interfaces, the AnalyticsEngine backend service, API endpoints, and React chart/widget components. Tasks are ordered so each step builds on the previous: shared types → backend engine → property tests → API controller → frontend API client methods → React components → integration wiring → final validation.

## Tasks

- [x] 1. Define shared analytics interfaces in digitalburnbag-lib
  - [x] 1.1 Create analytics interfaces file
    - Create `digitalburnbag-lib/src/lib/interfaces/canary-provider/analytics-types.ts`
    - Define `TimeBucketGranularity` type alias (`'1h' | '6h' | '1d'`)
    - Define `ITimeBucket` interface with fields: bucketStart, bucketEnd, signalCounts, totalCount, averageConfidence, averageTimeSinceActivityMs, dominantSignalType
    - Define `IAggregateStats` interface with fields: uptimePercentage, averageResponseTimeMs, failureRate, mtbfMs, failureRateTrend, totalCheckCount, signalDistribution
    - Define `IHeatmapDay` interface with fields: date, dominantSignalType, totalCount, signalCounts
    - Define `IStreakInfo` interface with fields: currentStreakCount, currentStreakSignalType, longestAbsenceDurationMs, timeSinceLastPresenceMs
    - Define `IAnalyticsQueryParams` interface with fields: since, until, signalTypes
    - Define `IComparisonDataset<TID extends PlatformID = string>` interface with fields: connectionId, connectionName, buckets
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1_

  - [x] 1.2 Export analytics interfaces from canary-provider barrel and digitalburnbag-lib root
    - Add exports to `digitalburnbag-lib/src/lib/interfaces/canary-provider/index.ts`
    - Ensure types are accessible from `@brightchain/digitalburnbag-lib`
    - _Requirements: 9.1_

- [x] 2. Implement AnalyticsEngine service in digitalburnbag-api-lib
  - [x] 2.1 Create AnalyticsEngine with `selectGranularity` and `dominantSignal`
    - Create `digitalburnbag-api-lib/src/lib/services/analytics-engine.ts`
    - Implement `static selectGranularity(since, until): TimeBucketGranularity` — ≤48h→'1h', ≤14d→'6h', else→'1d'
    - Implement `static dominantSignal(counts): HeartbeatSignalType` — highest count wins, ties broken by DURESS > CHECK_FAILED > ABSENCE > PRESENCE
    - _Requirements: 1.3, 10.2, 10.5, 6.2_

  - [x] 2.2 Implement `aggregateIntoBuckets`
    - Implement `static aggregateIntoBuckets(entries, since, until, granularity): ITimeBucket[]`
    - Generate continuous bucket boundaries from since to until at the given granularity
    - Assign each entry to exactly one bucket where `bucketStart <= timestamp < bucketEnd`
    - Compute signalCounts, totalCount, averageConfidence, averageTimeSinceActivityMs, dominantSignalType per bucket
    - Include empty buckets (zero counts) for continuity
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 2.3 Implement `computeStatistics`
    - Implement `static computeStatistics(entries, since, until): IAggregateStats`
    - Uptime % = (PRESENCE + ABSENCE) / total * 100
    - Average response time = mean of timeSinceLastActivityMs for PRESENCE entries (excluding nulls)
    - Failure rate = CHECK_FAILED / total * 100
    - MTBF = totalDurationMs / numberOfFailureTransitions (transitions into CHECK_FAILED from non-CHECK_FAILED)
    - Failure rate trend = ((secondHalfRate - firstHalfRate) / firstHalfRate) * 100; null if firstHalfRate is 0
    - Return null fields for empty entry sets
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.4 Implement `computeHeatmap`
    - Implement `static computeHeatmap(entries, since, until): IHeatmapDay[]`
    - Generate one IHeatmapDay per calendar day (UTC) in the range, inclusive of both endpoints' dates
    - Compute signalCounts, totalCount, dominantSignalType per day
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.5 Implement `computeStreakInfo`
    - Implement `static computeStreakInfo(entries, now): IStreakInfo`
    - Current streak: count consecutive entries of same signal type from latest backwards
    - Longest absence duration: max span of contiguous ABSENCE subsequences
    - Time since last presence: now - most recent PRESENCE timestamp; null if no PRESENCE
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 2.6 Implement `formatCSV` and `formatJSON`
    - Implement `static formatCSV(entries): string` — header row + one row per entry with columns: timestamp, signalType, eventCount, confidence, timeSinceLastActivityMs, httpStatusCode, errorMessage
    - Implement `static formatJSON(entries): string` — JSON.stringify the entries array
    - _Requirements: 2.4, 2.5, 2.6_

- [x] 3. Checkpoint — Verify AnalyticsEngine compiles
  - Ensure all AnalyticsEngine methods compile cleanly, ask the user if questions arise.

- [x] 4. Write property-based tests for AnalyticsEngine
  - [x] 4.1 Write property test: Granularity selection correctness
    - **Property 1: Granularity selection correctness**
    - **Validates: Requirements 1.3, 10.2**
    - Create `digitalburnbag-api-lib/src/lib/__tests__/services/analytics-engine.property.spec.ts`
    - Use fast-check with minimum 100 iterations
    - Generate arbitrary date ranges where since < until; assert selectGranularity returns '1h' for ≤48h, '6h' for ≤14d, '1d' otherwise

  - [x] 4.2 Write property test: Aggregation preserves total count
    - **Property 2: Aggregation preserves total count**
    - **Validates: Requirements 10.3**
    - For any entries and valid date range, sum of bucket totalCounts equals count of entries within range

  - [x] 4.3 Write property test: Continuous time axis — correct bucket count
    - **Property 3: Continuous time axis — correct bucket count**
    - **Validates: Requirements 10.4**
    - For any valid date range and granularity, aggregateIntoBuckets returns exactly ceil((until - since) / granularityMs) buckets with no gaps

  - [x] 4.4 Write property test: Entry-to-bucket assignment correctness
    - **Property 4: Entry-to-bucket assignment correctness**
    - **Validates: Requirements 10.1**
    - For any entry with timestamp in [since, until), it is counted in exactly one bucket where bucketStart <= t < bucketEnd

  - [x] 4.5 Write property test: Dominant signal type priority
    - **Property 5: Dominant signal type priority**
    - **Validates: Requirements 6.2, 10.5**
    - For tied counts, dominantSignal returns highest priority (DURESS > CHECK_FAILED > ABSENCE > PRESENCE); for strict max, returns that type

  - [x] 4.6 Write property test: Uptime percentage formula
    - **Property 6: Uptime percentage formula**
    - **Validates: Requirements 3.1**
    - For non-empty entries, uptimePercentage = (PRESENCE + ABSENCE) / total * 100; for empty, null

  - [x] 4.7 Write property test: Average response time formula
    - **Property 7: Average response time formula**
    - **Validates: Requirements 3.2**
    - averageResponseTimeMs equals mean of timeSinceLastActivityMs for PRESENCE entries with non-null values; null when none qualify

  - [x] 4.8 Write property test: Failure rate formula
    - **Property 8: Failure rate formula**
    - **Validates: Requirements 3.3**
    - failureRate = CHECK_FAILED / total * 100 for non-empty; null for empty

  - [x] 4.9 Write property test: MTBF formula
    - **Property 9: MTBF formula**
    - **Validates: Requirements 3.4**
    - mtbfMs = totalDurationMs / numberOfFailureTransitions; null when no transitions

  - [x] 4.10 Write property test: Failure rate trend computation
    - **Property 10: Failure rate trend computation**
    - **Validates: Requirements 3.5**
    - failureRateTrend = ((secondHalfRate - firstHalfRate) / firstHalfRate) * 100; null when firstHalfRate is 0

  - [x] 4.11 Write property test: Heatmap produces correct day count
    - **Property 11: Heatmap produces correct day count**
    - **Validates: Requirements 6.1**
    - computeHeatmap returns exactly one IHeatmapDay per calendar day in range, no missing or duplicate days

  - [x] 4.12 Write property test: Current streak computation with invariants
    - **Property 12: Current streak computation with invariants**
    - **Validates: Requirements 11.1, 11.5**
    - currentStreakCount ≥ 1 for non-empty; equals total when all same type; streak signal type equals most recent entry's type

  - [x] 4.13 Write property test: Longest absence duration
    - **Property 13: Longest absence duration**
    - **Validates: Requirements 11.2**
    - longestAbsenceDurationMs equals max span of contiguous ABSENCE subsequences; null when no ABSENCE

  - [x] 4.14 Write property test: Time since last presence
    - **Property 14: Time since last presence**
    - **Validates: Requirements 8.2, 11.3, 11.4**
    - timeSinceLastPresenceMs = now - most recent PRESENCE timestamp; null when no PRESENCE

  - [x] 4.15 Write property test: JSON export round-trip
    - **Property 15: JSON export round-trip**
    - **Validates: Requirements 2.5**
    - Serializing via formatJSON then parsing back produces equivalent entries

  - [x] 4.16 Write property test: CSV export completeness
    - **Property 16: CSV export completeness**
    - **Validates: Requirements 2.4**
    - CSV output has entries.length + 1 lines; each row has all specified columns

  - [x] 4.17 Write property test: Comparison normalization — identical bucket boundaries
    - **Property 18: Comparison normalization — identical bucket boundaries**
    - **Validates: Requirements 4.4**
    - Multiple entry arrays aggregated with same params produce identical bucketStart/bucketEnd sequences

- [x] 5. Checkpoint — Verify AnalyticsEngine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement AnalyticsController API endpoints
  - [x] 6.1 Create AnalyticsController with route definitions
    - Create `digitalburnbag-api-lib/src/lib/controllers/analytics-controller.ts`
    - Extend `BaseController` following the same pattern as `ProviderController`
    - Define route definitions for all 6 endpoints: timeseries, stats, heatmap, streak, compare, export
    - Implement shared query param parsing (since, until as ISO 8601 dates, signalTypes filter)
    - Implement ownership validation for all endpoints (return 403 for non-owner)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 6.2 Implement GET `/connections/:id/analytics/timeseries` handler
    - Parse since/until query params, auto-select granularity via `AnalyticsEngine.selectGranularity`
    - Fetch entries via `StatusHistoryRepository.getEntriesByConnection`
    - Call `AnalyticsEngine.aggregateIntoBuckets` and return ITimeBucket[]
    - Return 400 for invalid date range (since > until), 404 for missing connection
    - _Requirements: 9.1, 1.3, 10.1, 10.2_

  - [x] 6.3 Implement GET `/connections/:id/analytics/stats` handler
    - Call `AnalyticsEngine.computeStatistics` and return IAggregateStats
    - _Requirements: 9.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 6.4 Implement GET `/connections/:id/analytics/heatmap` handler
    - Call `AnalyticsEngine.computeHeatmap` and return IHeatmapDay[]
    - _Requirements: 9.4, 6.1_

  - [x] 6.5 Implement GET `/connections/:id/analytics/streak` handler
    - Call `AnalyticsEngine.computeStreakInfo` and return IStreakInfo
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 6.6 Implement GET `/analytics/compare` handler
    - Accept `connectionIds` as comma-separated list (max 5)
    - Validate ownership of all connections
    - Aggregate each connection's entries with same since/until/granularity
    - Return IComparisonDataset[] with normalized bucket boundaries
    - Return 400 if >5 connections requested
    - _Requirements: 9.3, 4.2, 4.4_

  - [x] 6.7 Implement GET `/connections/:id/history/export` handler
    - Accept `format=csv|json` query param
    - Accept optional signalTypes filter
    - Call `AnalyticsEngine.formatCSV` or `formatJSON`
    - Set Content-Type (`text/csv` or `application/json`) and Content-Disposition headers
    - Return 400 for invalid format
    - _Requirements: 9.5, 2.4, 2.5, 2.6_

  - [x] 6.8 Register AnalyticsController routes
    - Add AnalyticsController to `digitalburnbag-api-lib/src/lib/controllers/index.ts` exports
    - Wire into route registration in `register-routes.ts` under `/api/providers` prefix
    - _Requirements: 9.1_

- [x] 7. Checkpoint — Verify API endpoints compile and route registration works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Add recharts dependency and extend frontend API client
  - [x] 8.1 Add recharts as a dependency to digitalburnbag-react-components
    - Run `yarn add recharts` in the `digitalburnbag-react-components` directory
    - Verify recharts is added to package.json
    - _Requirements: 1.1, 1.2_

  - [x] 8.2 Add analytics API methods to BurnbagApiClient
    - Add `getTimeSeries(connectionId, since, until)` → `ITimeBucket[]`
    - Add `getAggregateStats(connectionId, since, until)` → `IAggregateStats`
    - Add `getHeatmap(connectionId, since, until)` → `IHeatmapDay[]`
    - Add `getStreakInfo(connectionId)` → `IStreakInfo`
    - Add `getComparison(connectionIds, since, until)` → `IComparisonDataset[]`
    - Add `exportHistory(connectionId, format, since, until, signalTypes?)` → triggers download
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9. Implement frontend utility: ledger search filter
  - [x] 9.1 Create `filterLedgerEntries` utility function
    - Add to `digitalburnbag-react-components/src/lib/utils/provider-utils.ts` or a new `analytics-utils.ts`
    - Implement case-insensitive substring matching against signalType, errorMessage, httpStatusCode
    - Return only entries matching the query; no matching entry excluded
    - _Requirements: 2.3_

  - [x] 9.2 Write property test: Ledger search filtering correctness
    - **Property 17: Ledger search filtering correctness**
    - **Validates: Requirements 2.3**
    - Create test in `digitalburnbag-react-components/src/lib/__tests__/utils/analytics-utils.property.spec.ts`
    - For any entries and query string, filtered result contains only matching entries and excludes no matching entry

- [x] 10. Implement DateRangeSelector component
  - [x] 10.1 Create DateRangeSelector component
    - Create `digitalburnbag-react-components/src/lib/components/DateRangeSelector.tsx`
    - MUI-based control with predefined range buttons: 24h, 7d, 30d, 90d
    - Custom date picker for arbitrary start/end dates
    - Props: `value: { since: Date; until: Date }`, `onChange: (range) => void`
    - _Requirements: 1.4_

- [x] 11. Implement ChartView component
  - [x] 11.1 Create ChartView component
    - Create `digitalburnbag-react-components/src/lib/components/ChartView.tsx`
    - Wrap recharts `ResponsiveContainer` with `LineChart`, `AreaChart`, or `BarChart` based on `chartType` prop
    - Render `ITimeBucket[]` data with color-coded series per signal type using `getSignalTypeColor`
    - Implement tooltip on hover showing bucket timestamp, signal count breakdown, average confidence, total event count
    - Implement click handler for drill-down (emits selected bucket)
    - Support multi-series mode for comparison view (multiple ITimeBucket[] arrays with distinct colors)
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 4.1_

- [x] 12. Implement AlertThresholdOverlay component
  - [x] 12.1 Create AlertThresholdOverlay component
    - Create `digitalburnbag-react-components/src/lib/components/AlertThresholdOverlay.tsx`
    - Render recharts `ReferenceLine` at configured failure threshold with label
    - Render recharts `ReferenceLine` at configured absence threshold
    - Use dashed style, red for critical, amber for warning
    - Render `ReferenceArea` above threshold in semi-transparent warning color when data exceeds threshold
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 13. Implement DrillDownPanel component
  - [x] 13.1 Create DrillDownPanel component
    - Create `digitalburnbag-react-components/src/lib/components/DrillDownPanel.tsx`
    - MUI `Drawer` or `Dialog` that opens when a chart data point is clicked
    - Display all IStatusHistoryEntry records within the clicked bucket
    - Show full fields: timestamp, signal type, event count, confidence, timeSinceLastActivityMs, httpStatusCode, errorMessage
    - Single entry: show details directly; multiple entries: scrollable chronological list with signal type color indicators
    - Provide "View in Ledger" link
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14. Implement HistoryLedger component
  - [x] 14.1 Create HistoryLedger component
    - Create `digitalburnbag-react-components/src/lib/components/HistoryLedger.tsx`
    - MUI `Table` with columns: timestamp, signal type, event count, confidence, timeSinceLastActivityMs, httpStatusCode, errorMessage
    - Pagination with configurable page sizes (25, 50, 100) and total entry count display
    - Search input that calls `filterLedgerEntries` to filter by signal type, error message, HTTP status code
    - Export buttons (CSV, JSON) that trigger download via `BurnbagApiClient.exportHistory`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 15. Implement HeatmapView component
  - [x] 15.1 Create HeatmapView component
    - Create `digitalburnbag-react-components/src/lib/components/HeatmapView.tsx`
    - Custom grid rendering IHeatmapDay[] as colored cells organized into weeks/months
    - Color cells: green=PRESENCE, amber=ABSENCE, red=DURESS, blue-gray=CHECK_FAILED, light gray=no data
    - MUI Tooltip on hover showing date, total check count, signal type breakdown
    - Click handler to filter ledger/chart to that specific day (drill-down)
    - Week labels on vertical axis, month labels on horizontal axis
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 16. Implement DashboardWidgets component
  - [x] 16.1 Create DashboardWidgets component
    - Create `digitalburnbag-react-components/src/lib/components/DashboardWidgets.tsx`
    - Compact MUI Card components showing: current streak (count + signal type), longest absence duration, uptime %, time since last presence
    - Warning styling (amber) when uptime < 95% or absence streak exceeds threshold
    - Critical styling (red) when uptime < 80% or absence streak exceeds 2x threshold
    - Renderable on ProviderDashboard alongside provider cards
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 17. Implement ComparisonView component
  - [x] 17.1 Create ComparisonView component
    - Create `digitalburnbag-react-components/src/lib/components/ComparisonView.tsx`
    - Provider selector (multi-select, max 5 connections)
    - Shared DateRangeSelector applying same time window to all providers
    - Render multi-series ChartView with distinct colors per provider
    - Legend with provider names, colors, and show/hide toggle controls
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 18. Checkpoint — Verify all frontend components compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Wire components into existing views and export from barrel
  - [x] 19.1 Extend ProviderDetailView with analytics components
    - Add DateRangeSelector, ChartView, AlertThresholdOverlay, DrillDownPanel, HeatmapView, HistoryLedger, and DashboardWidgets to ProviderDetailView
    - Fetch analytics data via BurnbagApiClient methods on mount and date range change
    - _Requirements: 1.1, 1.3, 2.1, 5.1, 6.1, 7.1, 8.1_

  - [x] 19.2 Extend ProviderDashboard with DashboardWidgets
    - Add DashboardWidgets to ProviderDashboard showing aggregate metrics across all connections
    - Fetch streak info and stats for each connection
    - _Requirements: 8.5_

  - [x] 19.3 Export all new components from barrel files
    - Add all new components and their prop interfaces to `digitalburnbag-react-components/src/lib/components/index.ts`
    - _Requirements: 1.1, 2.1, 4.1, 5.1, 6.1, 7.1, 8.1_

- [x] 20. Write unit tests for AnalyticsEngine and AnalyticsController
  - [x] 20.1 Write unit tests for AnalyticsEngine
    - Create `digitalburnbag-api-lib/src/lib/__tests__/services/analytics-engine.spec.ts`
    - Test aggregateIntoBuckets with known inputs → expected bucket output
    - Test computeStatistics with known entry set → expected stat values
    - Test computeHeatmap with 3-day range → expected day cells
    - Test computeStreakInfo with known sequences → expected streak/duration
    - Test formatCSV header row, quoting of special chars
    - Test formatJSON valid JSON output
    - Test edge cases: empty entries, single entry, all same signal type, null timeSinceLastActivityMs
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5, 2.4, 2.5_

  - [x] 20.2 Write unit tests for AnalyticsController
    - Create `digitalburnbag-api-lib/src/lib/__tests__/controller-integration/analytics-controller.spec.ts`
    - Test 403 for non-owner on all analytics endpoints
    - Test 400 for invalid params (bad date range, invalid format, >5 connections)
    - Test 200 with correct response shape for each endpoint
    - Test export Content-Type and Content-Disposition headers
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 21. Write unit tests for frontend components
  - [x] 21.1 Write unit tests for React components
    - Test DateRangeSelector predefined buttons emit correct ranges
    - Test ChartView renders with empty data, single point, many points
    - Test HeatmapView renders correct grid dimensions
    - Test HistoryLedger pagination, search, export button clicks
    - Test DashboardWidgets warning/critical styling thresholds
    - Test ComparisonView max 5 provider selection enforcement
    - Test DrillDownPanel opens on click, shows correct entries
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 4.2, 5.1, 6.1, 7.1, 8.3, 8.4_

- [x] 22. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 18 universal correctness properties from the design document (Property 17 for ledger filtering is in the frontend package)
- Unit tests validate specific examples and edge cases
- The AnalyticsEngine uses pure static functions for easy testability with fast-check
- All property tests use minimum 100 iterations per property as per workspace conventions
