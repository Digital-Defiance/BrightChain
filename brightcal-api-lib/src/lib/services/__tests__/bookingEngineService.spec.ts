/**
 * BookingEngineService — unit tests.
 *
 * Tests slot computation, minimum notice enforcement, booking creation,
 * and multiple appointment type support using in-memory BrightDb.
 *
 * @see Requirements 9.2, 9.6, 9.8
 */

import { EventTransparency, EventVisibility } from '@brightchain/brightcal-lib';
import {
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
  validBlockSizes,
} from '@brightchain/brightchain-lib';
import { BrightDb, InMemoryHeadRegistry } from '@brightchain/db';
import type { ICreateEventBody } from '../../controllers/eventController.ts';
import { createBookingAppointmentModel } from '../../models/bookingAppointment.model.ts';
import { createBookingPageModel } from '../../models/bookingPage.model.ts';
import { createCalendarCollectionModel } from '../../models/calendarCollection.model.ts';
import { createCalendarEventModel } from '../../models/calendarEvent.model.ts';
import { createCalendarShareModel } from '../../models/calendarShare.model.ts';
import {
  BookingEngineService,
  type ICreateBookingPageBody,
} from '../bookingEngineService.ts';
import { CalendarEngineService } from '../calendarEngineService.ts';
import { CalendarPermissionService } from '../calendarPermissionService.ts';
import { EncryptionService } from '../encryptionService.ts';
import { EventEngineService } from '../eventEngineService.ts';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

function makeDb(name = 'testdb'): BrightDb {
  const store = new MemoryBlockStore(validBlockSizes);
  const registry = InMemoryHeadRegistry.createIsolated();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BrightDb(store as any, { name, headRegistry: registry });
}

function createServices() {
  const db = makeDb();
  const calendarModel = createCalendarCollectionModel(db);
  const shareModel = createCalendarShareModel(db);
  const eventModel = createCalendarEventModel(db);
  const bookingPageModel = createBookingPageModel(db);
  const bookingAppointmentModel = createBookingAppointmentModel(db);
  const encryption = new EncryptionService();
  const calendarService = new CalendarEngineService(
    calendarModel,
    shareModel,
    encryption,
  );
  const permissionService = new CalendarPermissionService(
    calendarModel,
    shareModel,
  );
  const eventService = new EventEngineService(
    eventModel,
    calendarModel,
    permissionService,
    encryption,
  );
  const bookingService = new BookingEngineService(
    bookingPageModel,
    bookingAppointmentModel,
    calendarModel,
    eventModel,
    encryption,
  );
  return {
    bookingService,
    eventService,
    calendarService,
    calendarModel,
    eventModel,
  };
}

/** Helper to create a calendar owned by the given user. */
async function setupCalendar(
  calendarService: CalendarEngineService,
  ownerId: string,
) {
  return calendarService.createCalendar(ownerId, 'Test Cal', '#4285F4', '');
}

// Use a far-future Saturday so slots are never filtered by min-notice.
// 2030-06-15 is a Saturday (dayOfWeek=6).
const D = '2030-06-15';
// Friday before the test Saturday
const D_FRIDAY = '2030-06-14';

/** Helper to build a valid ICreateEventBody. */
function makeEventBody(
  calendarId: string,
  overrides: Partial<ICreateEventBody> = {},
): ICreateEventBody {
  return {
    calendarId,
    summary: 'Existing Meeting',
    dtstart: `${D}T09:00:00Z`,
    dtend: `${D}T10:00:00Z`,
    dtstartTzid: 'UTC',
    dtendTzid: 'UTC',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    ...overrides,
  };
}

