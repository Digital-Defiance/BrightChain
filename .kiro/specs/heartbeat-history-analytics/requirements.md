# Requirements Document

## Introduction

The Heartbeat History Analytics feature extends the existing Canary Provider System's minimal signal timeline (colored bars in ProviderDetailView) into a full-featured charting, analytics, and ledger management subsystem. Users gain time-series visualizations, exportable history ledgers, aggregate statistics, multi-provider comparison views, alert threshold overlays, heatmap/calendar views, drill-down capabilities, and dashboard metric widgets. The feature builds on the existing `IStatusHistoryEntry` data model, `BrightDBStatusHistoryRepository`, and `GET /api/providers/connections/:id/history` endpoint.

## Glossary

- **Analytics_Engine**: The backend service that computes aggregate statistics, time-series data points, and derived metrics from raw `IStatusHistoryEntry` records
- **Chart_View**: A React component that renders time-series heartbeat data as line, area, or bar charts with configurable date ranges and signal type filtering
- **History_Ledger**: The paginated, searchable, exportable table view of raw `IStatusHistoryEntry` records for a provider connection
- **Aggregate_Statistics**: Computed metrics derived from status history including uptime percentage, average response time, failure rate trends, and mean time between failures (MTBF)
- **Comparison_View**: A chart overlay that displays heartbeat signal data from multiple provider connections simultaneously for cross-provider analysis
- **Alert_Threshold_Overlay**: A visual layer on charts that renders configured alert thresholds (e.g., failure rate limits, absence duration limits) as reference lines or shaded regions
- **Heatmap_View**: A calendar-style grid visualization showing heartbeat activity density and signal type distribution across days/weeks/months
- **Drill_Down**: The interaction pattern where clicking a data point on a chart navigates to the individual `IStatusHistoryEntry` detail for that check
- **Dashboard_Widget**: A compact metric display component showing a single key statistic (e.g., current streak, longest absence, uptime percentage) at a glance
- **Date_Range_Selector**: A UI control that allows the user to select predefined (24h, 7d, 30d, 90d) or custom date ranges for chart and ledger queries
- **Time_Bucket**: A time interval (e.g., 1 hour, 6 hours, 1 day) used to aggregate raw entries into chart data points
- **Uptime_Percentage**: The ratio of successful checks (PRESENCE + ABSENCE) to total checks within a date range, expressed as a percentage
- **MTBF**: Mean Time Between Failures — the average duration between consecutive CHECK_FAILED events within a date range
- **Signal_Distribution**: The count or percentage breakdown of each HeartbeatSignalType within a date range

## Requirements

### Requirement 1: Time-Series Chart Visualization

**User Story:** As a DigitalBurnbag user, I want to view my heartbeat check results as time-series charts (line, area, or bar), so that I can visually identify patterns, trends, and anomalies in my provider activity over time.

#### Acceptance Criteria

1. WHEN the user navigates to a provider's detail view, THE Chart_View SHALL render a time-series chart displaying heartbeat signal types over the selected date range with one data point per Time_Bucket
2. THE Chart_View SHALL support three chart types: line chart (signal confidence over time), area chart (event count over time), and bar chart (signal type distribution per Time_Bucket)
3. WHEN the user selects a date range via the Date_Range_Selector, THE Chart_View SHALL re-render with data filtered to the selected range and an appropriate Time_Bucket granularity (1 hour for 24h, 6 hours for 7d, 1 day for 30d/90d)
4. THE Date_Range_Selector SHALL offer predefined ranges (last 24 hours, last 7 days, last 30 days, last 90 days) and a custom date picker for arbitrary start and end dates
5. THE Chart_View SHALL color-code data points by signal type using the existing `getSignalTypeColor` mapping (PRESENCE=success/green, ABSENCE=warning/amber, DURESS=error/red, CHECK_FAILED=info/blue)
6. WHEN the user hovers over a data point on the chart, THE Chart_View SHALL display a tooltip showing the Time_Bucket timestamp, signal type count breakdown, average confidence, and total event count for that bucket

### Requirement 2: Exportable History Ledger

**User Story:** As a DigitalBurnbag user, I want to browse, search, and export my heartbeat check history as a paginated ledger, so that I can audit system behavior and share records externally.

#### Acceptance Criteria

1. THE History_Ledger SHALL display `IStatusHistoryEntry` records in a paginated table with columns: timestamp, signal type, event count, confidence, time since last activity, HTTP status code, and error message
2. THE History_Ledger SHALL support pagination with configurable page sizes (25, 50, 100 entries per page) and display total entry count
3. WHEN the user enters a search query, THE History_Ledger SHALL filter entries by matching against signal type, error message text, or HTTP status code
4. THE History_Ledger SHALL support export to CSV format containing all visible columns for the current filter and date range selection
5. THE History_Ledger SHALL support export to JSON format containing the full `IStatusHistoryEntry` data for the current filter and date range selection
6. WHEN the user initiates an export, THE Analytics_Engine SHALL generate the export file on the server and return it as a downloadable response with appropriate Content-Type and Content-Disposition headers

