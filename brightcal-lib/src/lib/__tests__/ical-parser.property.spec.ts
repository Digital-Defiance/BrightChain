/**
 * Property-Based Tests for iCalendar Round-Trip Fidelity
 *
 * Feature: brightcal-shared-calendar, Property 1: iCalendar Round-Trip Fidelity
 *
 * For any valid iCalendar stream containing VEVENT components (including RRULE,
 * EXDATE, RDATE, multi-valued properties, property parameters, and folded lines),
 * parsing then serializing then parsing again SHALL produce an equivalent internal
 * representation to the first parse.
 *
 * Strategy: generate valid ICalendarEventDTO objects → serialize → parse → compare
 * parsed result to original DTO.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 1.9, 1.10
 */
import * as fc from 'fast-check';
import {
  EventTransparency,
  EventVisibility,
  ParticipationStatus,
  RecurrenceFrequency,
} from '../enums';
import type {
  IAttendeeDTO,
  ICalendarEventDTO,
  IRecurrenceRule,
  IReminderDTO,
} from '../interfaces';
import { parseICalendar } from '../parser/parseICalendar';
import { serializeToICalendar } from '../parser/serializeToICalendar';

// ── Helpers ──────────────────────────────────────────────────────────

/** Generate a simple alphanumeric string without iCal-special characters */
const arbSafeString: fc.Arbitrary<string> = fc
  .array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split(
        '',
      ),
    ),
    { minLength: 1, maxLength: 40 },
  )
  .map((chars) => {
    const s = chars.join('').trim();
    return s || 'a';
  });

/** Generate a valid email address */
const arbEmail: fc.Arbitrary<string> = fc
  .tuple(
    fc
      .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 2,
        maxLength: 10,
      })
      .map((c) => c.join('')),
    fc
      .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 2,
        maxLength: 8,
      })
      .map((c) => c.join('')),
  )
  .map(([user, domain]) => `${user}@${domain}.com`);

/** Generate a valid iCal datetime string (non-allDay, UTC) */
const arbDateTime = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
    second: fc.integer({ min: 0, max: 59 }),
  })
  .map(
    ({ year, month, day, hour, minute, second }) =>
      `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}${String(second).padStart(2, '0')}Z`,
  );

/** Generate a valid iCal DATE string (for allDay events) */
const arbDate = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(
    ({ year, month, day }) =>
      `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`,
  );

/** Generate a hex string of a given length */
function arbHex(len: number): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom(...'0123456789abcdef'.split('')), {
      minLength: len,
      maxLength: len,
    })
    .map((c) => c.join(''));
}

/** Generate a valid UUID */
const arbUid: fc.Arbitrary<string> = fc
  .tuple(arbHex(8), arbHex(4), arbHex(4), arbHex(4), arbHex(12))
  .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);

// ── Custom Arbitraries ───────────────────────────────────────────────

/**
 * arbRecurrenceRule - generates valid IRecurrenceRule objects
 */
const arbRecurrenceRule: fc.Arbitrary<IRecurrenceRule> = fc
  .record(
    {
      freq: fc.constantFrom(
        RecurrenceFrequency.Daily,
        RecurrenceFrequency.Weekly,
        RecurrenceFrequency.Monthly,
        RecurrenceFrequency.Yearly,
      ),
      count: fc.integer({ min: 1, max: 100 }),
      interval: fc.integer({ min: 1, max: 10 }),
      byDay: fc.subarray(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'], {
        minLength: 1,
        maxLength: 3,
      }),
      byMonth: fc.subarray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], {
        minLength: 1,
        maxLength: 3,
      }),
      byMonthDay: fc.subarray([1, 5, 10, 15, 20, 25, 28], {
        minLength: 1,
        maxLength: 3,
      }),
      byHour: fc.subarray([0, 6, 12, 18, 23], { minLength: 1, maxLength: 2 }),
      byMinute: fc.subarray([0, 15, 30, 45], { minLength: 1, maxLength: 2 }),
      wkst: fc.constantFrom('MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'),
    },
    {
      requiredKeys: ['freq'],
    },
  )
  .map((r) => {
    const rule: IRecurrenceRule = { freq: r.freq };
    if (r.count !== undefined) rule.count = r.count;
    if (r.interval !== undefined) rule.interval = r.interval;
    if (r.byDay !== undefined && r.byDay.length > 0) rule.byDay = r.byDay;
    if (r.byMonth !== undefined && r.byMonth.length > 0)
      rule.byMonth = r.byMonth;
    if (r.byMonthDay !== undefined && r.byMonthDay.length > 0)
      rule.byMonthDay = r.byMonthDay;
    if (r.byHour !== undefined && r.byHour.length > 0) rule.byHour = r.byHour;
    if (r.byMinute !== undefined && r.byMinute.length > 0)
      rule.byMinute = r.byMinute;
    if (r.wkst !== undefined) rule.wkst = r.wkst;
    return rule;
  });

