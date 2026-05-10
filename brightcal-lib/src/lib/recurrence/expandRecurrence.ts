import { RecurrenceFrequency } from '../enums';
import { ICalendarEventDTO } from '../interfaces/calendarEventDto';
import { IRecurrenceRule } from '../interfaces/recurrenceRule';

/**
 * Day-of-week mapping for BYDAY rule parts.
 */
const DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

/**
 * Parse a BYDAY value like '2TU' or '-1FR' into { ordinal, day }.
 * Plain values like 'MO' return ordinal = 0 (meaning every occurrence).
 */
function parseByday(value: string): { ordinal: number; day: number } {
  const match = value.match(/^(-?\d+)?([A-Z]{2})$/);
  if (!match) {
    return { ordinal: 0, day: 0 };
  }
  const ordinal = match[1] ? parseInt(match[1], 10) : 0;
  const day = DAY_MAP[match[2]] ?? 0;
  return { ordinal, day };
}

/**
 * Parse an ISO 8601 datetime string into a Date object.
 * Treats the string as a local time (no timezone conversion).
 */
function parseLocalDate(iso: string): Date {
  const cleaned = iso.replace(/Z$/, '');

  // Handle compact iCal format: 20240315T090000
  if (/^\d{8}T\d{6}$/.test(cleaned)) {
    const y = parseInt(cleaned.slice(0, 4), 10);
    const m = parseInt(cleaned.slice(4, 6), 10) - 1;
    const d = parseInt(cleaned.slice(6, 8), 10);
    const h = parseInt(cleaned.slice(9, 11), 10);
    const min = parseInt(cleaned.slice(11, 13), 10);
    const s = parseInt(cleaned.slice(13, 15), 10);
    return new Date(y, m, d, h, min, s);
  }

  // Handle compact date-only: 20240315
  if (/^\d{8}$/.test(cleaned)) {
    const y = parseInt(cleaned.slice(0, 4), 10);
    const m = parseInt(cleaned.slice(4, 6), 10) - 1;
    const d = parseInt(cleaned.slice(6, 8), 10);
    return new Date(y, m, d);
  }

  // Standard ISO format
  const parts = cleaned.split('T');
  const dateParts = parts[0].split('-').map(Number);
  if (parts.length === 1) {
    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  }
  const timeParts = parts[1].split(':').map((p) => parseInt(p, 10));
  return new Date(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    timeParts[0] || 0,
    timeParts[1] || 0,
    timeParts[2] || 0,
  );
}

/**
 * Format a Date as ISO 8601 local datetime string.
 */
function formatLocalDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/**
 * Clone a date preserving wall-clock time (DST-safe).
 */
function cloneDate(d: Date): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
}

/**
 * Add a specified number of units to a date, preserving wall-clock time.
 * This is DST-safe because it uses the Date constructor with local components.
 */
function addToDate(
  d: Date,
  amount: number,
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years',
): Date {
  const result = cloneDate(d);
  switch (unit) {
    case 'seconds':
      result.setSeconds(result.getSeconds() + amount);
      break;
    case 'minutes':
      result.setMinutes(result.getMinutes() + amount);
      break;
    case 'hours':
      result.setHours(result.getHours() + amount);
      break;
    case 'days':
      result.setDate(result.getDate() + amount);
      break;
    case 'months': {
      const targetMonth = result.getMonth() + amount;
      const day = result.getDate();
      result.setDate(1);
      result.setMonth(targetMonth);
      const maxDay = new Date(
        result.getFullYear(),
        result.getMonth() + 1,
        0,
      ).getDate();
      result.setDate(Math.min(day, maxDay));
      break;
    }
    case 'years': {
      const targetYear = result.getFullYear() + amount;
      const day = result.getDate();
      result.setDate(1);
      result.setFullYear(targetYear);
      const maxDay = new Date(
        result.getFullYear(),
        result.getMonth() + 1,
        0,
      ).getDate();
      result.setDate(Math.min(day, maxDay));
      break;
    }
  }
  return result;
}

/**
 * Get the frequency unit for addToDate.
 */