### Requirement 3: Aggregate Statistics Computation

**User Story:** As a DigitalBurnbag user, I want to see computed statistics about my provider's reliability and activity patterns, so that I can assess whether my dead man's switch configuration is appropriate.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL compute Uptime_Percentage as the count of checks with signal type PRESENCE or ABSENCE divided by total checks within the selected date range, multiplied by 100
2. THE Analytics_Engine SHALL compute average response time as the arithmetic mean of `timeSinceLastActivityMs` values for all PRESENCE entries within the selected date range, excluding null values
3. THE Analytics_Engine SHALL compute failure rate as the count of CHECK_FAILED entries divided by total entries within the selected date range, expressed as a percentage
4. THE Analytics_Engine SHALL compute MTBF as the total monitored duration divided by the number of failure events (transitions into CHECK_FAILED state) within the selected date range
5. THE Analytics_Engine SHALL compute failure rate trend as the comparison of failure rate in the most recent half of the date range versus the first half, expressed as a percentage change (positive = worsening, negative = improving)
6. IF the selected date range contains zero entries, THEN THE Analytics_Engine SHALL return null values for all statistics rather than zero or NaN

### Requirement 4: Multi-Provider Comparison View

**User Story:** As a DigitalBurnbag user, I want to compare heartbeat data across multiple providers on the same chart, so that I can identify correlated outages and verify that my aggregation strategy is working correctly.

#### Acceptance Criteria

1. WHEN the user selects multiple provider connections in the Comparison_View, THE Chart_View SHALL render each provider's signal data as a separate series on the same time axis with distinct colors and labels
2. THE Comparison_View SHALL support selecting up to 5 provider connections simultaneously from the user's connected providers
3. THE Comparison_View SHALL use a shared Date_Range_Selector that applies the same time window to all selected providers
4. WHEN providers have different check intervals, THE Comparison_View SHALL normalize data to the same Time_Bucket granularity by aggregating entries within each bucket
5. THE Comparison_View SHALL display a legend identifying each provider series by name and color, with toggle controls to show or hide individual series

### Requirement 5: Alert Threshold Visualization

**User Story:** As a DigitalBurnbag user, I want to see my configured alert thresholds overlaid on charts, so that I can visually assess how close my providers are to triggering failure policies or absence protocols.

#### Acceptance Criteria

1. WHEN a provider connection has a configured failure threshold, THE Alert_Threshold_Overlay SHALL render a horizontal reference line on the failure count chart at the threshold value with a label showing the configured Failure_Policy action
2. WHEN a provider connection has a configured absence threshold (thresholdMs from absenceConfig), THE Alert_Threshold_Overlay SHALL render a horizontal reference line on the time-since-activity chart at the threshold value
3. THE Alert_Threshold_Overlay SHALL render threshold lines with a dashed style and a distinct color (red for critical thresholds, amber for warning thresholds) that contrasts with the chart data series
4. WHEN a data point exceeds a threshold, THE Alert_Threshold_Overlay SHALL shade the region above the threshold in a semi-transparent warning color to highlight the breach visually

### Requirement 6: Heatmap Calendar View

**User Story:** As a DigitalBurnbag user, I want a calendar heatmap showing my activity patterns over weeks and months, so that I can identify recurring absence periods and verify my routine is being captured.

#### Acceptance Criteria

1. THE Heatmap_View SHALL render a grid of cells representing days, organized into weeks and months, covering the selected date range (default: last 90 days)
2. THE Heatmap_View SHALL color each day cell based on the dominant signal type for that day: green for majority PRESENCE, amber for majority ABSENCE, red for any DURESS, blue-gray for majority CHECK_FAILED, and light gray for days with no data
3. WHEN the user hovers over a day cell, THE Heatmap_View SHALL display a tooltip showing the date, total check count, and signal type breakdown (count per type) for that day
4. WHEN the user clicks a day cell, THE Heatmap_View SHALL filter the History_Ledger and Chart_View to show only entries from that specific day (drill-down)
5. THE Heatmap_View SHALL display week labels (week numbers or start dates) along the vertical axis and month labels along the horizontal axis for orientation

### Requirement 7: Chart Drill-Down to Entry Detail

**User Story:** As a DigitalBurnbag user, I want to click on a chart data point and see the individual heartbeat check details, so that I can investigate specific incidents without manually searching the ledger.

#### Acceptance Criteria

1. WHEN the user clicks a data point on the Chart_View, THE Drill_Down SHALL display a detail panel showing all `IStatusHistoryEntry` records within that Time_Bucket
2. THE Drill_Down detail panel SHALL display each entry's full fields: timestamp, signal type, event count, confidence, time since last activity, HTTP status code, and error message
3. WHEN a Time_Bucket contains a single entry, THE Drill_Down SHALL display that entry's details directly without an intermediate list
4. WHEN a Time_Bucket contains multiple entries, THE Drill_Down SHALL display them as a scrollable list sorted chronologically with signal type color indicators
5. THE Drill_Down detail panel SHALL provide a "View in Ledger" link that navigates to the History_Ledger filtered to the same time range as the selected Time_Bucket

