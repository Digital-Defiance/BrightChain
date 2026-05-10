import {
  EventTransparency,
  EventVisibility,
  ParticipationStatus,
  RecurrenceFrequency,
} from '../enums';
import { ICalendarEventDTO } from '../interfaces';
import { parseICalendar } from './parseICalendar';
import { serializeToICalendar } from './serializeToICalendar';

/** Helper to build a minimal valid event DTO. */
function makeEvent(
  overrides: Partial<ICalendarEventDTO> = {},
): ICalendarEventDTO {
  return {
    id: '',
    dateCreated: '20250101T000000Z',
    calendarId: '',
    uid: 'test-uid-001',
    sequence: 0,
    summary: 'Test Event',
    dtstart: '20250615T090000',
    dtstartTzid: 'America/New_York',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    status: 'CONFIRMED',
    organizerId: 'organizer@example.com',
    attendees: [],
    reminders: [],
    dateModified: '20250101T000000Z',
    ...overrides,
  };
}

describe('serializeToICalendar', () => {
  it('should wrap output in VCALENDAR with VERSION and PRODID', () => {
    const result = serializeToICalendar([]);
    expect(result).toContain('BEGIN:VCALENDAR\r\n');
    expect(result).toContain('VERSION:2.0\r\n');
    expect(result).toContain('PRODID:');
    expect(result).toContain('END:VCALENDAR\r\n');
  });

  it('should use CRLF line endings throughout', () => {
    const result = serializeToICalendar([makeEvent()]);
    // Every line should end with \r\n, no bare \n
    const lines = result.split('\r\n');
    // The last element after split will be empty string
    expect(lines[lines.length - 1]).toBe('');
    // No bare \n in any line
    for (const line of lines) {
      expect(line).not.toContain('\n');
    }
  });

  it('should serialize a basic event with VEVENT block', () => {
    const result = serializeToICalendar([makeEvent()]);
    expect(result).toContain('BEGIN:VEVENT\r\n');
    expect(result).toContain('UID:test-uid-001\r\n');
    expect(result).toContain(
      'DTSTART;TZID=America/New_York:20250615T090000\r\n',
    );
    expect(result).toContain('SUMMARY:Test Event\r\n');
    expect(result).toContain('STATUS:CONFIRMED\r\n');
    expect(result).toContain('TRANSP:OPAQUE\r\n');
    expect(result).toContain('CLASS:PUBLIC\r\n');
    expect(result).toContain('ORGANIZER:mailto:organizer@example.com\r\n');
    expect(result).toContain('END:VEVENT\r\n');
  });

  it('should serialize all-day events with VALUE=DATE', () => {
    const event = makeEvent({
      allDay: true,
      dtstart: '20250615',
      dtend: '20250616',
    });
    const result = serializeToICalendar([event]);
    expect(result).toContain('DTSTART;VALUE=DATE:20250615\r\n');
    expect(result).toContain('DTEND;VALUE=DATE:20250616\r\n');
  });

  it('should include TZID on DTEND when timezone is specified', () => {
    const event = makeEvent({
      dtend: '20250615T100000',
      dtendTzid: 'Europe/London',
    });
    const result = serializeToICalendar([event]);
    expect(result).toContain('DTEND;TZID=Europe/London:20250615T100000\r\n');
  });

  it('should omit TZID when timezone is UTC', () => {
    const event = makeEvent({
      dtstartTzid: 'UTC',
      dtstart: '20250615T090000Z',
    });
    const result = serializeToICalendar([event]);
    expect(result).toContain('DTSTART:20250615T090000Z\r\n');
  });

  it('should serialize attendees with all parameters', () => {
    const event = makeEvent({
      attendees: [
        {
          email: 'a@b.com',
          displayName: 'Al',
          partstat: ParticipationStatus.Accepted,
          role: 'REQ-PARTICIPANT',
          rsvp: true,
        },
      ],
    });
    const result = serializeToICalendar([event]);
    // Unfold to check the logical content
    const unfolded = result.replace(/\r\n[ \t]/g, '');
    expect(unfolded).toContain(
      'ATTENDEE;CN=Al;PARTSTAT=ACCEPTED;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:a@b.com',
    );
  });

  it('should serialize RRULE with all parts', () => {
    const event = makeEvent({
      rrule: {
        freq: RecurrenceFrequency.Weekly,
        count: 10,
        interval: 2,
        byDay: ['MO', 'WE', 'FR'],
        wkst: 'MO',
      },
    });
    const result = serializeToICalendar([event]);
    expect(result).toContain(
      'RRULE:FREQ=WEEKLY;COUNT=10;INTERVAL=2;BYDAY=MO,WE,FR;WKST=MO\r\n',
    );
  });

  it('should serialize EXDATE and RDATE as comma-separated values', () => {
    const event = makeEvent({
      exdates: ['20250620T090000', '20250627T090000'],
      rdates: ['20250701T090000'],
    });
    const result = serializeToICalendar([event]);
    expect(result).toContain('EXDATE:20250620T090000,20250627T090000\r\n');
    expect(result).toContain('RDATE:20250701T090000\r\n');
  });

  it('should serialize CATEGORIES as comma-separated values', () => {
    const event = makeEvent({ categories: ['Work', 'Meeting'] });
    const result = serializeToICalendar([event]);
    expect(result).toContain('CATEGORIES:Work,Meeting\r\n');
  });

  it('should serialize VALARM reminders', () => {
    const event = makeEvent({
      reminders: [
        { action: 'DISPLAY', triggerMinutesBefore: 15 },
        {
          action: 'EMAIL',
          triggerMinutesBefore: 60,
          duration: 'PT5M',
          repeat: 2,
        },
      ],
    });
    const result = serializeToICalendar([event]);
    expect(result).toContain('BEGIN:VALARM\r\n');
    expect(result).toContain('ACTION:DISPLAY\r\n');
    expect(result).toContain('TRIGGER:-PT15M\r\n');
    expect(result).toContain('ACTION:EMAIL\r\n');
    expect(result).toContain('TRIGGER:-PT1H\r\n');
    expect(result).toContain('DURATION:PT5M\r\n');
    expect(result).toContain('REPEAT:2\r\n');
    expect(result).toContain('END:VALARM\r\n');
  });

  it('should serialize visibility as CLASS property', () => {
    const priv = makeEvent({ visibility: EventVisibility.Private });
    const conf = makeEvent({ visibility: EventVisibility.Confidential });
    expect(serializeToICalendar([priv])).toContain('CLASS:PRIVATE\r\n');
    expect(serializeToICalendar([conf])).toContain('CLASS:CONFIDENTIAL\r\n');
  });

  it('should fold lines longer than 75 octets', () => {
    const longDescription = 'A'.repeat(200);
    const event = makeEvent({ description: longDescription });
    const result = serializeToICalendar([event]);
    // After folding, no raw line should exceed 75 bytes
    const rawLines = result.split('\r\n');
    const encoder = new TextEncoder();
    for (const line of rawLines) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it('should serialize RECURRENCE-ID when present', () => {
    const event = makeEvent({ recurrenceId: '20250620T090000' });
    const result = serializeToICalendar([event]);
    expect(result).toContain('RECURRENCE-ID:20250620T090000\r\n');
  });

  it('should serialize multiple events', () => {
    const events = [
      makeEvent({ uid: 'uid-1', summary: 'Event One' }),
      makeEvent({ uid: 'uid-2', summary: 'Event Two' }),
    ];
    const result = serializeToICalendar(events);
    const veventCount = (result.match(/BEGIN:VEVENT/g) || []).length;
    expect(veventCount).toBe(2);
    expect(result).toContain('UID:uid-1');
    expect(result).toContain('UID:uid-2');
  });

  describe('round-trip fidelity', () => {
    it('should round-trip a basic event through serialize → parse', () => {
      const original = makeEvent({
        uid: 'round-trip-uid',
        summary: 'Round Trip Test',
        description: 'Testing round-trip',
        location: 'Conference Room',
        dtstart: '20250615T090000',
        dtend: '20250615T100000',
        dtstartTzid: 'America/New_York',
        dtendTzid: 'America/New_York',
        sequence: 3,
        status: 'TENTATIVE',
        transparency: EventTransparency.Transparent,
        visibility: EventVisibility.Private,
        organizerId: 'org@example.com',
        categories: ['Work', 'Important'],
        attendees: [
          {
            email: 'bob@example.com',
            displayName: 'Bob',
            partstat: ParticipationStatus.Tentative,
            role: 'OPT-PARTICIPANT',
            rsvp: false,
          },
        ],
        reminders: [{ action: 'DISPLAY', triggerMinutesBefore: 30 }],
        exdates: ['20250622T090000'],
        rdates: ['20250701T090000'],
        rrule: {
          freq: RecurrenceFrequency.Daily,
          count: 5,
        },
      });

      const ics = serializeToICalendar([original]);
      const parsed = parseICalendar(ics);

      expect(parsed.errors.length).toBe(0);
      expect(parsed.events.length).toBe(1);

      const evt = parsed.events[0];
      expect(evt.uid).toBe('round-trip-uid');
      expect(evt.summary).toBe('Round Trip Test');
      expect(evt.description).toBe('Testing round-trip');
      expect(evt.location).toBe('Conference Room');
      expect(evt.dtstart).toBe('20250615T090000');
      expect(evt.dtend).toBe('20250615T100000');
      expect(evt.dtstartTzid).toBe('America/New_York');
      expect(evt.dtendTzid).toBe('America/New_York');
      expect(evt.sequence).toBe(3);
      expect(evt.status).toBe('TENTATIVE');
      expect(evt.transparency).toBe(EventTransparency.Transparent);
      expect(evt.visibility).toBe(EventVisibility.Private);
      expect(evt.organizerId).toBe('org@example.com');
      expect(evt.categories).toEqual(['Work', 'Important']);
      expect(evt.attendees.length).toBe(1);
      expect(evt.attendees[0].email).toBe('bob@example.com');
      expect(evt.attendees[0].displayName).toBe('Bob');
      expect(evt.attendees[0].partstat).toBe(ParticipationStatus.Tentative);
      expect(evt.attendees[0].role).toBe('OPT-PARTICIPANT');
      expect(evt.attendees[0].rsvp).toBe(false);
      expect(evt.reminders.length).toBe(1);
      expect(evt.reminders[0].action).toBe('DISPLAY');
      expect(evt.reminders[0].triggerMinutesBefore).toBe(30);
      expect(evt.exdates).toEqual(['20250622T090000']);
      expect(evt.rdates).toEqual(['20250701T090000']);
      expect(evt.rrule?.freq).toBe(RecurrenceFrequency.Daily);
      expect(evt.rrule?.count).toBe(5);
    });

    it('should round-trip an all-day event', () => {
      const original = makeEvent({
        uid: 'allday-uid',
        summary: 'All Day',
        allDay: true,
        dtstart: '20250615',
        dtend: '20250616',
        dtstartTzid: 'UTC',
      });

      const ics = serializeToICalendar([original]);
      const parsed = parseICalendar(ics);

      expect(parsed.errors.length).toBe(0);
      expect(parsed.events[0].allDay).toBe(true);
      expect(parsed.events[0].dtstart).toBe('20250615');
      expect(parsed.events[0].dtend).toBe('20250616');
    });
  });
});
