/**
 * SchedulingEngineService
 *
 * Computes free/busy data, group availability intersection, ranked time slot
 * suggestions, and configurable working hours per user.
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import {
  EventTransparency,
  type IFreeBusyDataDTO,
  type IFreeBusySlot,
  type IWorkingHoursDTO,
} from '@brightchain/brightcal-lib';
import type { Model } from '@brightchain/db';
import type {
  IStoredCalendarCollection,
  ITypedCalendarCollection,
} from '../models/calendarCollection.model.js';
import type {
  IStoredCalendarEvent,
  ITypedCalendarEvent,
} from '../models/calendarEvent.model.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * Parameters for the findAvailableTimes method.
 */
export interface IFindAvailableTimesParams {
  requiredAttendees: string[];
  optionalAttendees: string[];
  durationMinutes: number;
  rangeStart: string;
  rangeEnd: string;
  workingHours?: IWorkingHoursDTO;
}

/**
 * A ranked candidate time slot returned by findAvailableTimes.
 */
export interface IRankedTimeSlot {
  start: string;
  end: string;
  score: number;
  requiredFreeCount: number;
  optionalFreeCount: number;
  duringWorkingHours: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Candidate slot generation interval in minutes. */
const SLOT_INTERVAL_MINUTES = 15;

/** Default working hours: Mon–Fri 09:00–17:00 UTC. */
const DEFAULT_WORKING_HOURS: IWorkingHoursDTO = {
  timezone: 'UTC',
  windows: [1, 2, 3, 4, 5].map((day) => ({
    dayOfWeek: day,
    startTime: '09:00',
    endTime: '17:00',
  })),
};

// ─── Scoring weights ─────────────────────────────────────────────────────────

/** Weight for each required attendee who is free. */
const REQUIRED_WEIGHT = 1000;
/** Weight for each optional attendee who is free. */
const OPTIONAL_WEIGHT = 10;
/** Bonus for a slot falling within working hours. */
const WORKING_HOURS_BONUS = 1;

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * SchedulingEngineService handles free/busy computation, group availability
 * intersection, ranked time slot suggestions, and working hours configuration.
 *
 * @requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export class SchedulingEngineService {
  /** In-memory store for per-user working hours. */
  private workingHoursMap = new Map<string, IWorkingHoursDTO>();

  private readonly calendarCollectionModel: Model<
    IStoredCalendarCollection,
    ITypedCalendarCollection
  >;
  private readonly calendarEventModel: Model<
    IStoredCalendarEvent,
    ITypedCalendarEvent
  >;
  constructor(
    calendarCollectionModel: Model<
      IStoredCalendarCollection,
      ITypedCalendarCollection
    >,
    calendarEventModel: Model<IStoredCalendarEvent, ITypedCalendarEvent>,
  ) {
    this.calendarCollectionModel = calendarCollectionModel;
    this.calendarEventModel = calendarEventModel;
  }

  // ── Free/Busy computation ─────────────────────────────────────────────

  /**
   * Compute free/busy data for a single user over a time range.
   *
   * Aggregates all non-transparent (OPAQUE) events across all of the user's
   * calendars and returns busy slots within the range.
   *
   * @requirements 8.1
   */
  async computeFreeBusy(
    userId: string,
    rangeStart: string,
    rangeEnd: string,
  ): Promise<IFreeBusyDataDTO> {
    const calendars = await this.calendarCollectionModel
      .find({ ownerId: userId } as Partial<IStoredCalendarCollection>)
      .toArray();

    const busySlots: IFreeBusySlot[] = [];

    for (const calendar of calendars) {
      const events = await this.calendarEventModel
        .find({ calendarId: calendar.id } as Partial<IStoredCalendarEvent>)
        .toArray();

      for (const event of events) {
        // Skip transparent events entirely
        if (event.transparency === EventTransparency.Transparent) {
          continue;
        }

        // Skip events outside the requested range
        const eventStart = event.dtstart.toISOString();
        const eventEnd = event.dtend.toISOString();
        if (eventEnd <= rangeStart || eventStart >= rangeEnd) {
          continue;
        }

        // Clamp to the requested range
        const slotStart = eventStart < rangeStart ? rangeStart : eventStart;
        const slotEnd = eventEnd > rangeEnd ? rangeEnd : eventEnd;

        const slotType: IFreeBusySlot['type'] =
          event.status === 'TENTATIVE' ? 'BUSY-TENTATIVE' : 'BUSY';

        busySlots.push({ start: slotStart, end: slotEnd, type: slotType });
      }
    }

    // Sort by start time
    busySlots.sort((a, b) => a.start.localeCompare(b.start));

    return {
      userId,
      rangeStart,
      rangeEnd,
      slots: busySlots,
    };
  }

  // ── Group Free/Busy ───────────────────────────────────────────────────

  /**
   * Compute free/busy data for multiple users.
   * Returns a Map of userId → IFreeBusyDataDTO.
   *
   * @requirements 8.3
   */
  async computeGroupFreeBusy(
    userIds: string[],
    rangeStart: string,
    rangeEnd: string,
  ): Promise<Map<string, IFreeBusyDataDTO>> {
    const result = new Map<string, IFreeBusyDataDTO>();
    for (const userId of userIds) {
      const fb = await this.computeFreeBusy(userId, rangeStart, rangeEnd);
      result.set(userId, fb);
    }
    return result;
  }

  // ── Group Free Slots (intersection) ───────────────────────────────────

  /**
   * Find common free slots across all users within a time range.
   * Returns the intersection of all users' free times.
   *
   * @requirements 8.3
   */
  async findGroupFreeSlots(
    userIds: string[],
    rangeStart: string,
    rangeEnd: string,
  ): Promise<IFreeBusySlot[]> {
    if (userIds.length === 0) {
      return [{ start: rangeStart, end: rangeEnd, type: 'FREE' }];
    }

    // Start with the full range as free
    let freeIntervals: Array<{ start: string; end: string }> = [
      { start: rangeStart, end: rangeEnd },
    ];

    // For each user, subtract their busy slots from the free intervals
    for (const userId of userIds) {
      const fb = await this.computeFreeBusy(userId, rangeStart, rangeEnd);
      freeIntervals = subtractBusyFromFree(freeIntervals, fb.slots);
      if (freeIntervals.length === 0) break;
    }

    return freeIntervals.map((interval) => ({
      start: interval.start,
      end: interval.end,
      type: 'FREE' as const,
    }));
  }

  // ── Find Available Times (ranked) ─────────────────────────────────────

  /**
   * Find and rank available time slots for a meeting.
   *
   * Generates candidate slots at 15-minute intervals, scores each based on:
   *   1. All required attendees free (highest priority)
   *   2. Maximize optional attendee availability
   *   3. Prefer slots during working hours
   *
   * @requirements 8.4, 8.5
   */
  async findAvailableTimes(
    params: IFindAvailableTimesParams,
  ): Promise<IRankedTimeSlot[]> {
    const {
      requiredAttendees,
      optionalAttendees,
      durationMinutes,
      rangeStart,
      rangeEnd,
      workingHours,
    } = params;

    const allUserIds = [...requiredAttendees, ...optionalAttendees];
    const groupFb = await this.computeGroupFreeBusy(
      allUserIds,
      rangeStart,
      rangeEnd,
    );

    const effectiveWorkingHours = workingHours ?? DEFAULT_WORKING_HOURS;
    const durationMs = durationMinutes * 60 * 1000;
    const intervalMs = SLOT_INTERVAL_MINUTES * 60 * 1000;
    const rangeStartMs = new Date(rangeStart).getTime();
    const rangeEndMs = new Date(rangeEnd).getTime();

    const rankedSlots: IRankedTimeSlot[] = [];

    // Generate candidate slots at 15-minute intervals
    for (
      let slotStartMs = rangeStartMs;
      slotStartMs + durationMs <= rangeEndMs;
      slotStartMs += intervalMs
    ) {
      const slotEndMs = slotStartMs + durationMs;
      const slotStart = new Date(slotStartMs).toISOString();
      const slotEnd = new Date(slotEndMs).toISOString();

      // Count free required attendees
      let requiredFreeCount = 0;
      for (const userId of requiredAttendees) {
        const fb = groupFb.get(userId);
        if (fb && isUserFreeInSlot(fb, slotStart, slotEnd)) {
          requiredFreeCount++;
        }
      }

      // Count free optional attendees
      let optionalFreeCount = 0;
      for (const userId of optionalAttendees) {
        const fb = groupFb.get(userId);
        if (fb && isUserFreeInSlot(fb, slotStart, slotEnd)) {
          optionalFreeCount++;
        }
      }

      const duringWorkingHours = isSlotDuringWorkingHours(
        slotStartMs,
        slotEndMs,
        effectiveWorkingHours,
      );

      const score =
        requiredFreeCount * REQUIRED_WEIGHT +
        optionalFreeCount * OPTIONAL_WEIGHT +
        (duringWorkingHours ? WORKING_HOURS_BONUS : 0);

      rankedSlots.push({
        start: slotStart,
        end: slotEnd,
        score,
        requiredFreeCount,
        optionalFreeCount,
        duringWorkingHours,
      });
    }

    // Sort by score descending, then by start time ascending for ties
    rankedSlots.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.start.localeCompare(b.start);
    });