/**
 * arbAttendee - generates valid IAttendeeDTO objects
 */
const arbAttendee: fc.Arbitrary<IAttendeeDTO> = fc
  .record({
    email: arbEmail,
    displayName: arbSafeString,
    partstat: fc.constantFrom(
      ParticipationStatus.NeedsAction,
      ParticipationStatus.Accepted,
      ParticipationStatus.Declined,
      ParticipationStatus.Tentative,
    ),
    role: fc.constantFrom(
      'REQ-PARTICIPANT' as const,
      'OPT-PARTICIPANT' as const,
      'NON-PARTICIPANT' as const,
      'CHAIR' as const,
    ),
    rsvp: fc.boolean(),
  })
  .map((r) => ({
    email: r.email,
    displayName: r.displayName as string | undefined,
    partstat: r.partstat,
    role: r.role,
    rsvp: r.rsvp,
  }));

/**
 * arbReminder - generates valid IReminderDTO objects
 * Uses only whole-minute values that round-trip cleanly through
 * the serialize (minutes→duration) and parse (duration→minutes) cycle.
 */
const arbReminder: fc.Arbitrary<IReminderDTO> = fc
  .record(
    {
      action: fc.constantFrom(
        'DISPLAY' as const,
        'EMAIL' as const,
        'AUDIO' as const,
      ),
      triggerMinutesBefore: fc.integer({ min: 0, max: 10080 }), // up to 1 week
      repeat: fc.integer({ min: 0, max: 5 }),
    },
    { requiredKeys: ['action', 'triggerMinutesBefore'] },
  )
  .map((r) => {
    const reminder: IReminderDTO = {
      action: r.action,
      triggerMinutesBefore: r.triggerMinutesBefore,
    };
    if (r.repeat !== undefined) reminder.repeat = r.repeat;
    return reminder;
  });

/**
 * arbCalendarEvent - generates valid ICalendarEventDTO objects with optional
 * RRULE, attendees, reminders, EXDATE, RDATE, categories
 */
const arbCalendarEvent: fc.Arbitrary<ICalendarEventDTO> = fc
  .record({
    uid: arbUid,
    summary: arbSafeString,
    description: fc.option(arbSafeString, { nil: undefined }),
    location: fc.option(arbSafeString, { nil: undefined }),
    sequence: fc.integer({ min: 0, max: 100 }),
    status: fc.constantFrom(
      'CONFIRMED' as const,
      'TENTATIVE' as const,
      'CANCELLED' as const,
    ),
    transparency: fc.constantFrom(
      EventTransparency.Opaque,
      EventTransparency.Transparent,
    ),
    visibility: fc.constantFrom(
      EventVisibility.Public,
      EventVisibility.Private,
      EventVisibility.Confidential,
    ),
    organizerId: arbEmail,
    attendees: fc.array(arbAttendee, { minLength: 0, maxLength: 3 }),
    rrule: fc.option(arbRecurrenceRule, { nil: undefined }),
    exdates: fc.option(fc.array(arbDateTime, { minLength: 1, maxLength: 3 }), {
      nil: undefined,
    }),
    rdates: fc.option(fc.array(arbDateTime, { minLength: 1, maxLength: 3 }), {
      nil: undefined,
    }),
    recurrenceId: fc.option(arbDateTime, { nil: undefined }),
    categories: fc.option(
      fc.array(arbSafeString, { minLength: 1, maxLength: 3 }),
      { nil: undefined },
    ),
    reminders: fc.array(arbReminder, { minLength: 0, maxLength: 2 }),
    allDay: fc.boolean(),
    dtstart: arbDateTime,
    dtend: arbDateTime,
  })
  .map((r) => {
    const event: ICalendarEventDTO = {
      id: '',
      dateCreated: '',
      calendarId: '',
      uid: r.uid,
      summary: r.summary as string,
      description: r.description as string | undefined,
      location: r.location as string | undefined,
      sequence: r.sequence,
      status: r.status,
      transparency: r.transparency,
      visibility: r.visibility,
      organizerId: r.organizerId,
      attendees: r.attendees,
      rrule: r.rrule as IRecurrenceRule | undefined,
      exdates: r.exdates as string[] | undefined,
      rdates: r.rdates as string[] | undefined,
      recurrenceId: r.recurrenceId as string | undefined,
      categories: r.categories as string[] | undefined,
      reminders: r.reminders,
      allDay: r.allDay,
      dtstart: r.allDay ? r.dtstart.substring(0, 8) : r.dtstart,
      dtend: r.allDay ? r.dtend.substring(0, 8) : r.dtend,
      dtstartTzid: 'UTC',
      dtendTzid: undefined,
      dateModified: '',
    };
    return event;
  });

