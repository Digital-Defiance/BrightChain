/**
 * BookingEngineService
 *
 * Computes available booking slots from configured availability windows minus
 * existing host events minus minimum notice period. Creates events on the
 * host's calendar when bookings are confirmed, and supports multiple
 * appointment types per booking page.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.6, 9.7, 9.8
 */

import {
  EventTransparency,
  EventVisibility,
  type IAppointmentTypeDTO,
  type IAvailabilityWindow,
} from '@brightchain/brightcal-lib';
import type { Model } from '@brightchain/db';
import { randomUUID } from 'crypto';
import type {
  IStoredBookingAppointment,
  ITypedBookingAppointment,
} from '../models/bookingAppointment.model.js';
import type {
  IStoredBookingPage,
  ITypedBookingPage,
} from '../models/bookingPage.model.js';
import type {
  IStoredCalendarCollection,
  ITypedCalendarCollection,
} from '../models/calendarCollection.model.js';
import type {
  IStoredCalendarEvent,
  ITypedCalendarEvent,
} from '../models/calendarEvent.model.js';
import { encryptEventBody } from './calendarEventCrypto.js';
import type { IEncryptionService } from './encryptionService.js';

// ─── Request/Response interfaces ─────────────────────────────────────────────

/**
 * Body for creating a new booking page.
 */
export interface ICreateBookingPageBody {
  slug: string;
  title: string;
  description?: string;
  appointmentTypes: IAppointmentTypeDTO[];
  minNoticeMinutes?: number;
  maxAdvanceDays?: number;
}

/**
 * Body for booking an appointment on a booking page.
 */
export interface IBookAppointmentBody {
  appointmentType: string;
  startTime: string; // ISO 8601
  bookerName: string;
  bookerEmail: string;
  answers?: Record<string, string>;
}

/**
 * An available time slot returned by getAvailableSlots.
 */
export interface IAvailableSlot {
  start: string; // ISO 8601
  end: string; // ISO 8601
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default minimum notice in minutes (4 hours). */
const DEFAULT_MIN_NOTICE_MINUTES = 240;

/** Default maximum advance booking window in days. */
const DEFAULT_MAX_ADVANCE_DAYS = 60;

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * BookingEngineService handles booking page management, available slot
 * computation, and appointment creation with host calendar integration.
 *
 * @requirements 9.1, 9.2, 9.3, 9.4, 9.6, 9.7, 9.8
 */
export class BookingEngineService {
  private readonly bookingPageModel: Model<
    IStoredBookingPage,
    ITypedBookingPage
  >;
  private readonly bookingAppointmentModel: Model<
    IStoredBookingAppointment,
    ITypedBookingAppointment
  >;
  private readonly calendarCollectionModel: Model<
    IStoredCalendarCollection,
    ITypedCalendarCollection
  >;
  private readonly calendarEventModel: Model<
    IStoredCalendarEvent,
    ITypedCalendarEvent
  >;
  private readonly encryptionService: IEncryptionService;
  constructor(
    bookingPageModel: Model<IStoredBookingPage, ITypedBookingPage>,
    bookingAppointmentModel: Model<
      IStoredBookingAppointment,
      ITypedBookingAppointment
    >,
    calendarCollectionModel: Model<
      IStoredCalendarCollection,
      ITypedCalendarCollection
    >,
    calendarEventModel: Model<IStoredCalendarEvent, ITypedCalendarEvent>,
    encryptionService: IEncryptionService,
  ) {
    this.bookingPageModel = bookingPageModel;
    this.bookingAppointmentModel = bookingAppointmentModel;
    this.calendarCollectionModel = calendarCollectionModel;
    this.calendarEventModel = calendarEventModel;
    this.encryptionService = encryptionService;
  }

  // ── Booking Page CRUD ─────────────────────────────────────────────────

  /**
   * Create a new booking page for the given user.
   *
   * @requirements 9.1, 9.7
   */
  async createBookingPage(
    userId: string,
    config: ICreateBookingPageBody,
  ): Promise<ITypedBookingPage> {
    const now = new Date();
    const page: ITypedBookingPage = {
      id: randomUUID().replace(/-/g, ''),
      ownerId: userId,
      slug: config.slug,
      title: config.title,
      description: config.description,
      appointmentTypes: config.appointmentTypes,
      minNoticeMinutes: config.minNoticeMinutes ?? DEFAULT_MIN_NOTICE_MINUTES,
      maxAdvanceDays: config.maxAdvanceDays ?? DEFAULT_MAX_ADVANCE_DAYS,
      active: true,
      dateCreated: now,
      dateModified: now,
    };

    await this.bookingPageModel.insertOne(page);
    return page;
  }