    return rankedSlots;
  }

  // ── Working Hours ─────────────────────────────────────────────────────

  /**
   * Get the working hours configuration for a user.
   * Returns the default (Mon–Fri 09:00–17:00 UTC) if not configured.
   *
   * @requirements 8.6
   */
  getWorkingHours(userId: string): IWorkingHoursDTO {
    return this.workingHoursMap.get(userId) ?? { ...DEFAULT_WORKING_HOURS };
  }

  /**
   * Set the working hours configuration for a user.
   *
   * @requirements 8.6
   */
  async setWorkingHours(
    userId: string,
    workingHours: IWorkingHoursDTO,
  ): Promise<void> {
    this.workingHoursMap.set(userId, workingHours);
  }
}

// ─── Pure helper functions ───────────────────────────────────────────────────

/**
 * Subtract busy slots from a set of free intervals.
 * Returns the remaining free intervals after removing all busy periods.
 * Uses timestamp comparison to avoid ISO string format inconsistencies.
 */
function subtractBusyFromFree(
  freeIntervals: Array<{ start: string; end: string }>,
  busySlots: IFreeBusySlot[],
): Array<{ start: string; end: string }> {
  let result = [...freeIntervals];

  for (const busy of busySlots) {
    const busyStartMs = new Date(busy.start).getTime();
    const busyEndMs = new Date(busy.end).getTime();
    const next: Array<{ start: string; end: string }> = [];

    for (const free of result) {
      const freeStartMs = new Date(free.start).getTime();
      const freeEndMs = new Date(free.end).getTime();

      // No overlap — busy is entirely before or after this free interval
      if (busyEndMs <= freeStartMs || busyStartMs >= freeEndMs) {
        next.push(free);
        continue;
      }

      // Busy overlaps — split the free interval (skip zero-width remnants)
      if (busyStartMs > freeStartMs) {
        next.push({ start: free.start, end: busy.start });
      }
      if (busyEndMs < freeEndMs) {
        next.push({ start: busy.end, end: free.end });
      }
    }
    result = next;
  }

  return result;
}

