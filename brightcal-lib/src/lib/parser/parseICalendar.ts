import {
  EventTransparency,
  EventVisibility,
  ParticipationStatus,
  RecurrenceFrequency,
} from '../enums';
import {
  IAttendeeDTO,
  ICalendarEventDTO,
  ICalendarTodoDTO,
  ICalParseError,
  ICalParseResult,
  IFreeBusyDataDTO,
  IFreeBusySlot,
  IRecurrenceRule,
  IReminderDTO,
} from '../interfaces';

// ── Helpers ──────────────────────────────────────────────────────────

/** Unfold lines per RFC 5545 §3.1: CRLF followed by a single space or tab is a continuation. */
function unfoldLines(input: string): string[] {
  // Normalize line endings to \n
  const normalized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Unfold: a line starting with space or tab is a continuation of the previous line
  const unfolded = normalized.replace(/\n[ \t]/g, '');
  return unfolded.split('\n').filter((l) => l.length > 0);
}

/** Parsed content line: NAME;PARAM=VAL;...:VALUE */
interface ContentLine {
  name: string;
  params: Record<string, string>;
  value: string;
  lineNumber: number;
}

/**
 * Parse a single content line into name, parameters, and value.
 * Handles quoted parameter values correctly.
 */
function parseContentLine(raw: string, lineNumber: number): ContentLine {
  // Find the first unquoted colon that separates name+params from value
  let inQuote = false;
  let colonIdx = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '"') {
      inQuote = !inQuote;
    } else if (raw[i] === ':' && !inQuote) {
      colonIdx = i;
      break;
    }
  }

  if (colonIdx === -1) {
    return { name: raw.toUpperCase(), params: {}, value: '', lineNumber };
  }

  const head = raw.substring(0, colonIdx);
  const value = raw.substring(colonIdx + 1);

  // Split head into name and params on unquoted semicolons
  const parts: string[] = [];
  let current = '';
  inQuote = false;
  for (let i = 0; i < head.length; i++) {
    if (head[i] === '"') {
      inQuote = !inQuote;
      current += head[i];
    } else if (head[i] === ';' && !inQuote) {
      parts.push(current);
      current = '';
    } else {
      current += head[i];
    }
  }
  parts.push(current);

  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const eqIdx = parts[i].indexOf('=');
    if (eqIdx > 0) {
      const pName = parts[i].substring(0, eqIdx).toUpperCase();
      let pVal = parts[i].substring(eqIdx + 1);
      // Strip surrounding quotes
      if (pVal.startsWith('"') && pVal.endsWith('"')) {
        pVal = pVal.slice(1, -1);
      }
      params[pName] = pVal;
    }
  }

  return { name, params, value, lineNumber };
}

// ── RRULE parsing ────────────────────────────────────────────────────

function parseRRule(value: string): IRecurrenceRule | undefined {
  const parts = value.split(';');
  const map: Record<string, string> = {};
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      map[part.substring(0, eqIdx).toUpperCase()] = part.substring(eqIdx + 1);
    }
  }

  const freqStr = map['FREQ'];
  if (!freqStr) return undefined;

  const freq = Object.values(RecurrenceFrequency).find((f) => f === freqStr) as
    | RecurrenceFrequency
    | undefined;
  if (!freq) return undefined;

  const rule: IRecurrenceRule = { freq };

  if (map['UNTIL']) rule.until = map['UNTIL'];
  if (map['COUNT']) rule.count = parseInt(map['COUNT'], 10);
  if (map['INTERVAL']) rule.interval = parseInt(map['INTERVAL'], 10);
  if (map['BYSECOND']) rule.bySecond = map['BYSECOND'].split(',').map(Number);
  if (map['BYMINUTE']) rule.byMinute = map['BYMINUTE'].split(',').map(Number);
  if (map['BYHOUR']) rule.byHour = map['BYHOUR'].split(',').map(Number);
  if (map['BYDAY']) rule.byDay = map['BYDAY'].split(',');
  if (map['BYMONTHDAY'])
    rule.byMonthDay = map['BYMONTHDAY'].split(',').map(Number);
  if (map['BYYEARDAY'])
    rule.byYearDay = map['BYYEARDAY'].split(',').map(Number);
  if (map['BYWEEKNO']) rule.byWeekNo = map['BYWEEKNO'].split(',').map(Number);
  if (map['BYMONTH']) rule.byMonth = map['BYMONTH'].split(',').map(Number);
  if (map['BYSETPOS']) rule.bySetPos = map['BYSETPOS'].split(',').map(Number);
  if (map['WKST']) rule.wkst = map['WKST'];

  return rule;
}