  /**
   * Get a booking page by its public slug.
   *
   * @requirements 9.1
   */
  async getBookingPage(slug: string): Promise<ITypedBookingPage | null> {
    return this.bookingPageModel.findOne({
      slug,
    } as Partial<IStoredBookingPage>);
  }

  /**
   * List all booking pages owned by a user.
   *
   * @requirements 9.1
   */
  async getBookingPagesForUser(userId: string): Promise<ITypedBookingPage[]> {
    return this.bookingPageModel
      .find({ ownerId: userId } as Partial<IStoredBookingPage>)
      .toArray();
  }

  // ── Available Slot Computation ────────────────────────────────────────

  /**
   * Compute available booking slots for a given date and appointment type.
   *
   * Algorithm:
   * 1. Get the booking page config (availability windows for the appointment type)
   * 2. Get the host's existing events for the requested date
   * 3. Generate candidate slots at the appointment duration interval
   * 4. Filter out: slots overlapping existing events, slots within minimum notice
   * 5. Return remaining slots
   *
   * @requirements 9.2, 9.6, 9.8
   */
  async getAvailableSlots(
    slug: string,
    date: string,
    appointmentType: string,
  ): Promise<IAvailableSlot[]> {
    const page = await this.getBookingPage(slug);
    if (!page || !page.active) {
      return [];
    }

    // Find the matching appointment type
    const apptType = page.appointmentTypes.find(
      (t) => t.name === appointmentType,
    );
    if (!apptType) {
      return [];
    }

    // Parse the requested date
    const requestedDate = new Date(date);
    if (isNaN(requestedDate.getTime())) {
      return [];
    }

    const dayOfWeek = requestedDate.getUTCDay();

    // Get availability windows for this day of week
    const windows = apptType.availableWindows.filter(
      (w) => w.dayOfWeek === dayOfWeek,
    );
    if (windows.length === 0) {
      return [];
    }

    // Get the host's existing events for this date
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const hostEvents = await this.getHostEventsForRange(
      page.ownerId,
      dayStart.toISOString(),
      dayEnd.toISOString(),
    );

    // Generate candidate slots and filter
    const now = new Date();
    const minNoticeThreshold = new Date(
      now.getTime() + page.minNoticeMinutes * 60 * 1000,
    );

    const durationMs = apptType.durationMinutes * 60 * 1000;
    const bufferMs = (apptType.bufferMinutes ?? 0) * 60 * 1000;
    const slots: IAvailableSlot[] = [];

    for (const window of windows) {
      const candidates = generateCandidateSlots(
        requestedDate,
        window,
        apptType.durationMinutes,
      );

      for (const candidate of candidates) {
        const candidateStart = new Date(candidate.start);
        const candidateEnd = new Date(candidate.end);

        // Filter: within minimum notice period
        if (candidateStart < minNoticeThreshold) {
          continue;
        }

        // Filter: overlaps with existing events (including buffer)
        const bufferedStart = new Date(candidateStart.getTime() - bufferMs);
        const bufferedEnd = new Date(candidateEnd.getTime() + bufferMs);

        if (overlapsWithEvents(bufferedStart, bufferedEnd, hostEvents)) {
          continue;
        }

        slots.push(candidate);
      }
    }

    return slots;
  }

  // ── Booking Creation ──────────────────────────────────────────────────