/**
 * Check if a user is free during a given slot by verifying no busy slots overlap.
 */
function isUserFreeInSlot(
  fb: IFreeBusyDataDTO,
  slotStart: string,
  slotEnd: string,
): boolean {
  for (const busy of fb.slots) {
    // Any overlap means not free
    if (busy.start < slotEnd && busy.end > slotStart) {
      return false;
    }
  }
  return true;
}

/**
 * Check if a slot falls entirely within the configured working hours.
 */
function isSlotDuringWorkingHours(
  slotStartMs: number,
  slotEndMs: number,
  workingHours: IWorkingHoursDTO,
): boolean {
  const slotStart = new Date(slotStartMs);
  const slotEnd = new Date(slotEndMs);

  // Check that both start and end fall within a working window on the same day
  const dayOfWeek = slotStart.getUTCDay();

  const matchingWindows = workingHours.windows.filter(
    (w) => w.dayOfWeek === dayOfWeek,
  );

  if (matchingWindows.length === 0) return false;

  for (const window of matchingWindows) {
    const [whStartH, whStartM] = window.startTime.split(':').map(Number);
    const [whEndH, whEndM] = window.endTime.split(':').map(Number);

    const slotStartMinutes =
      slotStart.getUTCHours() * 60 + slotStart.getUTCMinutes();
    const slotEndMinutes = slotEnd.getUTCHours() * 60 + slotEnd.getUTCMinutes();
    const whStartMinutes = whStartH * 60 + whStartM;
    const whEndMinutes = whEndH * 60 + whEndM;

    // Slot must be entirely within the working window
    // Also ensure the slot doesn't span midnight (same day check)
    if (
      slotStart.getUTCDate() === slotEnd.getUTCDate() &&
      slotStartMinutes >= whStartMinutes &&
      slotEndMinutes <= whEndMinutes
    ) {
      return true;
    }
  }

  return false;
}
