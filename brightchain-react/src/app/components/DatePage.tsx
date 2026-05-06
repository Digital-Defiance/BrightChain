/**
 * DatePage — Displays the current date and time in multiple formats,
 * including BrightDate, and shows known holidays for today.
 */

import {
  nowAsBrightDate,
  toBrightDateString,
} from '@brightchain/brightchain-lib';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Link,
  Typography,
} from '@mui/material';
import { FC, useEffect, useMemo, useState } from 'react';

// ─── Holiday Data ───────────────────────────────────────────────────────────

interface Holiday {
  name: string;
  month: number; // 1-indexed
  day: number;
  type: 'federal' | 'cultural' | 'international' | 'observance';
}

/**
 * Known holidays (US federal + major international).
 * Holidays with variable dates (Easter, Thanksgiving, etc.) are computed.
 */
const FIXED_HOLIDAYS: Holiday[] = [
  { name: "New Year's Day", month: 1, day: 1, type: 'federal' },
  { name: 'Martin Luther King Jr. Day', month: 1, day: 0, type: 'federal' },
  { name: 'Groundhog Day', month: 2, day: 2, type: 'observance' },
  { name: "Valentine's Day", month: 2, day: 14, type: 'cultural' },
  { name: "Presidents' Day", month: 2, day: 0, type: 'federal' },
  {
    name: "International Women's Day",
    month: 3,
    day: 8,
    type: 'international',
  },
  { name: "St. Patrick's Day", month: 3, day: 17, type: 'cultural' },
  { name: 'Pi Day', month: 3, day: 14, type: 'observance' },
  { name: 'Earth Day', month: 4, day: 22, type: 'international' },
  {
    name: "May Day / International Workers' Day",
    month: 5,
    day: 1,
    type: 'international',
  },
  { name: 'Cinco de Mayo', month: 5, day: 5, type: 'cultural' },
  { name: 'Memorial Day', month: 5, day: 0, type: 'federal' },
  { name: 'Juneteenth', month: 6, day: 19, type: 'federal' },
  { name: 'Independence Day', month: 7, day: 4, type: 'federal' },
  { name: 'Labor Day', month: 9, day: 0, type: 'federal' },
  { name: "Indigenous Peoples' Day", month: 10, day: 0, type: 'federal' },
  { name: 'Halloween', month: 10, day: 31, type: 'cultural' },
  { name: 'Veterans Day', month: 11, day: 11, type: 'federal' },
  { name: 'Thanksgiving', month: 11, day: 0, type: 'federal' },
  { name: 'Christmas Eve', month: 12, day: 24, type: 'cultural' },
  { name: 'Christmas Day', month: 12, day: 25, type: 'federal' },
  { name: "New Year's Eve", month: 12, day: 31, type: 'cultural' },
  { name: 'World AIDS Day', month: 12, day: 1, type: 'international' },
  { name: 'Human Rights Day', month: 12, day: 10, type: 'international' },
];

/** Get the Nth weekday of a month (e.g., 3rd Monday of January). */
function getNthWeekday(
  year: number,
  month: number,
  weekday: number,
  n: number,
): number {
  const firstDay = new Date(year, month - 1, 1);
  let dayOfMonth = 1 + ((weekday - firstDay.getDay() + 7) % 7);
  dayOfMonth += (n - 1) * 7;
  return dayOfMonth;
}

/** Get the last weekday of a month (e.g., last Monday of May). */
function getLastWeekday(year: number, month: number, weekday: number): number {
  const lastDay = new Date(year, month, 0).getDate();
  const lastDate = new Date(year, month - 1, lastDay);
  const diff = (lastDate.getDay() - weekday + 7) % 7;
  return lastDay - diff;
}

/** Compute holidays for a given date, including variable-date ones. */
function getHolidaysForDate(date: Date): Holiday[] {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const matches: Holiday[] = [];

  for (const h of FIXED_HOLIDAYS) {
    if (h.month !== month) continue;

    if (h.day > 0) {
      if (h.day === day) matches.push(h);
    } else {
      let computedDay = 0;
      if (h.name === 'Martin Luther King Jr. Day') {
        computedDay = getNthWeekday(year, 1, 1, 3);
      } else if (h.name === "Presidents' Day") {
        computedDay = getNthWeekday(year, 2, 1, 3);
      } else if (h.name === 'Memorial Day') {
        computedDay = getLastWeekday(year, 5, 1);
      } else if (h.name === 'Labor Day') {
        computedDay = getNthWeekday(year, 9, 1, 1);
      } else if (h.name === "Indigenous Peoples' Day") {
        computedDay = getNthWeekday(year, 10, 1, 2);
      } else if (h.name === 'Thanksgiving') {
        computedDay = getNthWeekday(year, 11, 4, 4);
      }
      if (computedDay === day) matches.push({ ...h, day: computedDay });
    }
  }

  return matches;
}

