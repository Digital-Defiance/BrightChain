/**
 * calendarEventCrypto
 *
 * Encrypt/decrypt the sensitive body fields of a calendar event using
 * the per-calendar AES-256-GCM key stored in the calendar collection.
 *
 * Sensitive fields (summary, attendeeIds, rrule, exdates, rdates,
 * recurrenceId, parentEventId) are serialised to JSON, encrypted, and
 * stored as `encryptedBody`. The `blockId` is set to the SHA3-512 hash of
 * the ciphertext, making it content-addressable in line with the BrightChain
 * block-store design.
 *
 * The searchText field is derived from the summary and is stored in
 * plaintext to allow server-side full-text search (known searchability
 * tradeoff — consider client-side search for stricter E2EE requirements).
 *
 * @see calendarEvent.model.ts, encryptionService.ts
 */

import type { IRecurrenceRule } from '@brightchain/brightcal-lib';
import { calculateBlockId } from '@brightchain/db';
import type { ITypedCalendarEvent } from '../models/calendarEvent.model.js';
import type { IEncryptionService } from './encryptionService.js';

// ─── Encrypted body structure ─────────────────────────────────────────────────

/**
 * The sensitive fields packed into the encrypted JSON blob stored in
 * `IStoredCalendarEvent.encryptedBody`.
 */
export interface ICalendarEventBody {
  summary: string;
  attendeeIds: string[];
  rrule?: string; // JSON-serialised IRecurrenceRule
  exdates?: string[]; // ISO 8601 strings
  rdates?: string[]; // ISO 8601 strings
  recurrenceId?: string; // ISO 8601 string
  parentEventId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Encrypt the sensitive fields of a typed calendar event.
 *
 * Returns a new ITypedCalendarEvent with:
 *  - `encryptedBody` set to the AES-256-GCM ciphertext (base64 JSON wire format)
 *  - `blockId` set to the SHA3-512 hash of the ciphertext
 *  - Sensitive plaintext fields preserved on the returned value for in-memory use
 *
 * Must be called before any model.insertOne() / model.updateOne() to ensure
 * only ciphertext reaches BrightDB storage.
 *
 * @param event   - The typed calendar event to encrypt
 * @param calendarKey - Hex-encoded 256-bit AES key from the calendar collection
 * @param encryption  - The EncryptionService instance
 */
export async function encryptEventBody(
  event: ITypedCalendarEvent,
  calendarKey: string,
  encryption: IEncryptionService,
): Promise<ITypedCalendarEvent> {
  const body: ICalendarEventBody = {
    summary: event.summary,
    attendeeIds: event.attendeeIds,
    rrule: event.rrule ? JSON.stringify(event.rrule) : undefined,
    exdates: event.exdates?.map((d) => d.toISOString()),
    rdates: event.rdates?.map((d) => d.toISOString()),
    recurrenceId: event.recurrenceId?.toISOString(),
    parentEventId: event.parentEventId,
  };

  const encryptedBody = await encryption.encrypt(
    JSON.stringify(body),
    calendarKey,
  );
  const blockId = calculateBlockId(Buffer.from(encryptedBody, 'utf8'));

  return { ...event, encryptedBody, blockId };
}

/**
 * Decrypt the sensitive fields of a typed calendar event returned from BrightDB.
 *
 * Returns a new ITypedCalendarEvent with `summary`, `attendeeIds`, `rrule`,
 * `exdates`, `rdates`, `recurrenceId`, and `parentEventId` populated from
 * the decrypted `encryptedBody`.
 *
 * @param event   - The typed calendar event (from hydration — sensitive fields are empty)
 * @param calendarKey - Hex-encoded 256-bit AES key from the calendar collection
 * @param encryption  - The EncryptionService instance
 */
export async function decryptEventBody(
  event: ITypedCalendarEvent,
  calendarKey: string,
  encryption: IEncryptionService,
): Promise<ITypedCalendarEvent> {
  const json = await encryption.decrypt(event.encryptedBody, calendarKey);
  const body = JSON.parse(json) as ICalendarEventBody;

  return {
    ...event,
    summary: body.summary,
    attendeeIds: body.attendeeIds,
    rrule: body.rrule ? (JSON.parse(body.rrule) as IRecurrenceRule) : undefined,
    exdates: body.exdates?.map((d) => new Date(d)),
    rdates: body.rdates?.map((d) => new Date(d)),
    recurrenceId: body.recurrenceId ? new Date(body.recurrenceId) : undefined,
    parentEventId: body.parentEventId,
  };
}
