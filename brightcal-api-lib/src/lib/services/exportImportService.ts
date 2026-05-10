/**
 * ExportImportService
 *
 * Service for exporting calendar events as ICS or JSON, and importing
 * ICS data with duplicate detection by UID.
 *
 * @see Requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */

import {
  CalendarPermissionLevel,
  parseICalendar,
  serializeToICalendar,
  type ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import type { Model } from '@brightchain/db';
import { randomUUID } from 'crypto';
import type {
  IStoredCalendarCollection,
  ITypedCalendarCollection,
} from '../models/calendarCollection.model.js';
import type {
  IStoredCalendarEvent,
  ITypedCalendarEvent,
} from '../models/calendarEvent.model.js';
import { decryptEventBody, encryptEventBody } from './calendarEventCrypto.js';
import type { CalendarPermissionService } from './calendarPermissionService.js';
import type { IEncryptionService } from './encryptionService.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * Result of an ICS import operation.
 */
export interface IImportResult {
  imported: number;
  skipped: number;
  overwritten: number;
  duplicates: string[]; // UIDs that were detected as duplicates
}

/**
 * Interface consumed by ExportImportController.
 */
export interface IExportImportService {
  exportAsIcs(userId: string, calendarId: string): Promise<string>;
  exportAsJson(
    userId: string,
    calendarId: string,
  ): Promise<ITypedCalendarEvent[]>;
  importIcs(
    userId: string,
    calendarId: string,
    icsData: string,
    duplicateMode: 'skip' | 'overwrite' | 'create-new',
  ): Promise<IImportResult>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build searchable text from event fields for full-text search indexing.
 */
function buildSearchText(
  summary: string,
  description?: string,
  location?: string,
): string {
  return [summary, description, location].filter(Boolean).join(' ');
}

/**
 * Convert a typed calendar event to an ICalendarEventDTO for serialization.
 */
function typedEventToDto(event: ITypedCalendarEvent): ICalendarEventDTO {
  return {
    id: event.id,
    calendarId: event.calendarId,
    uid: event.uid,
    sequence: event.sequence,
    summary: event.summary,
    description: undefined,
    location: undefined,
    dtstart: event.dtstart.toISOString(),
    dtend: event.dtend.toISOString(),
    dtstartTzid: event.dtstartTzid,
    dtendTzid: event.dtendTzid ?? '',
    allDay: event.allDay,
    visibility: event.visibility,
    transparency: event.transparency,
    status: event.status,
    organizerId: event.organizerId,
    attendees: [],
    reminders: [],
    rrule: event.rrule,
    exdates: event.exdates?.map((d) => d.toISOString()),
    rdates: event.rdates?.map((d) => d.toISOString()),
    recurrenceId: event.recurrenceId?.toISOString(),
    categories: [],
    dateCreated: event.dateCreated.toISOString(),
    dateModified: event.dateModified.toISOString(),
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * ExportImportService handles calendar data export (ICS, JSON) and
 * ICS import with duplicate detection by UID.
 *
 * @requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */
export class ExportImportService implements IExportImportService {
  private readonly calendarEventModel: Model<
    IStoredCalendarEvent,
    ITypedCalendarEvent
  >;
  private readonly calendarCollectionModel: Model<
    IStoredCalendarCollection,
    ITypedCalendarCollection
  >;
  private readonly calendarPermissionService: CalendarPermissionService;
  private readonly encryptionService: IEncryptionService;
  constructor(
    calendarEventModel: Model<IStoredCalendarEvent, ITypedCalendarEvent>,
    calendarCollectionModel: Model<
      IStoredCalendarCollection,
      ITypedCalendarCollection
    >,
    calendarPermissionService: CalendarPermissionService,
    encryptionService: IEncryptionService,
  ) {
    this.calendarEventModel = calendarEventModel;
    this.calendarCollectionModel = calendarCollectionModel;
    this.calendarPermissionService = calendarPermissionService;
    this.encryptionService = encryptionService;
  }

  /**
   * Look up the AES-256-GCM key for a calendar.
   *
   * @throws Error('ENCRYPTION_KEY_MISSING') if the calendar has no encryption key.
   */
  private async getCalendarKey(calendarId: string): Promise<string> {
    const calendar = await this.calendarCollectionModel.findById(calendarId);
    if (!calendar?.encryptionKey) {
      throw new Error('ENCRYPTION_KEY_MISSING');
    }
    return calendar.encryptionKey;
  }

  /**
   * Export all events in a calendar as an ICS string.
   *
   * @param userId - The authenticated user requesting the export
   * @param calendarId - The calendar to export
   * @returns Valid iCalendar string containing all events
   *
   * @requirements 16.1, 16.5
   */
  async exportAsIcs(userId: string, calendarId: string): Promise<string> {
    await this.assertPermission(
      calendarId,
      userId,
      CalendarPermissionLevel.Viewer,
    );

    const events = await this.calendarEventModel
      .find({ calendarId } as Partial<IStoredCalendarEvent>)
      .toArray();

    const calendarKey = await this.getCalendarKey(calendarId);
    const decrypted = await Promise.all(
      events.map((e) =>
        decryptEventBody(e, calendarKey, this.encryptionService),
      ),
    );

    const dtos = decrypted.map(typedEventToDto);
    return serializeToICalendar(dtos);
  }

  /**
   * Export all events in a calendar as a JSON array.
   *
   * @param userId - The authenticated user requesting the export
   * @param calendarId - The calendar to export
   * @returns Array of typed calendar events
   *
   * @requirements 16.4
   */
  async exportAsJson(
    userId: string,
    calendarId: string,
  ): Promise<ITypedCalendarEvent[]> {
    await this.assertPermission(
      calendarId,
      userId,
      CalendarPermissionLevel.Viewer,
    );

    const events = await this.calendarEventModel
      .find({ calendarId } as Partial<IStoredCalendarEvent>)
      .toArray();

    const calendarKey = await this.getCalendarKey(calendarId);
    return Promise.all(
      events.map((e) =>
        decryptEventBody(e, calendarKey, this.encryptionService),
      ),
    );
  }

  /**
   * Import events from an ICS string into a calendar with duplicate detection.
   *
   * For each parsed event, checks if a UID already exists in the calendar:
   * - 'skip': skip duplicates, only import new events
   * - 'overwrite': update existing events with matching UIDs
   * - 'create-new': create with a new UID regardless of duplicates
   *
   * @param userId - The authenticated user performing the import
   * @param calendarId - The target calendar
   * @param icsData - The iCalendar string to import
   * @param duplicateMode - How to handle duplicate UIDs
   * @returns Import result with counts and duplicate UIDs
   *
   * @requirements 16.2, 16.3
   */
  async importIcs(
    userId: string,
    calendarId: string,
    icsData: string,
    duplicateMode: 'skip' | 'overwrite' | 'create-new',
  ): Promise<IImportResult> {
    await this.assertPermission(
      calendarId,
      userId,
      CalendarPermissionLevel.Editor,
    );

    const parseResult = parseICalendar(icsData);
    const parsedEvents = parseResult.events;

    // Get existing events in the calendar to check for duplicates
    const existingEvents = await this.calendarEventModel
      .find({ calendarId } as Partial<IStoredCalendarEvent>)
      .toArray();
    const existingByUid = new Map<string, ITypedCalendarEvent>();
    for (const e of existingEvents) {
      existingByUid.set(e.uid, e);
    }

    const result: IImportResult = {
      imported: 0,
      skipped: 0,
      overwritten: 0,
      duplicates: [],
    };

    for (const parsedEvent of parsedEvents) {
      const uid = parsedEvent.uid;
      const existing = existingByUid.get(uid);

      if (existing) {
        result.duplicates.push(uid);

        if (duplicateMode === 'skip') {
          result.skipped++;
          continue;
        }

        if (duplicateMode === 'overwrite') {
          await this.overwriteEvent(existing, parsedEvent, calendarId);
          result.overwritten++;
          continue;
        }

        // 'create-new': fall through to create with new UID
      }

      // Create new event
      const newUid =
        duplicateMode === 'create-new' && existing
          ? randomUUID()
          : uid || randomUUID();

      await this.createEventFromDto(parsedEvent, calendarId, userId, newUid);
      result.imported++;
    }

    return result;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Create a new event in the database from a parsed ICalendarEventDTO.
   */
  private async createEventFromDto(
    dto: ICalendarEventDTO,
    calendarId: string,
    userId: string,
    uid: string,
  ): Promise<void> {
    const now = new Date();
    const calendarKey = await this.getCalendarKey(calendarId);
    const rawEvent: ITypedCalendarEvent = {
      id: randomUUID().replace(/-/g, ''),
      calendarId,
      uid,
      sequence: dto.sequence ?? 0,
      summary: dto.summary || 'Untitled',
      dtstart: new Date(dto.dtstart),
      dtend: new Date(dto.dtend || dto.dtstart),
      dtstartTzid: dto.dtstartTzid || 'UTC',
      dtendTzid: dto.dtendTzid || dto.dtstartTzid || 'UTC',
      allDay: dto.allDay ?? false,
      visibility: dto.visibility,
      transparency: dto.transparency,
      status:
        (dto.status as 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED') || 'CONFIRMED',
      organizerId: userId,
      attendeeIds: dto.attendees?.map((a) => a.email) ?? [],
      isRecurring: !!dto.rrule,
      rrule: dto.rrule,
      exdates: dto.exdates?.map((d) => new Date(d)),
      rdates: dto.rdates?.map((d) => new Date(d)),
      recurrenceId: dto.recurrenceId ? new Date(dto.recurrenceId) : undefined,
      blockId: '',
      encryptedBody: '',
      dateCreated: now,
      dateModified: now,
      searchText: buildSearchText(dto.summary, dto.description, dto.location),
    };

    const event = await encryptEventBody(
      rawEvent,
      calendarKey,
      this.encryptionService,
    );
    await this.calendarEventModel.insertOne(event);
  }

  /**
   * Overwrite an existing event with data from a parsed DTO.
   */
  private async overwriteEvent(
    existing: ITypedCalendarEvent,
    dto: ICalendarEventDTO,
    calendarId: string,
  ): Promise<void> {
    const now = new Date();
    const calendarKey = await this.getCalendarKey(calendarId);

    // Decrypt current body first, then apply DTO updates
    const decrypted = await decryptEventBody(
      existing,
      calendarKey,
      this.encryptionService,
    );

    const updatedEvent: ITypedCalendarEvent = {
      ...decrypted,
      summary: dto.summary || decrypted.summary,
      dtstart: new Date(dto.dtstart),
      dtend: new Date(dto.dtend || dto.dtstart),
      dtstartTzid: dto.dtstartTzid || decrypted.dtstartTzid,
      dtendTzid: dto.dtendTzid || decrypted.dtendTzid,
      allDay: dto.allDay ?? decrypted.allDay,
      sequence: dto.sequence ?? decrypted.sequence,
      attendeeIds: dto.attendees?.map((a) => a.email) ?? decrypted.attendeeIds,
      rrule: dto.rrule ?? decrypted.rrule,
      isRecurring:
        dto.rrule !== undefined ? !!dto.rrule : decrypted.isRecurring,
      exdates: dto.exdates?.map((d) => new Date(d)) ?? decrypted.exdates,
      rdates: dto.rdates?.map((d) => new Date(d)) ?? decrypted.rdates,
      recurrenceId: dto.recurrenceId
        ? new Date(dto.recurrenceId)
        : decrypted.recurrenceId,
      dateModified: now,
      searchText: buildSearchText(dto.summary, dto.description, dto.location),
    };

    const encrypted = await encryptEventBody(
      updatedEvent,
      calendarKey,
      this.encryptionService,
    );

    await this.calendarEventModel.updateOne(
      { _id: existing.id } as Partial<IStoredCalendarEvent>,
      {
        $set: {
          encryptedBody: encrypted.encryptedBody,
          blockId: encrypted.blockId,
          dtstart: encrypted.dtstart.toISOString(),
          dtend: encrypted.dtend.toISOString(),
          dtstartTzid: encrypted.dtstartTzid,
          dtendTzid: encrypted.dtendTzid,
          allDay: encrypted.allDay,
          sequence: encrypted.sequence,
          isRecurring: encrypted.isRecurring,
          searchText: encrypted.searchText,
          dateModified: now.toISOString(),
        } as Partial<IStoredCalendarEvent>,
      },
    );
  }

  /**
   * Assert that the user has at least the required permission level on a calendar.
   */
  private async assertPermission(
    calendarId: string,
    userId: string,
    requiredLevel: CalendarPermissionLevel,
  ): Promise<void> {
    const permission =
      await this.calendarPermissionService.getPermissionForUser(
        calendarId,
        userId,
      );

    if (!permission || !this.hasAtLeastPermission(permission, requiredLevel)) {
      throw new Error('FORBIDDEN');
    }
  }

  /**
   * Check if the actual permission level meets or exceeds the required level.
   */
  private hasAtLeastPermission(
    actual: CalendarPermissionLevel,
    required: CalendarPermissionLevel,
  ): boolean {
    const hierarchy: CalendarPermissionLevel[] = [
      CalendarPermissionLevel.FreeBusyOnly,
      CalendarPermissionLevel.Viewer,
      CalendarPermissionLevel.Editor,
      CalendarPermissionLevel.Owner,
    ];
    return hierarchy.indexOf(actual) >= hierarchy.indexOf(required);
  }
}