// ── Comparison helpers ───────────────────────────────────────────────

/**
 * Compare the key fields that should survive the serialize → parse round-trip.
 * Fields like id, calendarId, dateCreated, dateModified are not serialized
 * to iCal format, so they won't survive the round-trip.
 */
function compareRoundTrip(
  original: ICalendarEventDTO,
  parsed: ICalendarEventDTO,
): void {
  expect(parsed.uid).toBe(original.uid);
  expect(parsed.summary).toBe(original.summary);
  expect(parsed.description || undefined).toBe(
    original.description || undefined,
  );
  expect(parsed.location || undefined).toBe(original.location || undefined);
  expect(parsed.dtstart).toBe(original.dtstart);
  expect(parsed.dtend || undefined).toBe(original.dtend || undefined);
  expect(parsed.sequence).toBe(original.sequence);
  expect(parsed.status).toBe(original.status);
  expect(parsed.transparency).toBe(original.transparency);
  expect(parsed.visibility).toBe(original.visibility);
  expect(parsed.allDay).toBe(original.allDay);
  expect(parsed.organizerId).toBe(original.organizerId);
  expect(parsed.recurrenceId || undefined).toBe(
    original.recurrenceId || undefined,
  );

  // Attendees
  expect(parsed.attendees.length).toBe(original.attendees.length);
  for (let i = 0; i < original.attendees.length; i++) {
    expect(parsed.attendees[i].email).toBe(original.attendees[i].email);
    expect(parsed.attendees[i].partstat).toBe(original.attendees[i].partstat);
    expect(parsed.attendees[i].role).toBe(original.attendees[i].role);
    expect(parsed.attendees[i].rsvp).toBe(original.attendees[i].rsvp);
    expect(parsed.attendees[i].displayName).toBe(
      original.attendees[i].displayName,
    );
  }

  // RRULE
  if (original.rrule) {
    expect(parsed.rrule).toBeDefined();
    expect(parsed.rrule!.freq).toBe(original.rrule.freq);
    expect(parsed.rrule!.count).toBe(original.rrule.count);
    expect(parsed.rrule!.interval).toBe(original.rrule.interval);
    expect(parsed.rrule!.byDay).toEqual(original.rrule.byDay);
    expect(parsed.rrule!.byMonth).toEqual(original.rrule.byMonth);
    expect(parsed.rrule!.byMonthDay).toEqual(original.rrule.byMonthDay);
    expect(parsed.rrule!.byHour).toEqual(original.rrule.byHour);
    expect(parsed.rrule!.byMinute).toEqual(original.rrule.byMinute);
    expect(parsed.rrule!.wkst).toBe(original.rrule.wkst);
  } else {
    expect(parsed.rrule).toBeUndefined();
  }

  // EXDATE, RDATE, categories (sorted for order-independent comparison)
  expect(parsed.exdates?.sort()).toEqual(original.exdates?.sort());
  expect(parsed.rdates?.sort()).toEqual(original.rdates?.sort());
  expect(parsed.categories?.sort()).toEqual(original.categories?.sort());

  // Reminders
  expect(parsed.reminders.length).toBe(original.reminders.length);
  for (let i = 0; i < original.reminders.length; i++) {
    expect(parsed.reminders[i].action).toBe(original.reminders[i].action);
    expect(parsed.reminders[i].triggerMinutesBefore).toBe(
      original.reminders[i].triggerMinutesBefore,
    );
    expect(parsed.reminders[i].repeat).toBe(original.reminders[i].repeat);
  }
}

// ── Property Tests ───────────────────────────────────────────────────

describe('Feature: brightcal-shared-calendar, Property 1: iCalendar Round-Trip Fidelity', () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 1.9, 1.10**
   *
   * For any valid ICalendarEventDTO, serializing to iCalendar format and then
   * parsing back should produce an equivalent internal representation.
   *
   * Test flow: generate DTO → serialize → parse → compare
   */
  it('should preserve event data through serialize → parse round-trip', () => {
    fc.assert(
      fc.property(arbCalendarEvent, (event) => {
        // Serialize the event to iCal format
        const icalString = serializeToICalendar([event]);

        // Parse the iCal string back
        const parseResult = parseICalendar(icalString);

        // Should parse without errors
        const errors = parseResult.errors.filter((e) => e.severity === 'error');
        expect(errors).toEqual([]);

        // Should produce exactly one event
        expect(parseResult.events.length).toBe(1);

        // Compare the round-tripped event to the original
        compareRoundTrip(event, parseResult.events[0]);
      }),
      { numRuns: 100, verbose: true },
    );
  });

  /**
   * **Validates: Requirements 1.7**
   *
   * Double round-trip: serialize → parse → serialize → parse should also
   * produce equivalent results, confirming idempotency.
   */
  it('should be idempotent: serialize → parse → serialize → parse equals first parse', () => {
    fc.assert(
      fc.property(arbCalendarEvent, (event) => {
        // First round-trip
        const ical1 = serializeToICalendar([event]);
        const parsed1 = parseICalendar(ical1);
        expect(parsed1.events.length).toBe(1);

        // Second round-trip
        const ical2 = serializeToICalendar(parsed1.events);
        const parsed2 = parseICalendar(ical2);
        expect(parsed2.events.length).toBe(1);

        // Both parses should produce equivalent results
        compareRoundTrip(parsed1.events[0], parsed2.events[0]);
      }),
      { numRuns: 100, verbose: true },
    );
  });
});

