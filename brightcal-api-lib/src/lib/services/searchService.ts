/**
 * SearchService
 *
 * Service for full-text search and structured filtering of calendar events.
 * Operates on the CalendarEvent model with permission-aware access.
 *
 * @see Requirements 15.1, 15.2, 15.3, 15.4
 */

import type { Model } from '@brightchain/db';
import type {
  IStoredCalendarCollection,
  ITypedCalendarCollection,
} from '../models/calendarCollection.model.js';
import type {
  IStoredCalendarEvent,
  ITypedCalendarEvent,
} from '../models/calendarEvent.model.js';
import { decryptEventBody } from './calendarEventCrypto.js';
import type { CalendarPermissionService } from './calendarPermissionService.js';
import type { IEncryptionService } from './encryptionService.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * Structured filter criteria for event queries.
 */
export interface IFilterCriteria {
  calendarId?: string;
  start?: string;
  end?: string;
  attendee?: string;
  status?: string;
  recurring?: boolean;
}

/**
 * Interface consumed by SearchController.
 */
export interface ISearchService {
  search(
    userId: string,
    query: string,
    calendarIds?: string[],
  ): Promise<ITypedCalendarEvent[]>;

  filter(
    userId: string,
    criteria: IFilterCriteria,
  ): Promise<ITypedCalendarEvent[]>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * SearchService provides full-text search and structured filtering
 * across calendar events the user has access to.
 *
 * - `search`: Case-insensitive substring match on searchText field
 * - `filter`: AND-combination of all specified criteria
 *
 * Results are ranked by relevance with recent/upcoming events prioritized.
 *
 * @requirements 15.1, 15.2, 15.3, 15.4
 */
export class SearchService implements ISearchService {
  private readonly calendarEventModel: Model<
    IStoredCalendarEvent,
    ITypedCalendarEvent
  >;
  private readonly calendarPermissionService: CalendarPermissionService;
  private readonly calendarCollectionModel?: Model<
    IStoredCalendarCollection,
    ITypedCalendarCollection
  >;
  private readonly encryptionService?: IEncryptionService;
  constructor(
    calendarEventModel: Model<IStoredCalendarEvent, ITypedCalendarEvent>,
    calendarPermissionService: CalendarPermissionService,
    calendarCollectionModel?: Model<
      IStoredCalendarCollection,
      ITypedCalendarCollection
    >,
    encryptionService?: IEncryptionService,
  ) {
    this.calendarEventModel = calendarEventModel;
    this.calendarPermissionService = calendarPermissionService;
    this.calendarCollectionModel = calendarCollectionModel;
    this.encryptionService = encryptionService;
  }

  /**
   * Full-text search across event title, description, location, attendee names.
   *
   * Searches the `searchText` field which is a concatenation of searchable fields.
   * Results are sorted by relevance (upcoming/recent first).
   *
   * @param userId - The authenticated user performing the search
   * @param query - The search query string
   * @param calendarIds - Optional list of calendar IDs to restrict search to
   * @returns Matching events sorted by relevance
   *
   * @requirements 15.1, 15.4
   */
  async search(
    userId: string,
    query: string,
    calendarIds?: string[],
  ): Promise<ITypedCalendarEvent[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    // Get all accessible calendar IDs for the user
    const accessibleCalendarIds =
      await this.calendarPermissionService.getAccessibleCalendarIds(userId);

    // If calendarIds filter specified, intersect with accessible ones
    const targetCalendarIds = calendarIds?.length
      ? calendarIds.filter((id) => accessibleCalendarIds.includes(id))
      : accessibleCalendarIds;

    if (targetCalendarIds.length === 0) {
      return [];
    }

    // Query events from all target calendars
    const allEvents: ITypedCalendarEvent[] = [];
    for (const calId of targetCalendarIds) {
      const events = await this.calendarEventModel
        .find({ calendarId: calId } as Partial<IStoredCalendarEvent>)
        .toArray();
      allEvents.push(...events);
    }

    // Filter by search text (case-insensitive substring match)
    const matched = allEvents.filter(
      (event) =>
        event.searchText && event.searchText.toLowerCase().includes(lowerQuery),
    );

    // Rank results: upcoming/recent events first
    return this.rankByRelevance(matched);
  }

