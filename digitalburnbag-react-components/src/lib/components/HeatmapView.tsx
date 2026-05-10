import type { IHeatmapDay } from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import { Box, Tooltip, Typography } from '@mui/material';
import { useMemo } from 'react';
import { getSignalTypeLabel } from '../utils/provider-utils';

export interface IHeatmapViewProps {
  /** Heatmap day data */
  data: IHeatmapDay[];
  /** Click handler for a specific day */
  onDayClick?: (date: string) => void;
}

const CELL_SIZE = 16;
const CELL_GAP = 2;

const SIGNAL_CELL_COLORS: Record<string, string> = {
  [HeartbeatSignalType.PRESENCE]: '#4caf50',
  [HeartbeatSignalType.ABSENCE]: '#ff9800',
  [HeartbeatSignalType.DURESS]: '#f44336',
  [HeartbeatSignalType.CHECK_FAILED]: '#78909c',
};
const NO_DATA_COLOR = '#e0e0e0';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface WeekColumn {
  weekIndex: number;
  days: (IHeatmapDay | null)[];
  /** Month label to show above this column, if it starts a new month */
  monthLabel?: string;
}

function getCellColor(day: IHeatmapDay | null): string {
  if (!day || day.totalCount === 0 || !day.dominantSignalType) {
    return NO_DATA_COLOR;
  }
  return SIGNAL_CELL_COLORS[day.dominantSignalType] ?? NO_DATA_COLOR;
}

function buildTooltipContent(day: IHeatmapDay): string {
  const parts = [`${day.date} — ${day.totalCount} checks`];
  for (const st of Object.values(HeartbeatSignalType)) {
    const count = day.signalCounts[st] ?? 0;
    if (count > 0) {
      parts.push(`${getSignalTypeLabel(st)}: ${count}`);
    }
  }
  return parts.join('\n');
}

/**
 * Custom grid rendering IHeatmapDay[] as colored cells organized into weeks/months.
 * Week labels on vertical axis, month labels on horizontal axis.
 */
export function HeatmapView({ data, onDayClick }: IHeatmapViewProps) {
  const weeks: WeekColumn[] = useMemo(() => {
    if (data.length === 0) return [];

    // Build a map of date -> day data
    const dayMap = new Map<string, IHeatmapDay>();
    for (const d of data) {
      dayMap.set(d.date, d);
    }

    // Sort dates
    const sortedDates = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const startDate = new Date(sortedDates[0].date + 'T00:00:00Z');
    const endDate = new Date(
      sortedDates[sortedDates.length - 1].date + 'T00:00:00Z',
    );

    // Align start to Sunday
    const alignedStart = new Date(startDate);
    alignedStart.setUTCDate(
      alignedStart.getUTCDate() - alignedStart.getUTCDay(),
    );

    const result: WeekColumn[] = [];
    let currentDate = new Date(alignedStart);
    let weekIndex = 0;
    let lastMonth = -1;

    while (currentDate <= endDate || currentDate.getUTCDay() !== 0) {
      const days: (IHeatmapDay | null)[] = [];
      let monthLabel: string | undefined;

      for (let dow = 0; dow < 7; dow++) {
        const dateStr = currentDate.toISOString().slice(0, 10);
        const dayData = dayMap.get(dateStr) ?? null;

        // Check if we crossed into a new month
        if (currentDate.getUTCMonth() !== lastMonth) {
          lastMonth = currentDate.getUTCMonth();
          if (dow <= 1) {
            monthLabel = MONTH_NAMES[lastMonth];
          }
        }

        if (currentDate >= startDate && currentDate <= endDate) {
          days.push(dayData);
        } else {
          days.push(null);
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      result.push({ weekIndex, days, monthLabel });
      weekIndex++;

      // Safety: stop after processing well past the end date
      if (weekIndex > 100) break;
    }

    return result;
  }, [data]);

  if (data.length === 0) {
    return (
      <Box data-testid="heatmap-view-empty" sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">No heatmap data</Typography>
      </Box>
    );
  }

  return (
    <Box data-testid="heatmap-view" sx={{ overflowX: 'auto' }}>
      {/* Month labels row */}
      <Box sx={{ display: 'flex', ml: `${40 + CELL_GAP}px` }}>
        {weeks.map((week) => (
          <Box
            key={`month-${week.weekIndex}`}
            sx={{
              width: CELL_SIZE + CELL_GAP,
              flexShrink: 0,
              minHeight: 16,
            }}
          >
            {week.monthLabel && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {week.monthLabel}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      {/* Grid: day labels + cells */}
      <Box sx={{ display: 'flex' }}>
        {/* Day-of-week labels */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: `${CELL_GAP}px`,
            mr: `${CELL_GAP}px`,
            width: 40,
            flexShrink: 0,
          }}
        >
          {DAY_LABELS.map((label, i) => (
            <Box
              key={label}
              sx={{
                height: CELL_SIZE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                pr: 0.5,
              }}
            >
              {i % 2 === 1 && (
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        {/* Week columns */}
        {weeks.map((week) => (
          <Box
            key={week.weekIndex}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: `${CELL_GAP}px`,
              mr: `${CELL_GAP}px`,
            }}
          >
            {week.days.map((day, dow) => {
              const color = getCellColor(day);
              const cell = (
                <Box
                  key={`${week.weekIndex}-${dow}`}
                  sx={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    bgcolor: color,
                    borderRadius: '2px',
                    cursor: day && onDayClick ? 'pointer' : 'default',
                    '&:hover': {
                      opacity: day ? 0.8 : 1,
                    },
                  }}
                  onClick={() => {
                    if (day && onDayClick) onDayClick(day.date);
                  }}
                />
              );

              if (day && day.totalCount > 0) {
                return (
                  <Tooltip
                    key={`${week.weekIndex}-${dow}`}
                    title={
                      <Box sx={{ whiteSpace: 'pre-line' }}>
                        {buildTooltipContent(day)}
                      </Box>
                    }
                    arrow
                    placement="top"
                  >
                    {cell}
                  </Tooltip>
                );
              }

              return cell;
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