// ── Property 2: iCal Serializer Structural Validity ──────────────────

describe('Feature: brightcal-shared-calendar, Property 2: iCal Serializer Structural Validity', () => {
  /**
   * **Validates: Requirements 1.6**
   *
   * For any valid internal Event representation, serializing to iCalendar
   * format SHALL produce output that conforms to RFC 5545 structure:
   * - Proper BEGIN/END blocks
   * - Required properties present
   * - Correct line folding (no raw line > 75 octets)
   * - Valid CRLF line endings
   * - VALARM nested within VEVENT
   */
  it('should produce structurally valid iCalendar output', () => {
    const encoder = new TextEncoder();

    fc.assert(
      fc.property(arbCalendarEvent, (event) => {
        const ical = serializeToICalendar([event]);

        // ── 1. Starts with BEGIN:VCALENDAR and ends with END:VCALENDAR ──
        expect(ical.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
        expect(ical.endsWith('END:VCALENDAR\r\n')).toBe(true);

        // ── 2. Contains VERSION:2.0 and PRODID ──
        expect(ical).toContain('VERSION:2.0\r\n');
        expect(ical).toMatch(/PRODID:.+\r\n/);

        // ── 6. Uses CRLF line endings throughout ──
        // Split on CRLF, then verify no stray LF or CR remain in segments
        const segments = ical.split('\r\n');
        for (const seg of segments) {
          expect(seg).not.toContain('\r');
          expect(seg).not.toContain('\n');
        }

        // ── Unfold for logical-line analysis ──
        // RFC 5545 §3.1: continuation lines start with a single LWSP char
        const unfolded = ical.replace(/\r\n[ \t]/g, '');
        const lines = unfolded.split('\r\n').filter((l) => l.length > 0);

        // ── 3. Each event wrapped in BEGIN:VEVENT / END:VEVENT ──
        const veventBegins = lines.filter((l) => l === 'BEGIN:VEVENT').length;
        const veventEnds = lines.filter((l) => l === 'END:VEVENT').length;
        expect(veventBegins).toBe(1);
        expect(veventEnds).toBe(1);

        // ── 4. BEGIN/END blocks are properly nested (no overlapping) ──
        const stack: string[] = [];
        for (const line of lines) {
          if (line.startsWith('BEGIN:')) {
            stack.push(line.substring(6));
          } else if (line.startsWith('END:')) {
            const component = line.substring(4);
            expect(stack.length).toBeGreaterThan(0);
            expect(stack[stack.length - 1]).toBe(component);
            stack.pop();
          }
        }
        expect(stack).toEqual([]);

        // ── 5. No raw line exceeds 75 octets ──
        // Raw lines are the CRLF-split segments (before unfolding)
        for (const seg of segments) {
          if (seg.length === 0) continue; // trailing empty after final CRLF
          const byteLen = encoder.encode(seg).length;
          expect(byteLen).toBeLessThanOrEqual(75);
        }

        // ── 7. Required properties present: UID, DTSTART, SUMMARY ──
        const hasUid = lines.some((l) => l.startsWith('UID:'));
        const hasDtstart = lines.some(
          (l) => l.startsWith('DTSTART:') || l.startsWith('DTSTART;'),
        );
        const hasSummary = lines.some((l) => l.startsWith('SUMMARY:'));
        expect(hasUid).toBe(true);
        expect(hasDtstart).toBe(true);
        expect(hasSummary).toBe(true);

        // ── 8. VALARM blocks (if present) are nested within VEVENT ──
        let inVevent = false;
        for (const line of lines) {
          if (line === 'BEGIN:VEVENT') inVevent = true;
          if (line === 'END:VEVENT') inVevent = false;
          if (line === 'BEGIN:VALARM' || line === 'END:VALARM') {
            expect(inVevent).toBe(true);
          }
        }

        // Verify VALARM count matches reminders
        const valarmBegins = lines.filter((l) => l === 'BEGIN:VALARM').length;
        const valarmEnds = lines.filter((l) => l === 'END:VALARM').length;
        expect(valarmBegins).toBe(event.reminders.length);
        expect(valarmEnds).toBe(event.reminders.length);
      }),
      { numRuns: 100, verbose: true },
    );
  });
});