function freqToUnit(
  freq: RecurrenceFrequency,
): 'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years' {
  switch (freq) {
    case RecurrenceFrequency.Secondly:
      return 'seconds';
    case RecurrenceFrequency.Minutely:
      return 'minutes';
    case RecurrenceFrequency.Hourly:
      return 'hours';
    case RecurrenceFrequency.Daily:
      return 'days';
    case RecurrenceFrequency.Weekly:
      return 'days';
    case RecurrenceFrequency.Monthly:
      return 'months';
    case RecurrenceFrequency.Yearly:
      return 'years';
  }
}

/**
 * Check if a candidate date matches the BY* filter rules.
 */
function matchesByRules(candidate: Date, rule: IRecurrenceRule): boolean {
  if (rule.byMonth && rule.byMonth.length > 0) {
    if (!rule.byMonth.includes(candidate.getMonth() + 1)) {
      return false;
    }
  }

  if (rule.byMonthDay && rule.byMonthDay.length > 0) {
    const dayOfMonth = candidate.getDate();
    const daysInMonth = new Date(
      candidate.getFullYear(),
      candidate.getMonth() + 1,
      0,
    ).getDate();
    const matches = rule.byMonthDay.some((bd) => {
      if (bd > 0) return bd === dayOfMonth;
      return daysInMonth + bd + 1 === dayOfMonth;
    });
    if (!matches) return false;
  }

  if (rule.byDay && rule.byDay.length > 0) {
    const candidateDow = candidate.getDay();
    const matches = rule.byDay.some((bd) => {
      const { ordinal, day } = parseByday(bd);
      if (candidateDow !== day) return false;
      if (ordinal === 0) return true;

      if (
        rule.freq === RecurrenceFrequency.Monthly ||
        rule.freq === RecurrenceFrequency.Yearly
      ) {
        if (ordinal > 0) {
          const firstOfMonth = new Date(
            candidate.getFullYear(),
            candidate.getMonth(),
            1,
          );
          const firstDow = firstOfMonth.getDay();
          const firstOccurrence = 1 + ((day - firstDow + 7) % 7);
          const nthDate = firstOccurrence + (ordinal - 1) * 7;
          return candidate.getDate() === nthDate;
        } else {
          const dim = new Date(
            candidate.getFullYear(),
            candidate.getMonth() + 1,
            0,
          ).getDate();
          const lastOfMonth = new Date(
            candidate.getFullYear(),
            candidate.getMonth(),
            dim,
          );
          const lastDow = lastOfMonth.getDay();
          const lastOccurrence = dim - ((lastDow - day + 7) % 7);
          const nthDate = lastOccurrence + (ordinal + 1) * 7;
          return candidate.getDate() === nthDate;
        }
      }
      return true;
    });
    if (!matches) return false;
  }

  if (rule.byHour && rule.byHour.length > 0) {
    if (!rule.byHour.includes(candidate.getHours())) {
      return false;
    }
  }

  if (rule.byMinute && rule.byMinute.length > 0) {
    if (!rule.byMinute.includes(candidate.getMinutes())) {
      return false;
    }
  }

  if (rule.bySecond && rule.bySecond.length > 0) {
    if (!rule.bySecond.includes(candidate.getSeconds())) {
      return false;
    }
  }

  return true;
}

/**
 * Generate candidate dates for WEEKLY frequency with BYDAY expansion.
 */
function expandWeeklyByday(weekStart: Date, rule: IRecurrenceRule): Date[] {
  if (!rule.byDay || rule.byDay.length === 0) {
    return [weekStart];
  }

  const results: Date[] = [];

  for (const bd of rule.byDay) {
    const { day } = parseByday(bd);
    const startDow = weekStart.getDay();
    const offset = (day - startDow + 7) % 7;
    const candidate = addToDate(weekStart, offset, 'days');
    candidate.setHours(
      weekStart.getHours(),
      weekStart.getMinutes(),
      weekStart.getSeconds(),
    );
    results.push(candidate);
  }

  results.sort((a, b) => a.getTime() - b.getTime());
  return results;
}

/**
 * Generate candidate dates for MONTHLY/YEARLY with BYDAY expansion.
 */