  /**
   * Structured filter applying all specified criteria as AND conditions.
   *
   * @param userId - The authenticated user performing the filter
   * @param criteria - Filter criteria (all optional, combined with AND)
   * @returns Events matching all specified criteria
   *
   * @requirements 15.2, 15.3
   */
  async filter(
    userId: string,
    criteria: IFilterCriteria,
  ): Promise<ITypedCalendarEvent[]> {
    // Get accessible calendar IDs
    const accessibleCalendarIds =
      await this.calendarPermissionService.getAccessibleCalendarIds(userId);

    // If calendarId filter specified, check access
    const targetCalendarIds = criteria.calendarId
      ? accessibleCalendarIds.includes(criteria.calendarId)
        ? [criteria.calendarId]
        : []
      : accessibleCalendarIds;

    if (targetCalendarIds.length === 0) {
      return [];
    }

    // Query events from target calendars
    const allEvents: ITypedCalendarEvent[] = [];
    for (const calId of targetCalendarIds) {
      const events = await this.calendarEventModel
        .find({ calendarId: calId } as Partial<IStoredCalendarEvent>)
        .toArray();
      allEvents.push(...events);
    }

    // Apply all criteria as AND conditions
    let results = allEvents;

    if (criteria.start) {
      const startDate = new Date(criteria.start);
      results = results.filter((e) => e.dtend >= startDate);
    }

    if (criteria.end) {
      const endDate = new Date(criteria.end);
      results = results.filter((e) => e.dtstart <= endDate);
    }

    if (criteria.attendee) {
      // Decrypt events to access attendeeIds (encrypted field)
      if (this.calendarCollectionModel && this.encryptionService) {
        const decrypted = await this.decryptEvents(results);
        results = decrypted.filter((e) =>
          e.attendeeIds.includes(criteria.attendee!),
        );
      } else {
        results = results.filter((e) =>
          e.attendeeIds.includes(criteria.attendee!),
        );
      }
    }

    if (criteria.status) {
      const upperStatus = criteria.status.toUpperCase();
      results = results.filter((e) => e.status === upperStatus);
    }

    if (criteria.recurring !== undefined) {
      results = results.filter((e) => e.isRecurring === criteria.recurring);
    }

    return this.rankByRelevance(results);
  }

  /**
   * Decrypt a list of events to access encrypted fields (attendeeIds, etc.).
   */
  private async decryptEvents(
    events: ITypedCalendarEvent[],
  ): Promise<ITypedCalendarEvent[]> {
    if (!this.calendarCollectionModel || !this.encryptionService) {
      return events;
    }

    const keyCache = new Map<string, string>();
    const decrypted: ITypedCalendarEvent[] = [];

    for (const event of events) {
      let key = keyCache.get(event.calendarId);
      if (!key) {
        const calendar = await this.calendarCollectionModel.findById(
          event.calendarId,
        );
        if (calendar?.encryptionKey) {
          key = calendar.encryptionKey;
          keyCache.set(event.calendarId, key);
        }
      }
      if (key) {
        decrypted.push(
          await decryptEventBody(event, key, this.encryptionService!),
        );
      } else {
        decrypted.push(event);
      }
    }

    return decrypted;
  }

  /**
   * Rank events by relevance: upcoming events first, then recent past events.
   * Events closer to "now" are ranked higher.
   */
  private rankByRelevance(
    events: ITypedCalendarEvent[],
  ): ITypedCalendarEvent[] {
    const now = Date.now();
    return [...events].sort((a, b) => {
      const distA = Math.abs(a.dtstart.getTime() - now);
      const distB = Math.abs(b.dtstart.getTime() - now);
      return distA - distB;
    });
  }
}
