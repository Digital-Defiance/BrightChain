import type { IComparisonDataset } from '@brightchain/digitalburnbag-lib';
import {
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { ChartView } from './ChartView';
import { DateRangeSelector } from './DateRangeSelector';

export interface IComparisonViewProps {
  /** Available connections to compare */
  connections: Array<{ id: string; name: string }>;
  /** Fetch comparison data for selected connections and date range */
  onFetchComparison: (
    connectionIds: string[],
    since: Date,
    until: Date,
  ) => Promise<IComparisonDataset[]>;
}

const MAX_CONNECTIONS = 5;

const LEGEND_COLORS = ['#1976d2', '#9c27b0', '#00897b', '#f57c00', '#5c6bc0'];

/**
 * Multi-provider comparison view with shared date range and multi-series chart.
 */
export function ComparisonView({
  connections,
  onFetchComparison,
}: IComparisonViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ since: Date; until: Date }>({
    since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    until: new Date(),
  });
  const [comparisonData, setComparisonData] = useState<IComparisonDataset[]>(
    [],
  );
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const selectedConnections = useMemo(
    () => connections.filter((c) => selectedIds.includes(c.id)),
    [connections, selectedIds],
  );

  const fetchData = useCallback(
    async (ids: string[], range: { since: Date; until: Date }) => {
      if (ids.length === 0) {
        setComparisonData([]);
        return;
      }
      setIsLoading(true);
      try {
        const data = await onFetchComparison(ids, range.since, range.until);
        setComparisonData(data);
        setVisibleIds(new Set(ids));
      } finally {
        setIsLoading(false);
      }
    },
    [onFetchComparison],
  );

  const handleSelectionChange = useCallback(
    (_: unknown, value: Array<{ id: string; name: string }>) => {
      const ids = value.map((v) => v.id).slice(0, MAX_CONNECTIONS);
      setSelectedIds(ids);
      fetchData(ids, dateRange);
    },
    [dateRange, fetchData],
  );

  const handleDateRangeChange = useCallback(
    (range: { since: Date; until: Date }) => {
      setDateRange(range);
      fetchData(selectedIds, range);
    },
    [selectedIds, fetchData],
  );

  const handleToggleVisibility = useCallback((id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Filter comparison data to only visible series
  const visibleData = useMemo(
    () => comparisonData.filter((d) => visibleIds.has(d.connectionId)),
    [comparisonData, visibleIds],
  );

  // Use the first dataset's buckets as the primary data axis
  const primaryBuckets = useMemo(
    () => (visibleData.length > 0 ? visibleData[0].buckets : []),
    [visibleData],
  );

  const otherDatasets = useMemo(
    () => (visibleData.length > 1 ? visibleData.slice(1) : []),
    [visibleData],
  );

  return (
    <Box data-testid="comparison-view">
      <Typography variant="h6" gutterBottom>
        Provider Comparison
      </Typography>

      {/* Provider selector */}
      <Box sx={{ mb: 2 }}>
        <Autocomplete
          multiple
          options={connections}
          getOptionLabel={(opt) => opt.name}
          value={selectedConnections}
          onChange={handleSelectionChange}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          getOptionDisabled={() => selectedIds.length >= MAX_CONNECTIONS}
          renderInput={(params) => {
            const { InputProps, InputLabelProps, ...rest } = params;
            return (
              <TextField
                {...rest}
                InputProps={InputProps as object}
                InputLabelProps={InputLabelProps as object}
                label={`Select providers (max ${MAX_CONNECTIONS})`}
                size="small"
                data-testid="provider-selector"
              />
            );
          }}
          renderTags={(value, getTagProps) =>
            value.map((opt, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  label={opt.name}
                  size="small"
                  sx={{
                    borderLeft: 3,
                    borderLeftColor:
                      LEGEND_COLORS[
                        selectedIds.indexOf(opt.id) % LEGEND_COLORS.length
                      ],
                  }}
                  {...tagProps}
                />
              );
            })
          }
        />
      </Box>

      {/* Shared date range */}
      <Box sx={{ mb: 2 }}>
        <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
      </Box>

      {/* Chart */}
      {isLoading ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Loading comparison data...
        </Typography>
      ) : selectedIds.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Select providers to compare
        </Typography>
      ) : (
        <ChartView
          data={primaryBuckets}
          comparisonData={otherDatasets}
          chartType="line"
        />
      )}

      {/* Legend with show/hide toggles */}
      {comparisonData.length > 0 && (
        <Box
          sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}
          data-testid="comparison-legend"
        >
          {comparisonData.map((ds, i) => (
            <FormControlLabel
              key={ds.connectionId}
              control={
                <Checkbox
                  checked={visibleIds.has(ds.connectionId)}
                  onChange={() => handleToggleVisibility(ds.connectionId)}
                  size="small"
                  sx={{
                    color: LEGEND_COLORS[i % LEGEND_COLORS.length],
                    '&.Mui-checked': {
                      color: LEGEND_COLORS[i % LEGEND_COLORS.length],
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2">{ds.connectionName}</Typography>
              }
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
