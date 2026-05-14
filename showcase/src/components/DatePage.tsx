/**
 * DatePage — Displays the current date and time in multiple formats,
 * including BrightDate, and shows known holidays for today using date-holidays.
 */

import { faCalendarClock } from '@awesome.me/kit-a20d532681/icons/classic/regular';
import {
  nowAsBrightDate,
  toBrightDateString,
} from '@brightchain/brightchain-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Link,
  Tooltip,
  Typography,
} from '@mui/material';
import Holidays from 'date-holidays';
import { FC, useEffect, useMemo, useState } from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import { BrightDate } from './BrightDate';
import { HeroBadge } from './HeroBadge';

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

// ─── Interplanetary Telemetry Helpers ───────────────────────────────────────

/** Speed of light in km/s */
const SPEED_OF_LIGHT_KM_S = 299_792.458;

/** Seconds per day */
const SECONDS_PER_DAY = 86_400;

/** Average Earth–Moon distance in km */
const MOON_DISTANCE_KM = 384_400;

/** Minimum Earth–Mars distance in km (opposition) */
const MARS_MIN_DISTANCE_KM = 54_600_000;

/** Maximum Earth–Mars distance in km (conjunction) */
const MARS_MAX_DISTANCE_KM = 401_000_000;

/**
 * Convert seconds to millidays.
 * 1 milliday = 86.4 seconds.
 */
function secondsToMillidays(seconds: number): number {
  return (seconds / SECONDS_PER_DAY) * 1000;
}

/**
 * Estimate current Earth–Mars distance using a simplified sinusoidal model.
 * Mars synodic period ≈ 779.94 days. We approximate the distance as oscillating
 * between min and max over this period, with a reference opposition date.
 */
function estimateMarsDistanceKm(date: Date): number {
  const SYNODIC_PERIOD_DAYS = 779.94;
  // Reference opposition: December 8, 2022
  const referenceOpposition = new Date('2022-12-08T00:00:00Z');
  const daysSinceOpposition =
    (date.getTime() - referenceOpposition.getTime()) / (1000 * 60 * 60 * 24);
  // Phase: 0 at opposition (min distance), π at conjunction (max distance)
  const phase = (2 * Math.PI * daysSinceOpposition) / SYNODIC_PERIOD_DAYS;
  const midpoint = (MARS_MIN_DISTANCE_KM + MARS_MAX_DISTANCE_KM) / 2;
  const amplitude = (MARS_MAX_DISTANCE_KM - MARS_MIN_DISTANCE_KM) / 2;
  // cos(phase) = 1 at opposition → min distance; cos(phase) = -1 at conjunction → max
  return midpoint - amplitude * Math.cos(phase);
}

// ─── Holiday Type → Chip Color ──────────────────────────────────────────────

const HOLIDAY_CHIP_COLORS: Record<
  string,
  'primary' | 'secondary' | 'success' | 'info' | 'warning'
> = {
  public: 'primary',
  bank: 'info',
  observance: 'success',
  school: 'warning',
  optional: 'secondary',
};

/**
 * Map date-holidays type to our i18n string key.
 */
function holidayTypeLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case 'public':
      return t(ShowcaseStrings.DatePage_HolidayType_Public);
    case 'bank':
      return t(ShowcaseStrings.DatePage_HolidayType_Bank);
    case 'observance':
      return t(ShowcaseStrings.DatePage_HolidayType_Observance);
    default:
      return t(ShowcaseStrings.DatePage_HolidayType_Observance);
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export const DatePage: FC = () => {
  const { t, language } = useShowcaseI18n();
  const [now, setNow] = useState(new Date());

  // Update every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize date-holidays for the user's locale
  const hd = useMemo(() => {
    // Map language codes to country codes for date-holidays
    // Default to US; extend as needed
    const langToCountry: Record<string, string> = {
      en: 'US',
      'en-US': 'US',
      'en-GB': 'GB',
      de: 'DE',
      'de-DE': 'DE',
      fr: 'FR',
      'fr-FR': 'FR',
      es: 'ES',
      'es-ES': 'ES',
      ja: 'JP',
      'ja-JP': 'JP',
      zh: 'CN',
      'zh-CN': 'CN',
      uk: 'UA',
      'uk-UA': 'UA',
    };
    const country = langToCountry[language] || 'US';
    const langCode = language?.split('-')[0] || 'en';
    return new Holidays(country, { languages: [langCode, 'en'] });
  }, [language]);

  // Get holidays for today
  const holidays = useMemo(() => {
    const result = hd.isHoliday(now);
    if (!result) return [];
    return result;
  }, [hd, now]);

  // BrightDate values at different precisions
  const brightDateFull = nowAsBrightDate(8); // sub-millisecond
  const brightDateStandard = toBrightDateString(now, 5); // ~0.86s
  const brightDateCompact = toBrightDateString(now, 3); // ~86s

  const julianDate = getJulianDate(now);
  const mjd = getModifiedJulianDate(now);
  const unixTs = getUnixTimestamp(now);
  const dayOfYear = getDayOfYear(now);
  const isoWeek = getISOWeek(now);
  const daysInYear = isLeapYear(now.getFullYear()) ? 366 : 365;

  // ─── Interplanetary Telemetry (Cochrane Easter Egg) ─────────────────────
  const moonLightDelaySec = MOON_DISTANCE_KM / SPEED_OF_LIGHT_KM_S;
  const moonDelayMillidays = secondsToMillidays(moonLightDelaySec);

  const marsMinDelaySec = MARS_MIN_DISTANCE_KM / SPEED_OF_LIGHT_KM_S;
  const marsMinDelayMillidays = secondsToMillidays(marsMinDelaySec);

  const marsMaxDelaySec = MARS_MAX_DISTANCE_KM / SPEED_OF_LIGHT_KM_S;
  const marsMaxDelayMillidays = secondsToMillidays(marsMaxDelaySec);

  const marsCurrentDistanceKm = estimateMarsDistanceKm(now);
  const marsCurrentDelaySec = marsCurrentDistanceKm / SPEED_OF_LIGHT_KM_S;
  const marsCurrentDelayMillidays = secondsToMillidays(marsCurrentDelaySec);

  const formats: Array<{ label: string; value: string }> = [
    {
      label: t(ShowcaseStrings.DatePage_Format_BrightDateFull),
      value: t(ShowcaseStrings.Date_BrightDateTemplate, {
        BD: brightDateFull,
      }),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_BrightDateStandard),
      value: t(ShowcaseStrings.Date_BrightDateTemplate, {
        BD: brightDateStandard,
      }),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_BrightDateCompact),
      value: t(ShowcaseStrings.Date_BrightDateTemplate, {
        BD: brightDateCompact,
      }),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_ISO8601),
      value: now.toISOString(),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_UTC),
      value: now.toUTCString(),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_LocalDateTime),
      value: now.toLocaleString(),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_LocalDate),
      value: now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_LocalTime),
      value: now.toLocaleTimeString(),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_UnixTimestamp),
      value: String(unixTs),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_UnixMs),
      value: String(now.getTime()),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_JulianDate),
      value: julianDate.toFixed(5),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_ModifiedJulianDate),
      value: mjd.toFixed(5),
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_DayOfYear),
      value: `${dayOfYear} / ${daysInYear}`,
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_ISOWeek),
      value: `W${String(isoWeek).padStart(2, '0')}`,
    },
    {
      label: t(ShowcaseStrings.DatePage_Format_RFC2822),
      value: now.toString(),
    },
  ];

  return (
    <div className="app" id="main-content">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <FontAwesomeIcon icon={faCalendarClock} color="primary" size="3x" />
          <Typography variant="h4" component="h1">
            {t(ShowcaseStrings.DatePage_Title)}
          </Typography>
        </Box>

        <HeroBadge
          text={t(ShowcaseStrings.Date_BrightDate_UTC_With_Benefits)}
        />

        {/* BrightDate Hero */}
        <Card
          sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="overline" sx={{ opacity: 0.8 }}>
              {t(ShowcaseStrings.DatePage_BrightDateEpochLabel)}
            </Typography>
            <Typography
              variant="h3"
              component="div"
              sx={{ fontFamily: 'monospace', fontWeight: 700 }}
            >
              <BrightDate date={now} interval={0} format="full" />
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
                {t(ShowcaseStrings.DatePage_HolidaysTitle)}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {holidays.map((h) => (
                  <Chip
                    key={h.name}
                    label={`${h.name} (${holidayTypeLabel(h.type, t)})`}
                    color={HOLIDAY_CHIP_COLORS[h.type] || 'default'}
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
              {t(ShowcaseStrings.DatePage_AllFormatsTitle)}
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
              <Link
                href="https://brightdate.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(ShowcaseStrings.DatePage_AboutBrightDateTitle)}
              </Link>
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {t(ShowcaseStrings.DatePage_AboutBrightDate_Epoch)}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {t(ShowcaseStrings.DatePage_AboutBrightDate_Fraction)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(ShowcaseStrings.DatePage_AboutBrightDate_NoTimezones)}
            </Typography>
          </CardContent>
        </Card>

        {/* Cochrane Easter Egg: Interplanetary Telemetry */}
        <Card sx={{ mt: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontFamily: 'monospace' }}
            >
              🛰️ {t(ShowcaseStrings.DatePage_Telemetry_Title)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(ShowcaseStrings.DatePage_Telemetry_Subtitle)}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box
              component="dl"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' },
                gap: 1,
                mb: 2,
              }}
            >
              {/* Moon */}
              <Typography
                component="dt"
                variant="body2"
                sx={{ fontWeight: 600, color: 'text.secondary' }}
              >
                {t(ShowcaseStrings.DatePage_Telemetry_MoonDelay)}
              </Typography>
              <Tooltip title={`${moonLightDelaySec.toFixed(2)}s`}>
                <Typography
                  component="dd"
                  variant="body2"
                  sx={{ m: 0, fontFamily: 'monospace' }}
                >
                  {moonDelayMillidays.toFixed(4)}{' '}
                  {t(ShowcaseStrings.DatePage_Telemetry_Unit)}
                </Typography>
              </Tooltip>

              {/* Mars min */}
              <Typography
                component="dt"
                variant="body2"
                sx={{ fontWeight: 600, color: 'text.secondary' }}
              >
                {t(ShowcaseStrings.DatePage_Telemetry_MarsDelayMin)}
              </Typography>
              <Tooltip title={`${marsMinDelaySec.toFixed(1)}s`}>
                <Typography
                  component="dd"
                  variant="body2"
                  sx={{ m: 0, fontFamily: 'monospace' }}
                >
                  {marsMinDelayMillidays.toFixed(4)}{' '}
                  {t(ShowcaseStrings.DatePage_Telemetry_Unit)}
                </Typography>
              </Tooltip>

              {/* Mars max */}
              <Typography
                component="dt"
                variant="body2"
                sx={{ fontWeight: 600, color: 'text.secondary' }}
              >
                {t(ShowcaseStrings.DatePage_Telemetry_MarsDelayMax)}
              </Typography>
              <Tooltip title={`${marsMaxDelaySec.toFixed(1)}s`}>
                <Typography
                  component="dd"
                  variant="body2"
                  sx={{ m: 0, fontFamily: 'monospace' }}
                >
                  {marsMaxDelayMillidays.toFixed(4)}{' '}
                  {t(ShowcaseStrings.DatePage_Telemetry_Unit)}
                </Typography>
              </Tooltip>

              {/* Mars current estimate */}
              <Typography
                component="dt"
                variant="body2"
                sx={{ fontWeight: 600, color: 'text.secondary' }}
              >
                {t(ShowcaseStrings.DatePage_Telemetry_MarsDelayCurrent)}
              </Typography>
              <Tooltip title={`≈ ${marsCurrentDelaySec.toFixed(1)}s`}>
                <Typography
                  component="dd"
                  variant="body2"
                  sx={{
                    m: 0,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: 'primary.main',
                  }}
                >
                  {marsCurrentDelayMillidays.toFixed(4)}{' '}
                  {t(ShowcaseStrings.DatePage_Telemetry_Unit)}
                </Typography>
              </Tooltip>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: 'italic' }}
            >
              {t(ShowcaseStrings.DatePage_Telemetry_Footer)}
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
};

export default DatePage;