/** Helper to build a booking page config. */
function makeBookingPageConfig(
  overrides: Partial<ICreateBookingPageBody> = {},
): ICreateBookingPageBody {
  return {
    slug: 'test-page',
    title: 'Test Booking Page',
    appointmentTypes: [
      {
        name: '30-min meeting',
        durationMinutes: 30,
        bufferMinutes: 0,
        availableWindows: [
          { dayOfWeek: 6, startTime: '09:00', endTime: '17:00' },
        ],
        questions: [],
      },
    ],
    minNoticeMinutes: 0,
    maxAdvanceDays: 99999,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BookingEngineService', () => {
  describe('createBookingPage', () => {
    it('should create a booking page with default values', async () => {
      const { bookingService } = createServices();
      const page = await bookingService.createBookingPage(
        'user-1',
        makeBookingPageConfig(),
      );

      expect(page.ownerId).toBe('user-1');
      expect(page.slug).toBe('test-page');
      expect(page.title).toBe('Test Booking Page');
      expect(page.active).toBe(true);
      expect(page.appointmentTypes).toHaveLength(1);
      expect(page.minNoticeMinutes).toBe(0);
      expect(page.maxAdvanceDays).toBe(99999);
    });

    it('should apply default minNoticeMinutes when not specified', async () => {
      const { bookingService } = createServices();
      const config = makeBookingPageConfig();
      delete (config as Record<string, unknown>).minNoticeMinutes;

      const page = await bookingService.createBookingPage('user-1', config);
      expect(page.minNoticeMinutes).toBe(240);
    });

    it('should support multiple appointment types', async () => {
      const { bookingService } = createServices();
      const page = await bookingService.createBookingPage(
        'user-1',
        makeBookingPageConfig({
          appointmentTypes: [
            {
              name: '15-min chat',
              durationMinutes: 15,
              bufferMinutes: 5,
              availableWindows: [
                { dayOfWeek: 6, startTime: '09:00', endTime: '12:00' },
              ],
              questions: [],
            },
            {
              name: '60-min deep dive',
              durationMinutes: 60,
              bufferMinutes: 15,
              availableWindows: [
                { dayOfWeek: 6, startTime: '13:00', endTime: '17:00' },
              ],
              questions: [],
            },
          ],
        }),
      );

      expect(page.appointmentTypes).toHaveLength(2);
      expect(page.appointmentTypes[0].name).toBe('15-min chat');
      expect(page.appointmentTypes[1].name).toBe('60-min deep dive');
    });
  });

  describe('getBookingPage', () => {
    it('should retrieve a booking page by slug', async () => {
      const { bookingService } = createServices();
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      const page = await bookingService.getBookingPage('test-page');
      expect(page).not.toBeNull();
      expect(page!.slug).toBe('test-page');
    });

    it('should return null for non-existent slug', async () => {
      const { bookingService } = createServices();
      const page = await bookingService.getBookingPage('non-existent');
      expect(page).toBeNull();
    });
  });

  describe('getBookingPagesForUser', () => {
    it('should list all booking pages for a user', async () => {
      const { bookingService } = createServices();
      await bookingService.createBookingPage(
        'user-1',
        makeBookingPageConfig({ slug: 'page-1' }),
      );
      await bookingService.createBookingPage(
        'user-1',
        makeBookingPageConfig({ slug: 'page-2', title: 'Second Page' }),
      );

      const pages = await bookingService.getBookingPagesForUser('user-1');
      expect(pages).toHaveLength(2);
    });

    it('should return empty array for user with no pages', async () => {
      const { bookingService } = createServices();
      const pages = await bookingService.getBookingPagesForUser('user-1');
      expect(pages).toHaveLength(0);
    });
  });

  describe('getAvailableSlots', () => {
    it('should return slots within availability windows', async () => {
      const { bookingService, calendarService } = createServices();
      await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      const slots = await bookingService.getAvailableSlots(
        'test-page',
        D,
        '30-min meeting',
      );

      // 8 hours / 30 min = 16 slots
      expect(slots).toHaveLength(16);
      expect(slots[0].start).toBe(`${D}T09:00:00.000Z`);
      expect(slots[0].end).toBe(`${D}T09:30:00.000Z`);
      expect(slots[slots.length - 1].start).toBe(`${D}T16:30:00.000Z`);
      expect(slots[slots.length - 1].end).toBe(`${D}T17:00:00.000Z`);
    });

    it('should exclude slots overlapping with existing events', async () => {
      const { bookingService, eventService, calendarService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id, {
          dtstart: `${D}T10:00:00Z`,
          dtend: `${D}T11:00:00Z`,
        }),
      );

      const slots = await bookingService.getAvailableSlots(
        'test-page',
        D,
        '30-min meeting',
      );

      const slotStarts = slots.map((s) => s.start);
      expect(slotStarts).not.toContain(`${D}T10:00:00.000Z`);
      expect(slotStarts).not.toContain(`${D}T10:30:00.000Z`);
      expect(slots).toHaveLength(14);
    });

    it('should exclude transparent events from blocking', async () => {
      const { bookingService, eventService, calendarService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id, {
          dtstart: `${D}T10:00:00Z`,
          dtend: `${D}T11:00:00Z`,
          transparency: EventTransparency.Transparent,
        }),
      );

      const slots = await bookingService.getAvailableSlots(
        'test-page',
        D,
        '30-min meeting',
      );

      expect(slots).toHaveLength(16);
    });

    it('should enforce minimum notice period', async () => {
      const { bookingService, calendarService } = createServices();
      await setupCalendar(calendarService, 'user-1');

      await bookingService.createBookingPage(
        'user-1',
        makeBookingPageConfig({
          minNoticeMinutes: 9999999, // ~19 years — ensures all 2030 slots are filtered
        }),
      );

      const slots = await bookingService.getAvailableSlots(
        'test-page',
        D,
        '30-min meeting',
      );

      expect(slots).toHaveLength(0);
    });

    it('should return empty for non-existent booking page', async () => {
      const { bookingService } = createServices();
      const slots = await bookingService.getAvailableSlots(
        'non-existent',
        D,
        '30-min meeting',
      );
      expect(slots).toHaveLength(0);
    });

    it('should return empty for non-existent appointment type', async () => {
      const { bookingService, calendarService } = createServices();
      await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      const slots = await bookingService.getAvailableSlots(
        'test-page',
        D,
        'non-existent-type',
      );
      expect(slots).toHaveLength(0);
    });

    it('should return empty for a day with no availability windows', async () => {
      const { bookingService, calendarService } = createServices();
      await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      const slots = await bookingService.getAvailableSlots(
        'test-page',
        D_FRIDAY,
        '30-min meeting',
      );
      expect(slots).toHaveLength(0);
    });

    it('should handle buffer time between appointments', async () => {
      const { bookingService, eventService, calendarService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage(
        'user-1',
        makeBookingPageConfig({
          appointmentTypes: [
            {
              name: '30-min meeting',
              durationMinutes: 30,
              bufferMinutes: 30,
              availableWindows: [
                { dayOfWeek: 6, startTime: '09:00', endTime: '12:00' },
              ],
              questions: [],
            },
          ],
        }),
      );

      await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id, {
          dtstart: `${D}T10:00:00Z`,
          dtend: `${D}T10:30:00Z`,
        }),
      );

      const slots = await bookingService.getAvailableSlots(
        'test-page',
        D,
        '30-min meeting',
      );

      const slotStarts = slots.map((s) => s.start);
      expect(slotStarts).not.toContain(`${D}T09:30:00.000Z`);
      expect(slotStarts).not.toContain(`${D}T10:00:00.000Z`);
      expect(slotStarts).not.toContain(`${D}T10:30:00.000Z`);
      expect(slotStarts).toContain(`${D}T09:00:00.000Z`);
    });
  });

  describe('bookAppointment', () => {
    it('should create a booking and host calendar event', async () => {
      const { bookingService, calendarService, eventModel } = createServices();
      await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      const appointment = await bookingService.bookAppointment('test-page', {
        appointmentType: '30-min meeting',
        startTime: `${D}T09:00:00Z`,
        bookerName: 'Jane Doe',
        bookerEmail: 'jane@example.com',
      });

      expect(appointment.bookerName).toBe('Jane Doe');
      expect(appointment.bookerEmail).toBe('jane@example.com');
      expect(appointment.appointmentType).toBe('30-min meeting');
      expect(appointment.status).toBe('confirmed');
      expect(appointment.startTime).toEqual(new Date(`${D}T09:00:00Z`));
      expect(appointment.endTime).toEqual(new Date(`${D}T09:30:00Z`));
      expect(appointment.eventId).toBeDefined();

      const event = await eventModel.findById(appointment.eventId!);
      expect(event).not.toBeNull();
      expect(event!.searchText).toContain('Jane Doe');
      expect(event!.searchText).toContain('30-min meeting');
    });

    it('should throw SLOT_UNAVAILABLE when slot is taken', async () => {
      const { bookingService, eventService, calendarService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id, {
          dtstart: `${D}T09:00:00Z`,
          dtend: `${D}T09:30:00Z`,
        }),
      );

      await expect(
        bookingService.bookAppointment('test-page', {
          appointmentType: '30-min meeting',
          startTime: `${D}T09:00:00Z`,
          bookerName: 'Jane Doe',
          bookerEmail: 'jane@example.com',
        }),
      ).rejects.toThrow('SLOT_UNAVAILABLE');
    });

    it('should throw NOT_FOUND for non-existent booking page', async () => {
      const { bookingService } = createServices();

      await expect(
        bookingService.bookAppointment('non-existent', {
          appointmentType: '30-min meeting',
          startTime: `${D}T09:00:00Z`,
          bookerName: 'Jane Doe',
          bookerEmail: 'jane@example.com',
        }),
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND for non-existent appointment type', async () => {
      const { bookingService, calendarService } = createServices();
      await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      await expect(
        bookingService.bookAppointment('test-page', {
          appointmentType: 'non-existent-type',
          startTime: `${D}T09:00:00Z`,
          bookerName: 'Jane Doe',
          bookerEmail: 'jane@example.com',
        }),
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should store custom answers', async () => {
      const { bookingService, calendarService } = createServices();
      await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      const appointment = await bookingService.bookAppointment('test-page', {
        appointmentType: '30-min meeting',
        startTime: `${D}T09:00:00Z`,
        bookerName: 'Jane Doe',
        bookerEmail: 'jane@example.com',
        answers: { 'What topic?': 'Project review' },
      });

      expect(appointment.answers).toEqual({
        'What topic?': 'Project review',
      });
    });

    it('should prevent double-booking the same slot', async () => {
      const { bookingService, calendarService } = createServices();
      await setupCalendar(calendarService, 'user-1');
      await bookingService.createBookingPage('user-1', makeBookingPageConfig());

      await bookingService.bookAppointment('test-page', {
        appointmentType: '30-min meeting',
        startTime: `${D}T09:00:00Z`,
        bookerName: 'Jane Doe',
        bookerEmail: 'jane@example.com',
      });

      await expect(
        bookingService.bookAppointment('test-page', {
          appointmentType: '30-min meeting',
          startTime: `${D}T09:00:00Z`,
          bookerName: 'John Smith',
          bookerEmail: 'john@example.com',
        }),
      ).rejects.toThrow('SLOT_UNAVAILABLE');
    });
  });
});