function expandMonthlyByday(periodStart: Date, rule: IRecurrenceRule): Date[] {
  if (!rule.byDay || rule.byDay.length === 0) {
    return [periodStart];
  }

  const results: Date[] = [];
  const year = periodStart.getFullYear();
  const month = periodStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (const bd of rule.byDay) {
    const { ordinal, day } = parseByday(bd);

    if (ordinal === 0) {
      for (let d = 1; d <= daysInMonth; d++) {
        const candidate = new Date(
          year,
          month,
          d,
          periodStart.getHours(),
          periodStart.getMinutes(),
          periodStart.getSeconds(),
        );
        if (candidate.getDay() === day) {
          results.push(candidate);
        }
      }
    } else if (ordinal > 0) {
      const firstOfMonth = new Date(year, month, 1);
      const firstDow = firstOfMonth.getDay();
      const firstOccurrence = 1 + ((day - firstDow + 7) % 7);
      const nthDate = firstOccurrence + (ordinal - 1) * 7;
      if (nthDate >= 1 && nthDate <= daysInMonth) {
        results.push(
          new Date(
            year,
            month,
            nthDate,
            periodStart.getHours(),
            periodStart.getMinutes(),
            periodStart.getSeconds(),
          ),
        );
      }
    } else {
      const lastOfMonth = new Date(year, month, daysInMonth);
      const lastDow = lastOfMonth.getDay();
      const lastOccurrence = daysInMonth - ((lastDow - day + 7) % 7);
      const nthDate = lastOccurrence + (ordinal + 1) * 7;
      if (nthDate >= 1 && nthDate <= daysInMonth) {
        results.push(
          new Date(
            year,
            month,
            nthDate,
            periodStart.getHours(),
            periodStart.getMinutes(),
            periodStart.getSeconds(),
          ),
        );
      }
    }
  }

  results.sort((a, b) => a.getTime() - b.getTime());
  return results;
}

/**
 * Compare two dates for EXDATE matching (full datetime precision).
 */
function datesMatchForExdate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes() &&
    a.getSeconds() === b.getSeconds()
  );
}

/** Safety limit for iteration to prevent infinite loops. */
const MAX_ITERATIONS = 100_000;

/**
 * Generate raw occurrence dates from an RRULE, starting from dtstart.
 * Yields dates lazily, stopping at UNTIL/COUNT limits.
 */