// ── VALARM parsing ───────────────────────────────────────────────────

function parseAlarm(lines: ContentLine[]): IReminderDTO | undefined {
  let action: IReminderDTO['action'] = 'DISPLAY';
  let triggerMinutesBefore = 0;
  let duration: string | undefined;
  let repeat: number | undefined;

  for (const line of lines) {
    switch (line.name) {
      case 'ACTION':
        if (
          line.value === 'DISPLAY' ||
          line.value === 'EMAIL' ||
          line.value === 'AUDIO'
        ) {
          action = line.value;
        }
        break;
      case 'TRIGGER':
        triggerMinutesBefore = parseTriggerToMinutes(line.value);
        break;
      case 'DURATION':
        duration = line.value;
        break;
      case 'REPEAT':
        repeat = parseInt(line.value, 10);
        break;
    }
  }

  return { action, triggerMinutesBefore, duration, repeat };
}

/** Parse an iCal TRIGGER duration (e.g. -PT15M, -P1DT2H) into minutes before. */
function parseTriggerToMinutes(value: string): number {
  const negative = value.startsWith('-');
  const stripped = value.replace(/^[+-]/, '');
  let minutes = 0;

  // Match P[nW] or P[nD][T[nH][nM][nS]]
  const weekMatch = stripped.match(/P(\d+)W/);
  if (weekMatch) {
    return (negative ? 1 : -1) * parseInt(weekMatch[1], 10) * 7 * 24 * 60;
  }

  const dayMatch = stripped.match(/P(\d+)D/);
  if (dayMatch) minutes += parseInt(dayMatch[1], 10) * 24 * 60;

  const hourMatch = stripped.match(/T.*?(\d+)H/);
  if (hourMatch) minutes += parseInt(hourMatch[1], 10) * 60;

  const minMatch = stripped.match(/T.*?(\d+)M/);
  if (minMatch) minutes += parseInt(minMatch[1], 10);

  const secMatch = stripped.match(/T.*?(\d+)S/);
  if (secMatch) minutes += Math.ceil(parseInt(secMatch[1], 10) / 60);

  return negative ? minutes : -minutes;
}

// ── Attendee parsing ─────────────────────────────────────────────────

function parseAttendee(line: ContentLine): IAttendeeDTO {
  const email = line.value.replace(/^mailto:/i, '');
  const partstatStr = line.params['PARTSTAT'] || 'NEEDS-ACTION';
  const partstat =
    Object.values(ParticipationStatus).find((p) => p === partstatStr) ??
    ParticipationStatus.NeedsAction;
  const roleStr = line.params['ROLE'] || 'REQ-PARTICIPANT';
  const role = (
    ['REQ-PARTICIPANT', 'OPT-PARTICIPANT', 'NON-PARTICIPANT', 'CHAIR'].includes(
      roleStr,
    )
      ? roleStr
      : 'REQ-PARTICIPANT'
  ) as IAttendeeDTO['role'];
  const rsvp = line.params['RSVP']?.toUpperCase() === 'TRUE';
  const displayName = line.params['CN'] || undefined;

  return { email, displayName, partstat, role, rsvp };
}

// ── Multi-valued property splitting ──────────────────────────────────

