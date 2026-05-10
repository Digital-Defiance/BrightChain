import type {
  ICalendarCollectionDTO,
  ICalendarEventDTO,
} from '@brightchain/brightcal-lib';

const STORAGE_KEY = 'brightcal:visibilitySet';
const DEFAULT_COLOR = '#3b82f6';

/**
 * Load the Visibility Set from localStorage.
 * Returns null if no persisted set exists.
 * @see Requirements 1.5
 */
export function loadVisibilitySet(): Set<string> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return null;
  }
}

/**
 * Persist the Visibility Set to localStorage as a JSON array.
 * @see Requirements 1.5
 */
export function saveVisibilitySet(set: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/**
 * Toggle a calendar ID in the Visibility Set.
 * Returns a new Set with the ID added if absent, or removed if present.
 * @see Requirements 1.3
 */
export function toggleVisibility(
  set: Set<string>,
  calendarId: string,
): Set<string> {
  const next = new Set(set);
  if (next.has(calendarId)) {
    next.delete(calendarId);
  } else {
    next.add(calendarId);
  }
  return next;
}

/**
 * Filter events to only those whose calendarId is in the Visibility Set.
 * @see Requirements 7.5, 8.1
 */
export function filterEventsByVisibility(
  events: ICalendarEventDTO[],
  visibilitySet: Set<string>,
): ICalendarEventDTO[] {
  return events.filter((e) => visibilitySet.has(e.calendarId as string));
}

/**
 * Build a map from calendarId → hex color string.
 * Returns DEFAULT_COLOR for any calendar without a color.
 * @see Requirements 7.2
 */
export function buildCalendarColorMap(
  calendars: ICalendarCollectionDTO[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const cal of calendars) {
    map.set(cal.id as string, cal.color || DEFAULT_COLOR);
  }
  return map;
}

/**
 * Group calendars into owned vs. other (shared/subscribed).
 * @see Requirements 1.1
 */
export function groupCalendarsByOwnership(
  calendars: ICalendarCollectionDTO[],
  userId: string,
): { owned: ICalendarCollectionDTO[]; other: ICalendarCollectionDTO[] } {
  const owned: ICalendarCollectionDTO[] = [];
  const other: ICalendarCollectionDTO[] = [];
  for (const cal of calendars) {
    if ((cal.ownerId as string) === userId) {
      owned.push(cal);
    } else {
      other.push(cal);
    }
  }
  return { owned, other };
}