  /**
   * Book an appointment on a booking page.
   *
   * Creates a booking appointment record and an event on the host's calendar.
   *
   * @throws Error('SLOT_UNAVAILABLE') if the slot is no longer available
   * @throws Error('NOT_FOUND') if the booking page or appointment type doesn't exist
   *
   * @requirements 9.3, 9.4
   */
  async bookAppointment(
    slug: string,
    booking: IBookAppointmentBody,
  ): Promise<ITypedBookingAppointment> {
    const page = await this.getBookingPage(slug);
    if (!page || !page.active) {
      throw new Error('NOT_FOUND');
    }

    const apptType = page.appointmentTypes.find(
      (t) => t.name === booking.appointmentType,
    );
    if (!apptType) {
      throw new Error('NOT_FOUND');
    }

    // Verify the slot is still available
    const startTime = new Date(booking.startTime);
    const dateStr = booking.startTime.split('T')[0];
    const availableSlots = await this.getAvailableSlots(
      slug,
      dateStr,
      booking.appointmentType,
    );

    const slotAvailable = availableSlots.some(
      (s) => new Date(s.start).getTime() === startTime.getTime(),
    );
    if (!slotAvailable) {
      throw new Error('SLOT_UNAVAILABLE');
    }

    const endTime = new Date(
      startTime.getTime() + apptType.durationMinutes * 60 * 1000,
    );
    const now = new Date();

    // Create the booking appointment record
    const appointment: ITypedBookingAppointment = {
      id: randomUUID().replace(/-/g, ''),
      bookingPageId: page.id,
      hostUserId: page.ownerId,
      bookerName: booking.bookerName,
      bookerEmail: booking.bookerEmail,
      appointmentType: booking.appointmentType,
      startTime,
      endTime,
      answers: booking.answers ?? {},
      status: 'confirmed',
      dateCreated: now,
    };

    // Create event on host's calendar
    const eventId = await this.createHostCalendarEvent(
      page.ownerId,
      appointment,
      apptType,
    );
    appointment.eventId = eventId;

    await this.bookingAppointmentModel.insertOne(appointment);
    return appointment;
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /**
   * Get all non-transparent events for a host user within a time range.
   */
  private async getHostEventsForRange(
    userId: string,
    rangeStart: string,
    rangeEnd: string,
  ): Promise<ITypedCalendarEvent[]> {
    // Get all calendars for the host
    const calendars = await this.calendarCollectionModel
      .find({ ownerId: userId } as Partial<IStoredCalendarCollection>)
      .toArray();

    const events: ITypedCalendarEvent[] = [];

    for (const calendar of calendars) {
      const calEvents = await this.calendarEventModel
        .find({ calendarId: calendar.id } as Partial<IStoredCalendarEvent>)
        .toArray();

      for (const event of calEvents) {
        // Skip transparent events
        if (event.transparency === EventTransparency.Transparent) {
          continue;
        }

        // Skip events outside the range
        const eventStart = event.dtstart.toISOString();
        const eventEnd = event.dtend.toISOString();
        if (eventEnd <= rangeStart || eventStart >= rangeEnd) {
          continue;
        }

        events.push(event);
      }
    }

    return events;
  }

  /**
   * Create an event on the host's default (or first) calendar for a booking.
   * Returns the created event's ID.
   *
   * @requirements 9.3
   */
  private async createHostCalendarEvent(
    hostUserId: string,
    appointment: ITypedBookingAppointment,
    apptType: IAppointmentTypeDTO,
  ): Promise<string> {
    // Find the host's default calendar, or first available
    const calendars = await this.calendarCollectionModel
      .find({ ownerId: hostUserId } as Partial<IStoredCalendarCollection>)
      .toArray();

    const defaultCal = calendars.find((c) => c.isDefault) ?? calendars[0];

    if (!defaultCal) {
      throw new Error('NO_CALENDAR');
    }

    if (!defaultCal.encryptionKey) {
      throw new Error('ENCRYPTION_KEY_MISSING');
    }

    const now = new Date();
    const rawEvent: ITypedCalendarEvent = {
      id: randomUUID().replace(/-/g, ''),
      calendarId: defaultCal.id,
      uid: randomUUID(),
      sequence: 0,
      summary: `${apptType.name} with ${appointment.bookerName}`,
      dtstart: appointment.startTime,
      dtend: appointment.endTime,
      dtstartTzid: 'UTC',
      dtendTzid: 'UTC',
      allDay: false,
      visibility: EventVisibility.Public,
      transparency: EventTransparency.Opaque,
      status: 'CONFIRMED',
      organizerId: hostUserId,
      attendeeIds: [],
      isRecurring: false,
      blockId: '',
      encryptedBody: '',
      dateCreated: now,
      dateModified: now,
      searchText: `${apptType.name} ${appointment.bookerName} ${appointment.bookerEmail}`,
    };

    const event = await encryptEventBody(
      rawEvent,
      defaultCal.encryptionKey,
      this.encryptionService,
    );
    await this.calendarEventModel.insertOne(event);
    return event.id;
  }
}

// ─── Pure helper functions ───────────────────────────────────────────────────

/**
 * Generate candidate time slots within an availability window for a given date.
 * Slots are generated at the appointment duration interval.
 */
function generateCandidateSlots(
  date: Date,
  window: IAvailabilityWindow,
  durationMinutes: number,
): IAvailableSlot[] {
  const [startH, startM] = window.startTime.split(':').map(Number);
  const [endH, endM] = window.endTime.split(':').map(Number);

  const windowStartMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    startH,
    startM,
  );
  const windowEndMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    endH,
    endM,
  );

  const durationMs = durationMinutes * 60 * 1000;
  const slots: IAvailableSlot[] = [];

  for (
    let slotStart = windowStartMs;
    slotStart + durationMs <= windowEndMs;
    slotStart += durationMs
  ) {
    slots.push({
      start: new Date(slotStart).toISOString(),
      end: new Date(slotStart + durationMs).toISOString(),
    });
  }

  return slots;
}

/**
 * Check if a time range overlaps with any of the given events.
 */
function overlapsWithEvents(
  start: Date,
  end: Date,
  events: ITypedCalendarEvent[],
): boolean {
  for (const event of events) {
    if (event.dtstart < end && event.dtend > start) {
      return true;
    }
  }
  return false;
}
