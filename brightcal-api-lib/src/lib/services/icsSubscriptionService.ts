/**
 * IcsSubscriptionService
 *
 * Handles polling external ICS feeds and merging events into a local
 * read-only calendar collection. The merge logic:
 * - Events in new feed but not in existing (by UID) → add
 * - Events in both but content differs → update
 * - Events in existing but not in new feed → remove
 *
 * @see Requirements 3.6, 3.7
 */

import type { ICalendarEventDTO } from '@brightchain/brightcal-lib';
import type { ITypedCalendarEvent } from '../models/calendarEvent.model.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * Result of merging a new ICS feed with existing local events.
 */
export interface IMergeResult {
  /** Events present in the new feed but not locally — should be added */
  toAdd: ICalendarEventDTO[];
  /** Events present in both but with different content — should be updated */
  toUpdate: Array<{
    existing: ITypedCalendarEvent;
    updated: ICalendarEventDTO;
  }>;
  /** Events present locally but absent from the new feed — should be removed */
  toRemove: ITypedCalendarEvent[];
}

/**
 * Interface for the ICS subscription service.
 */
export interface IIcsSubscriptionService {
  mergeEvents(
    existingEvents: ITypedCalendarEvent[],
    newFeedEvents: ICalendarEventDTO[],
    calendarId: string,
    userId: string,
  ): IMergeResult;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compare relevant event fields to determine if content has changed.
 * We compare the fields that matter for display and scheduling.
 */
function hasContentChanged(
  existing: ITypedCalendarEvent,
  incoming: ICalendarEventDTO,
): boolean {
  // Compare summary
  if (existing.summary !== incoming.summary) return true;

  // Compare times (normalize to ISO strings for comparison)
  const existingDtstart =
    existing.dtstart instanceof Date
      ? existing.dtstart.toISOString()
      : String(existing.dtstart);
  if (existingDtstart !== incoming.dtstart) return true;

  const existingDtend =
    existing.dtend instanceof Date
      ? existing.dtend.toISOString()
      : String(existing.dtend);
  const incomingDtend = incoming.dtend ?? '';
  if (existingDtend !== incomingDtend) return true;

  // Compare timezone identifiers
  if (existing.dtstartTzid !== incoming.dtstartTzid) return true;
  if ((existing.dtendTzid ?? '') !== (incoming.dtendTzid ?? '')) return true;

  // Compare description and location
  if (existing.summary !== incoming.summary) return true;
  if (
    (existing as unknown as { description?: string }).description !==
    (incoming.description ?? undefined)
  )
    return true;
  if (
    (existing as unknown as { location?: string }).location !==
    (incoming.location ?? undefined)
  )
    return true;

  // Compare sequence number (higher sequence = updated)
  if (existing.sequence !== incoming.sequence) return true;

  // Compare status
  if (existing.status !== incoming.status) return true;

  // Compare transparency
  if (existing.transparency !== incoming.transparency) return true;

  // Compare visibility
  if (existing.visibility !== incoming.visibility) return true;

  // Compare allDay flag
  if (existing.allDay !== incoming.allDay) return true;

  return false;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * IcsSubscriptionService handles the merge logic for external ICS feed
 * subscriptions. It compares existing local events with new feed events
 * by UID and produces add/update/remove sets.
 *
 * @requirements 3.6, 3.7
 */
export class IcsSubscriptionService implements IIcsSubscriptionService {
  /**
   * Merge events from a new ICS feed with existing local events.
   *
   * The merge is performed by UID matching:
   * - New UIDs → toAdd
   * - Matching UIDs with different content → toUpdate
   * - Missing UIDs (in existing but not in feed) → toRemove
   *
   * @param existingEvents - Current local events for this subscription calendar
   * @param newFeedEvents - Events parsed from the refreshed ICS feed
   * @param calendarId - The subscription calendar's ID
   * @param userId - The owner of the subscription
   * @returns Categorized merge result
   *
   * @requirements 3.7
   */
  mergeEvents(
    existingEvents: ITypedCalendarEvent[],
    newFeedEvents: ICalendarEventDTO[],
    calendarId: string,
    userId: string,
  ): IMergeResult {
    // Build a map of existing events by UID for O(1) lookup
    const existingByUid = new Map<string, ITypedCalendarEvent>();
    for (const event of existingEvents) {
      existingByUid.set(event.uid, event);
    }

    // Build a set of new feed UIDs for removal detection
    const newFeedUids = new Set<string>();
    for (const event of newFeedEvents) {
      newFeedUids.add(event.uid);
    }

    const toAdd: ICalendarEventDTO[] = [];
    const toUpdate: IMergeResult['toUpdate'] = [];
    const toRemove: ITypedCalendarEvent[] = [];

    // Process new feed events: add or update
    for (const feedEvent of newFeedEvents) {
      const existing = existingByUid.get(feedEvent.uid);

      if (!existing) {
        // Event is new — add it
        toAdd.push(feedEvent);
      } else if (hasContentChanged(existing, feedEvent)) {
        // Event exists but content differs — update it
        toUpdate.push({ existing, updated: feedEvent });
      }
      // If content is identical, no action needed
    }

    // Process existing events: find removals
    for (const existingEvent of existingEvents) {
      if (!newFeedUids.has(existingEvent.uid)) {
        // Event no longer in feed — remove it
        toRemove.push(existingEvent);
      }
    }

    return { toAdd, toUpdate, toRemove };
  }
}