/** Split comma-separated values, respecting that date-times may contain commas in TZID params. */
function splitMultiValue(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

// ── FreeBusy slot parsing ────────────────────────────────────────────

function parseFreeBusySlot(value: string, fbType: string): IFreeBusySlot[] {
  const periods = splitMultiValue(value);
  const type = (
    ['BUSY', 'BUSY-TENTATIVE', 'BUSY-UNAVAILABLE', 'FREE'].includes(fbType)
      ? fbType
      : 'BUSY'
  ) as IFreeBusySlot['type'];

  return periods.map((period) => {
    const [start, end] = period.split('/');
    return { start: start || '', end: end || '', type };
  });
}

// ── Component builders ───────────────────────────────────────────────

function buildEvent(
  lines: ContentLine[],
  alarms: IReminderDTO[],
  errors: ICalParseError[],
): ICalendarEventDTO {
  const event: ICalendarEventDTO = {
    id: '',
    dateCreated: '',
    calendarId: '',
    uid: '',
    sequence: 0,
    summary: '',
    dtstart: '',
    dtstartTzid: 'UTC',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    status: 'CONFIRMED',
    organizerId: '',
    attendees: [],
    reminders: alarms,
    dateModified: '',
  };

  const exdates: string[] = [];
  const rdates: string[] = [];
  const categories: string[] = [];

  for (const line of lines) {
    switch (line.name) {
      case 'UID':
        event.uid = line.value;
        break;
      case 'SUMMARY':
        event.summary = line.value;
        break;
      case 'DESCRIPTION':
        event.description = line.value;
        break;
      case 'LOCATION':
        event.location = line.value;
        break;
      case 'DTSTART': {
        event.dtstart = line.value;
        if (line.params['TZID']) event.dtstartTzid = line.params['TZID'];
        if (line.params['VALUE']?.toUpperCase() === 'DATE') event.allDay = true;
        break;
      }
      case 'DTEND': {
        event.dtend = line.value;
        if (line.params['TZID']) event.dtendTzid = line.params['TZID'];
        break;
      }
      case 'SEQUENCE':
        event.sequence = parseInt(line.value, 10) || 0;
        break;
      case 'STATUS':
        if (
          ['CONFIRMED', 'TENTATIVE', 'CANCELLED'].includes(
            line.value.toUpperCase(),
          )
        ) {
          event.status = line.value.toUpperCase() as
            | 'CONFIRMED'
            | 'TENTATIVE'
            | 'CANCELLED';
        }
        break;
      case 'TRANSP':
        if (line.value.toUpperCase() === 'TRANSPARENT') {
          event.transparency = EventTransparency.Transparent;
        } else {
          event.transparency = EventTransparency.Opaque;
        }
        break;
      case 'CLASS':
        if (line.value.toUpperCase() === 'PRIVATE')
          event.visibility = EventVisibility.Private;
        else if (line.value.toUpperCase() === 'CONFIDENTIAL')
          event.visibility = EventVisibility.Confidential;
        else event.visibility = EventVisibility.Public;
        break;
      case 'ORGANIZER':
        event.organizerId = line.value.replace(/^mailto:/i, '');
        break;
      case 'ATTENDEE':
        event.attendees.push(parseAttendee(line));
        break;
      case 'RRULE': {
        const rule = parseRRule(line.value);
        if (rule) {
          event.rrule = rule;
        } else {
          errors.push({
            line: line.lineNumber,
            message: `Invalid RRULE: ${line.value}`,
            severity: 'error',
          });
        }
        break;
      }
      case 'EXDATE':
        exdates.push(...splitMultiValue(line.value));
        break;
      case 'RDATE':
        rdates.push(...splitMultiValue(line.value));
        break;
      case 'RECURRENCE-ID':
        event.recurrenceId = line.value;
        break;
      case 'CATEGORIES':
        categories.push(...splitMultiValue(line.value));
        break;
      case 'CREATED':
        event.dateCreated = line.value;
        break;
      case 'LAST-MODIFIED':
        event.dateModified = line.value;
        break;
      case 'DTSTAMP':
        // Use as dateModified fallback
        if (!event.dateModified) event.dateModified = line.value;
        break;
    }
  }

  if (exdates.length > 0) event.exdates = exdates;
  if (rdates.length > 0) event.rdates = rdates;
  if (categories.length > 0) event.categories = categories;

  // Validate required fields
  if (!event.uid) {
    errors.push({
      line: lines[0]?.lineNumber ?? 0,
      message: 'VEVENT missing required UID property',
      severity: 'error',
    });
  }
  if (!event.dtstart) {
    errors.push({
      line: lines[0]?.lineNumber ?? 0,
      message: 'VEVENT missing required DTSTART property',
      severity: 'error',
    });
  }

  return event;
}

function buildTodo(
  lines: ContentLine[],
  errors: ICalParseError[],
): ICalendarTodoDTO {
  const todo: ICalendarTodoDTO = {
    uid: '',
    summary: '',
    status: 'NEEDS-ACTION',
  };

  for (const line of lines) {
    switch (line.name) {
      case 'UID':
        todo.uid = line.value;
        break;
      case 'SUMMARY':
        todo.summary = line.value;
        break;
      case 'DESCRIPTION':
        todo.description = line.value;
        break;
      case 'DUE':
        todo.due = line.value;
        break;
      case 'COMPLETED':
        todo.completed = line.value;
        break;
      case 'PERCENT-COMPLETE':
        todo.percentComplete = parseInt(line.value, 10);
        break;
      case 'PRIORITY':
        todo.priority = parseInt(line.value, 10);
        break;
      case 'STATUS':
        if (
          ['NEEDS-ACTION', 'COMPLETED', 'IN-PROCESS', 'CANCELLED'].includes(
            line.value.toUpperCase(),
          )
        ) {
          todo.status = line.value.toUpperCase() as ICalendarTodoDTO['status'];
        }
        break;
    }
  }

  if (!todo.uid) {
    errors.push({
      line: lines[0]?.lineNumber ?? 0,
      message: 'VTODO missing required UID property',
      severity: 'error',
    });
  }

  return todo;
}

function buildFreeBusy(lines: ContentLine[]): IFreeBusyDataDTO {
  const fb: IFreeBusyDataDTO = {
    userId: '',
    rangeStart: '',
    rangeEnd: '',
    slots: [],
  };

  for (const line of lines) {
    switch (line.name) {
      case 'DTSTART':
        fb.rangeStart = line.value;
        break;
      case 'DTEND':
        fb.rangeEnd = line.value;
        break;
      case 'ORGANIZER':
        fb.userId = line.value.replace(/^mailto:/i, '');
        break;
      case 'ATTENDEE':
        if (!fb.userId) fb.userId = line.value.replace(/^mailto:/i, '');
        break;
      case 'FREEBUSY': {
        const fbType = line.params['FBTYPE'] || 'BUSY';
        fb.slots.push(...parseFreeBusySlot(line.value, fbType.toUpperCase()));
        break;
      }
    }
  }

  return fb;
}

// ── Main parser ──────────────────────────────────────────────────────

/**
 * Parse an iCalendar string into internal representations.
 * Handles VEVENT, VTODO, VFREEBUSY, and VALARM components.
 * Supports line unfolding (RFC 5545 §3.1), multi-valued properties,
 * and property parameters (TZID, VALUE, ENCODING).
 *
 * @param input - Raw iCalendar string
 * @returns Parse result with events, todos, freeBusy data, and errors
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 1.9, 1.10
 */
export function parseICalendar(input: string): ICalParseResult {
  const errors: ICalParseError[] = [];
  const events: ICalendarEventDTO[] = [];
  const todos: ICalendarTodoDTO[] = [];
  const freeBusy: IFreeBusyDataDTO[] = [];

  if (!input || input.trim().length === 0) {
    errors.push({ line: 0, message: 'Empty input', severity: 'error' });
    return { events, todos, freeBusy, errors };
  }

  const rawLines = unfoldLines(input);

  // Track component nesting with a stack
  type ComponentFrame = {
    type: string;
    lines: ContentLine[];
    alarms: IReminderDTO[];
    startLine: number;
  };

  const stack: ComponentFrame[] = [];
  let inCalendar = false;

  for (let i = 0; i < rawLines.length; i++) {
    const lineNumber = i + 1;
    const parsed = parseContentLine(rawLines[i], lineNumber);

    if (parsed.name === 'BEGIN') {
      const componentType = parsed.value.toUpperCase();

      if (componentType === 'VCALENDAR') {
        inCalendar = true;
        continue;
      }

      if (!inCalendar) {
        errors.push({
          line: lineNumber,
          message: `Component ${componentType} outside VCALENDAR`,
          severity: 'warning',
        });
      }

      stack.push({
        type: componentType,
        lines: [],
        alarms: [],
        startLine: lineNumber,
      });
      continue;
    }

    if (parsed.name === 'END') {
      const componentType = parsed.value.toUpperCase();

      if (componentType === 'VCALENDAR') {
        inCalendar = false;
        continue;
      }

      const frame = stack.pop();
      if (!frame || frame.type !== componentType) {
        errors.push({
          line: lineNumber,
          message: `Mismatched END:${componentType}${frame ? `, expected END:${frame.type}` : ''}`,
          severity: 'error',
        });
        continue;
      }

      // If this is a VALARM nested inside a parent, attach it
      if (componentType === 'VALARM') {
        const parent = stack[stack.length - 1];
        if (parent) {
          const alarm = parseAlarm(frame.lines);
          if (alarm) parent.alarms.push(alarm);
        }
        continue;
      }

      // Top-level component completed
      switch (componentType) {
        case 'VEVENT':
          events.push(buildEvent(frame.lines, frame.alarms, errors));
          break;
        case 'VTODO':
          todos.push(buildTodo(frame.lines, errors));
          break;
        case 'VFREEBUSY':
          freeBusy.push(buildFreeBusy(frame.lines));
          break;
        default:
          // Skip unknown component types with a warning
          errors.push({
            line: frame.startLine,
            message: `Unknown component type: ${componentType}`,
            severity: 'warning',
          });
          break;
      }
      continue;
    }

    // Regular property line — add to current component
    if (stack.length > 0) {
      stack[stack.length - 1].lines.push(parsed);
    }
    // Properties outside any component (e.g. VCALENDAR-level like VERSION, PRODID) are ignored
  }

  // Check for unclosed components
  for (const frame of stack) {
    errors.push({
      line: frame.startLine,
      message: `Unclosed component: ${frame.type}`,
      severity: 'error',
    });
  }

  return { events, todos, freeBusy, errors };
}