### Requirement 8: Dashboard Metric Widgets

**User Story:** As a DigitalBurnbag user, I want compact dashboard widgets showing key metrics at a glance, so that I can quickly assess provider health without navigating to detailed views.

#### Acceptance Criteria

1. THE Dashboard_Widget SHALL display the following metrics for each provider connection: current streak (consecutive checks of the same signal type and count), longest absence duration (maximum continuous ABSENCE period in the date range), uptime percentage (last 30 days), and last check time with signal type
2. THE Dashboard_Widget SHALL display a "time since last presence" counter that updates showing elapsed time since the most recent PRESENCE signal
3. WHEN a metric value crosses a warning threshold (uptime below 95%, absence streak exceeding configured threshold), THE Dashboard_Widget SHALL apply a warning visual style (amber background or border)
4. WHEN a metric value crosses a critical threshold (uptime below 80%, absence streak exceeding 2x configured threshold), THE Dashboard_Widget SHALL apply a critical visual style (red background or border)
5. THE Dashboard_Widget SHALL be renderable on the Provider_Dashboard page alongside provider cards, showing aggregate metrics across all connected providers

### Requirement 9: Analytics API Endpoints

**User Story:** As a developer integrating with the DigitalBurnbag API, I want dedicated analytics endpoints that return computed statistics and time-series data, so that the frontend can render charts without performing heavy computation client-side.

#### Acceptance Criteria

1. WHEN the client requests time-series data via `GET /api/providers/connections/:id/analytics/timeseries`, THE Analytics_Engine SHALL return an array of Time_Bucket objects containing: bucketStart timestamp, bucketEnd timestamp, signal type counts, average confidence, total event count, and average timeSinceLastActivityMs
2. WHEN the client requests aggregate statistics via `GET /api/providers/connections/:id/analytics/stats`, THE Analytics_Engine SHALL return: uptime percentage, average response time, failure rate, MTBF, failure rate trend, total check count, and signal type distribution
3. WHEN the client requests comparison data via `GET /api/providers/analytics/compare`, THE Analytics_Engine SHALL accept an array of connection IDs and return normalized time-series data for each connection aligned to the same Time_Bucket boundaries
4. WHEN the client requests heatmap data via `GET /api/providers/connections/:id/analytics/heatmap`, THE Analytics_Engine SHALL return an array of day objects containing: date, dominant signal type, total check count, and per-signal-type counts
5. WHEN the client requests an export via `GET /api/providers/connections/:id/history/export`, THE Analytics_Engine SHALL accept format (csv or json), date range, and signal type filter parameters and return the formatted data as a downloadable file
6. THE Analytics_Engine SHALL validate that the requesting user owns the specified connection IDs before returning any analytics data

### Requirement 10: Time-Series Data Aggregation

**User Story:** As a DigitalBurnbag user, I want raw heartbeat entries aggregated into meaningful time buckets for charting, so that charts remain performant and readable even with thousands of data points over 90 days.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL aggregate raw `IStatusHistoryEntry` records into Time_Bucket objects by grouping entries whose timestamps fall within the same bucket interval
2. THE Analytics_Engine SHALL select Time_Bucket granularity based on the requested date range: 1 hour for ranges up to 48 hours, 6 hours for ranges up to 14 days, 1 day for ranges up to 90 days
3. FOR ALL valid date ranges and entry sets, aggregating entries into Time_Buckets and then summing the bucket counts SHALL produce the same total as counting the original entries directly (aggregation preserves total count)
4. THE Analytics_Engine SHALL include empty Time_Buckets (zero counts) for intervals with no entries, ensuring the time axis is continuous without gaps
5. WHEN computing the dominant signal type for a Time_Bucket, THE Analytics_Engine SHALL select the signal type with the highest count, breaking ties by priority order: DURESS > CHECK_FAILED > ABSENCE > PRESENCE

### Requirement 11: Streak and Duration Computation

**User Story:** As a DigitalBurnbag user, I want accurate streak and duration calculations, so that dashboard widgets show meaningful metrics about my activity continuity.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL compute current streak as the count of consecutive most-recent entries sharing the same signal type, starting from the latest entry and counting backwards
2. THE Analytics_Engine SHALL compute longest absence duration as the maximum time span between the first and last entry in any continuous sequence of ABSENCE signals within the date range
3. THE Analytics_Engine SHALL compute time since last presence as the difference between the current time and the timestamp of the most recent entry with signal type PRESENCE
4. IF no PRESENCE entry exists in the history, THEN THE Analytics_Engine SHALL return null for time since last presence rather than computing from an arbitrary start date
5. FOR ALL entry sequences, the computed current streak count SHALL be at least 1 when at least one entry exists, and SHALL equal the total entry count when all entries share the same signal type
