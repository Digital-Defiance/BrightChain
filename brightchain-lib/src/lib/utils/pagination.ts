/**
 * Cursor-based pagination utility.
 *
 * Provides a shared `paginateItems` function used by all services that return
 * `IPaginatedResult<T>`. The cursor is an opaque item ID; the page starts
 * after the item whose `id` matches the cursor.
 *
 * Requirements: 8.1
 */

import { IPaginatedResult } from '../interfaces/communication';

/**
 * An item that can be paginated — must expose a string `id`.
 */
export interface Identifiable {
  id: string;
}

/**
 * Apply cursor-based pagination to an already-sorted array of items.
 *
 * @param items  - The full sorted array to paginate.
 * @param cursor - Opaque cursor (the `id` of the last item on the previous page).
 *                 When `undefined` the first page is returned.
 * @param limit  - Maximum number of items per page (defaults to 50).
 * @returns A `IPaginatedResult<T>` with the page slice, next cursor, and `hasMore` flag.
 */
export function paginateItems<T extends Identifiable>(
  items: T[],
  cursor?: string,
  limit = 50,
): IPaginatedResult<T> {
  let startIndex = 0;

  if (cursor) {
    const cursorIndex = items.findIndex((item) => item.id === cursor);
    if (cursorIndex >= 0) {
      startIndex = cursorIndex + 1;
    }
  }

  const page = items.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < items.length;

  return {
    items: page,
    cursor: page.length > 0 ? page[page.length - 1].id : undefined,
    hasMore,
  };
}