function* generateOccurrences(
  dtstart: Date,
  rule: IRecurrenceRule,
  hardStop: Date,
): Generator<Date> {
  const interval = rule.interval ?? 1;
  const freq = rule.freq;
  const untilDate = rule.until ? parseLocalDate(rule.until) : null;
  const maxCount = rule.count ?? Infinity;

  let count = 0;
  let iterations = 0;

  // The first occurrence is always dtstart itself
  if (matchesByRules(dtstart, rule)) {
    count++;
    yield cloneDate(dtstart);
    if (count >= maxCount) return;
  }

  // WEEKLY with BYDAY: iterate week by week
  if (freq === RecurrenceFrequency.Weekly) {
    // First week: expand remaining days after dtstart
    if (rule.byDay && rule.byDay.length > 0) {
      const firstWeekCandidates = expandWeeklyByday(cloneDate(dtstart), rule);
      for (const candidate of firstWeekCandidates) {
        if (candidate.getTime() <= dtstart.getTime()) continue;
        if (untilDate && candidate.getTime() > untilDate.getTime()) return;
        if (candidate.getTime() > hardStop.getTime()) return;
        if (++iterations > MAX_ITERATIONS) return;
        if (matchesByRules(candidate, rule)) {
          count++;
          yield candidate;
          if (count >= maxCount) return;
        }
      }
    }

    // Subsequent weeks
    let weekNum = 1;
    while (true) {
      const weekStart = addToDate(dtstart, interval * weekNum * 7, 'days');
      if (untilDate && weekStart.getTime() > untilDate.getTime()) return;
      if (weekStart.getTime() > hardStop.getTime()) return;
      if (++iterations > MAX_ITERATIONS) return;

      if (rule.byDay && rule.byDay.length > 0) {
        const candidates = expandWeeklyByday(weekStart, rule);
        for (const candidate of candidates) {
          if (untilDate && candidate.getTime() > untilDate.getTime()) return;
          if (candidate.getTime() > hardStop.getTime()) return;
          if (++iterations > MAX_ITERATIONS) return;
          if (matchesByRules(candidate, rule)) {
            count++;
            yield candidate;
            if (count >= maxCount) return;
          }
        }
      } else {
        if (matchesByRules(weekStart, rule)) {
          count++;
          yield weekStart;
          if (count >= maxCount) return;
        }
      }
      weekNum++;
    }
  }

  // MONTHLY/YEARLY with BYDAY: expand within each period
  if (
    (freq === RecurrenceFrequency.Monthly ||
      freq === RecurrenceFrequency.Yearly) &&
    rule.byDay &&
    rule.byDay.length > 0
  ) {
    let periodNum = 1;
    while (true) {
      const unit = freqToUnit(freq);
      const periodStart = addToDate(dtstart, interval * periodNum, unit);
      if (untilDate && periodStart.getTime() > untilDate.getTime()) return;
      if (periodStart.getTime() > hardStop.getTime()) return;
      if (++iterations > MAX_ITERATIONS) return;

      const candidates = expandMonthlyByday(periodStart, rule);
      for (const candidate of candidates) {
        if (untilDate && candidate.getTime() > untilDate.getTime()) return;
        if (candidate.getTime() > hardStop.getTime()) return;
        if (++iterations > MAX_ITERATIONS) return;
        if (matchesByRules(candidate, rule)) {
          count++;
          yield candidate;
          if (count >= maxCount) return;
        }
      }
      periodNum++;
    }
  }

  // MONTHLY with BYMONTHDAY (no BYDAY)
  if (
    freq === RecurrenceFrequency.Monthly &&
    rule.byMonthDay &&
    rule.byMonthDay.length > 0 &&
    (!rule.byDay || rule.byDay.length === 0)
  ) {
    let periodNum = 1;
    while (true) {
      const baseDate = addToDate(dtstart, interval * periodNum, 'months');
      if (untilDate && baseDate.getTime() > untilDate.getTime()) return;
      if (baseDate.getTime() > hardStop.getTime()) return;
      if (++iterations > MAX_ITERATIONS) return;

      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const candidates: Date[] = [];
      for (const bmd of rule.byMonthDay) {
        let day: number;
        if (bmd > 0) {
          day = Math.min(bmd, daysInMonth);
        } else {
          day = daysInMonth + bmd + 1;
        }
        if (day >= 1 && day <= daysInMonth) {
          candidates.push(
            new Date(
              year,
              month,
              day,
              dtstart.getHours(),
              dtstart.getMinutes(),
              dtstart.getSeconds(),
            ),
          );
        }
      }
      candidates.sort((a, b) => a.getTime() - b.getTime());

      for (const candidate of candidates) {
        if (untilDate && candidate.getTime() > untilDate.getTime()) return;
        if (candidate.getTime() > hardStop.getTime()) return;
        if (matchesByRules(candidate, rule)) {
          count++;
          yield candidate;
          if (count >= maxCount) return;
        }
      }
      periodNum++;
    }
  }

  // General case: simple interval stepping for SECONDLY, MINUTELY, HOURLY, DAILY,
  // and MONTHLY/YEARLY without BYDAY or BYMONTHDAY expansion
  if (
    !(
      (freq === RecurrenceFrequency.Monthly ||
        freq === RecurrenceFrequency.Yearly) &&
      rule.byDay &&
      rule.byDay.length > 0
    ) &&
    !(
      freq === RecurrenceFrequency.Monthly &&
      rule.byMonthDay &&
      rule.byMonthDay.length > 0
    )
  ) {
    const unit = freqToUnit(freq);
    const step = interval;
    let stepNum = 1;

    while (true) {
      const candidate = addToDate(dtstart, step * stepNum, unit);
      if (untilDate && candidate.getTime() > untilDate.getTime()) return;
      if (candidate.getTime() > hardStop.getTime()) return;
      if (++iterations > MAX_ITERATIONS) return;

      if (matchesByRules(candidate, rule)) {
        count++;
        yield candidate;
        if (count >= maxCount) return;
      }
      stepNum++;
    }
  }
}

/**
 * Apply BYSETPOS filtering to a set of candidates within a single period.
 * BYSETPOS selects specific positions (1-based, negative from end) from the
 * expanded set of occurrences within a frequency period.
 */
