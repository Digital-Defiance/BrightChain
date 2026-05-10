/**
 * Result of processing an inbound iTIP REQUEST or CANCEL.
 *
 * Mirrors the shape of `IImportResult` in `brightcal-api-lib`'s
 * ExportImportService, but declared here in `brightcal-lib` so both the
 * mail and calendar layers can reference it without a circular dependency.
 *
 * @see Requirements 10.2, 10.3
 */
export interface IImportResult {
  /** Number of events newly created in the calendar. */
  imported: number;
  /** Number of events skipped (duplicate SEQUENCE or already cancelled). */
  skipped: number;
  /** Number of events updated (higher SEQUENCE than stored). */
  overwritten: number;
  /** UIDs that were detected as exact duplicates. */
  duplicates: string[];
}
