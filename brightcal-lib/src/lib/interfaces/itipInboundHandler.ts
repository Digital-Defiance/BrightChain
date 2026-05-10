import { ParticipationStatus } from '../enums';
import { ICalInviteEmailDTO } from './calInviteEmailDto';
import { IImportResult } from './itipImportResult';

/**
 * Inbound iTIP handler interface.
 *
 * Implemented in `brightcal-api-lib` (ItipInboundService).  Declared here in
 * `brightcal-lib` so the mail layer can depend on the interface without taking
 * a hard dependency on the API-only service.
 *
 * Responsibilities:
 * - Accept an `ICalInviteEmailDTO` (already parsed from the MIME attachment by
 *   the mail layer) and decide whether to import, update, or cancel an event.
 * - Return a reply iTIP (REPLY / COUNTER / DECLINECOUNTER) body that the mail
 *   layer sends back to the organizer.
 *
 * @see RFC 5546 §3 – iTIP processing rules
 * @see Requirements 10.2, 10.3, 10.4, 10.5
 */
export interface IItipInboundHandler {
  /**
   * Process an inbound iTIP REQUEST.
   *
   * - If no matching UID exists: imports the event into the user's default
   *   calendar and sets PARTSTAT=NEEDS-ACTION.
   * - If a matching UID exists with a lower SEQUENCE: updates the stored event.
   * - If the stored SEQUENCE is equal or higher: treats the message as a
   *   duplicate and skips without error.
   *
   * @returns An `IImportResult` summary.
   */
  handleRequest(
    userId: string,
    invite: ICalInviteEmailDTO,
  ): Promise<IImportResult>;

  /**
   * Process an inbound iTIP REPLY from an attendee.
   *
   * Updates the attendee's `partstat` on the stored event.
   *
   * @returns The updated `ParticipationStatus` after processing.
   */
  handleReply(
    organizerId: string,
    invite: ICalInviteEmailDTO,
  ): Promise<ParticipationStatus>;

  /**
   * Process an inbound iTIP CANCEL.
   *
   * Sets the stored event's status to CANCELLED (or removes exception
   * instances for partial cancellations that include RECURRENCE-ID).
   */
  handleCancel(userId: string, invite: ICalInviteEmailDTO): Promise<void>;

  /**
   * Process an inbound iTIP COUNTER proposal from an attendee.
   *
   * Stores the counter-proposed times for organizer review.  Returns
   * the raw ICS for a DECLINECOUNTER reply if the organizer has already
   * configured an auto-decline policy, or `null` to indicate manual review
   * is needed.
   */
  handleCounter(
    organizerId: string,
    invite: ICalInviteEmailDTO,
  ): Promise<string | null>;
}