// ─── Date Format Helpers ────────────────────────────────────────────────────

function getJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function getModifiedJulianDate(date: Date): number {
  return getJulianDate(date) - 2400000.5;
}

function getUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// ─── Component ──────────────────────────────────────────────────────────────

const HOLIDAY_COLORS: Record<
  Holiday['type'],
  'primary' | 'secondary' | 'success' | 'info'
> = {
  federal: 'primary',
  cultural: 'secondary',
  international: 'info',
  observance: 'success',
};

export const DatePage: FC = () => {
  const [now, setNow] = useState(new Date());

  // Update every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const holidays = useMemo(() => getHolidaysForDate(now), [now]);

  const brightDateFull = toBrightDateString(now, 5);
  const brightDateCompact = toBrightDateString(now, 3);
  const brightDateNow = nowAsBrightDate(5);

  const julianDate = getJulianDate(now);
  const mjd = getModifiedJulianDate(now);
  const unixTs = getUnixTimestamp(now);
  const dayOfYear = getDayOfYear(now);
  const isoWeek = getISOWeek(now);
  const daysInYear = isLeapYear(now.getFullYear()) ? 366 : 365;

  const formats: Array<{ label: string; value: string }> = [
    { label: 'BrightDate (full precision)', value: `BD ${brightDateNow}` },
    { label: 'BrightDate (compact)', value: `BD ${brightDateCompact}` },
    { label: 'BrightDate (standard)', value: `BD ${brightDateFull}` },
    { label: 'ISO 8601', value: now.toISOString() },
    { label: 'UTC', value: now.toUTCString() },
    { label: 'Local Date & Time', value: now.toLocaleString() },
    {
      label: 'Local Date',
      value: now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
    { label: 'Local Time', value: now.toLocaleTimeString() },
    { label: 'Unix Timestamp', value: String(unixTs) },
    { label: 'Unix Milliseconds', value: String(now.getTime()) },
    { label: 'Julian Date', value: julianDate.toFixed(5) },
    { label: 'Modified Julian Date', value: mjd.toFixed(5) },
    { label: 'Day of Year', value: `${dayOfYear} / ${daysInYear}` },
    { label: 'ISO Week', value: `W${String(isoWeek).padStart(2, '0')}` },
    { label: 'RFC 2822', value: now.toString() },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <CalendarTodayIcon fontSize="large" color="primary" />
        <Typography variant="h4" component="h1">
          Date &amp; Time
        </Typography>
      </Box>

      {/* BrightDate Hero */}
      <Card
        sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="overline" sx={{ opacity: 0.8 }}>
            BrightDate (decimal days since J2000.0)
          </Typography>
          <Typography
            variant="h3"
            component="div"
            sx={{ fontFamily: 'monospace', fontWeight: 700 }}
          >
            BD {brightDateNow}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            {now.toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {' · '}
            {now.toLocaleTimeString()}
          </Typography>
        </CardContent>
      </Card>

      {/* Holidays */}
      {holidays.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today&apos;s Holidays &amp; Observances
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {holidays.map((h) => (
                <Chip
                  key={h.name}
                  label={h.name}
                  color={HOLIDAY_COLORS[h.type]}
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* All Formats */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Date Formats
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box
            component="dl"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' },
              gap: 1,
            }}
          >
            {formats.map(({ label, value }) => (
              <Box key={label} sx={{ display: 'contents' }}>
                <Typography
                  component="dt"
                  variant="body2"
                  sx={{ fontWeight: 600, color: 'text.secondary' }}
                >
                  {label}
                </Typography>
                <Typography
                  component="dd"
                  variant="body2"
                  sx={{
                    m: 0,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Epoch Reference */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Link href="https://github.com/Digital-Defiance/brightdate/blob/main/README.md">
              About BrightDate
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            BrightDate counts decimal days since the J2000.0 epoch (January 1,
            2000 at 12:00:00 UTC). This is the same epoch used by astronomers
            worldwide for celestial mechanics.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            The integer part is the day count. The fractional part is the
            decimal time of day. For example, 0.5 = noon, 0.25 = 06:00, 0.75 =
            18:00.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No time zones, no daylight saving, no ambiguity — just one number on
            one timeline.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default DatePage;
