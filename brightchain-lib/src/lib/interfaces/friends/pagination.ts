/**
 * Options for cursor-based pagination.
 */
export interface IPaginationOptions {
  /** Cursor for pagination */
  cursor?: string;
  /** Maximum number of items to return */
  limit?: number;
}

// Re-export IPaginatedResult from communication to avoid duplicate definitions.
// The canonical definition lives in communication.ts.
export type { IPaginatedResult } from '../communication';