function applyBySetPos(candidates: Date[], positions: number[]): Date[] {
  if (candidates.length === 0) return [];
  const result: Date[] = [];
  for (const pos of positions) {
    let idx: number;
    if (pos > 0) {
      idx = pos - 1;
    } else {
      idx = candidates.length + pos;
    }
    if (idx >= 0 && idx < candidates.length) {
      result.push(candidates[idx]);
    }
  }
  result.sort((a, b) => a.getTime() - b.getTime());
  return result;
}

/**
 * Expand a recurring event into individual occurrences within a time window.
 * Handles RRULE, EXDATE, RDATE, and DST transitions.
 *
 * The expansion is lazy — only occurrences within [windowStart, windowEnd] are
 * returned. EXDATE exclusions remove specific occurrences, and RDATE additions
 * inject extra occurrences.
 *
 * @param event - The recurring calendar event with an RRULE
 * @param windowStart - ISO 8601 start of the query window
 * @param windowEnd - ISO 8601 end of the query window
 * @param _timezone - IANA timezone identifier (reserved for future use; currently
 *                    uses the event's dtstartTzid for wall-clock preservation)
 * @returns Array of expanded event occurrences within the window
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.8
 */
export function expandRecurrence(
  event: ICalendarEventDTO,
  windowStart: string,
  windowEnd: string,
  _timezone: string,
): ICalendarEventDTO[] {
  const rrule = event.rrule;

  // Non-recurring event: return as-is if it falls within the window
  if (!rrule) {
    const start = parseLocalDate(event.dtstart);
    const wStart = parseLocalDate(windowStart);
    const wEnd = parseLocalDate(windowEnd);
    if (start >= wStart && start <= wEnd) {
      return [{ ...event }];
    }
    return [];
  }

  const dtstart = parseLocalDate(event.dtstart);
  const wStart = parseLocalDate(windowStart);
  const wEnd = parseLocalDate(windowEnd);

  // Compute event duration for shifting dtend on each occurrence
  const durationMs = event.dtend
    ? parseLocalDate(event.dtend).getTime() - dtstart.getTime()
    : 0;

  // Build EXDATE set for fast lookup
  const exdateSet = new Set<string>();
  if (event.exdates) {
    for (const exd of event.exdates) {
      const d = parseLocalDate(exd);
      exdateSet.add(formatLocalDate(d));
    }
  }

  // Collect RDATE additions
  const rdateDates: Date[] = [];
  if (event.rdates) {
    for (const rd of event.rdates) {
      rdateDates.push(parseLocalDate(rd));
    }
  }

  // Generate occurrences from RRULE
  const occurrences: Date[] = [];
  for (const occ of generateOccurrences(dtstart, rrule, wEnd)) {
    occurrences.push(occ);
  }

  // Add RDATE occurrences (they are additional, not subject to RRULE limits)
  for (const rd of rdateDates) {
    // Only add if not already in the occurrence set
    const rdKey = formatLocalDate(rd);
    const alreadyPresent = occurrences.some(
      (o) => formatLocalDate(o) === rdKey,
    );
    if (!alreadyPresent) {
      occurrences.push(rd);
    }
  }

  // Sort all occurrences chronologically
  occurrences.sort((a, b) => a.getTime() - b.getTime());

  // Apply BYSETPOS if specified (operates on the full occurrence set per period)
  // Note: BYSETPOS is complex and typically applies within each frequency period.
  // For simplicity, we apply it to the full set here. A more complete implementation
  // would group by period first.
  let finalOccurrences = occurrences;
  if (rrule.bySetPos && rrule.bySetPos.length > 0) {
    finalOccurrences = applyBySetPos(occurrences, rrule.bySetPos);
  }

  // Filter: remove EXDATEs, apply window bounds
  const results: ICalendarEventDTO[] = [];
  for (const occ of finalOccurrences) {
    const occKey = formatLocalDate(occ);

    // Skip excluded dates
    if (exdateSet.has(occKey)) {
      continue;
    }

    // Window filter
    if (occ < wStart || occ > wEnd) {
      continue;
    }

    // Build the occurrence event
    const occDtstart = formatLocalDate(occ);
    const occDtend = durationMs
      ? formatLocalDate(new Date(occ.getTime() + durationMs))
      : undefined;

    results.push({
      ...event,
      dtstart: occDtstart,
      dtend: occDtend ?? event.dtend,
      recurrenceId: occDtstart,
    });
  }

  return results;
}
