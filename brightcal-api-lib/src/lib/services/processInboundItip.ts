/**
 * processInboundItip
 *
 * Top-level dispatcher for inbound iTIP messages arriving via email.
 *
 * This function is the single entry-point the BrightMail API route calls when
 * it receives an email containing a `text/calendar` MIME part.  It routes the
 * invite to the appropriate `IItipInboundHandler` method and returns a typed
 * result:
 *
 *  - REQUEST / UPDATE (higher SEQUENCE) → `handleRequest` → `IImportResult`
 *  - REPLY                              → `handleReply`   → `ParticipationStatus`
 *  - CANCEL                             → `handleCancel`  → void
 *  - COUNTER                            → `handleCounter` → `string | null` (counter ICS)
 *
 * Usage (Express route example)
 * ─────────────────────────────
 * ```ts
 * router.post('/api/mail/itip-inbound', async (req, res) => {
 *   const invite: ICalInviteEmailDTO = req.body;
 *   const result = await processInboundItip(itipInboundService, req.user.id, invite);
 *   res.json(result);
 * });
 * ```
 *
 * @see Requirements 10.2–10.5, RFC 5546 §3
 */

import {
  ITipMethod,
  type ICalInviteEmailDTO,
  type IImportResult,
  type IItipInboundHandler,
  ParticipationStatus,
} from '@brightchain/brightcal-lib';

/**
 * Union type for all possible results from `processInboundItip`.
 */
export type ItipInboundResult =
  | { method: ITipMethod.Request; result: IImportResult }
  | { method: ITipMethod.Reply; partstat: ParticipationStatus }
  | { method: ITipMethod.Cancel; result: void }
  | { method: ITipMethod.Counter; counterIcs: string | null }
  | { method: 'UNSUPPORTED'; iTipMethod: string };

/**
 * Dispatch an inbound iTIP invite to the correct handler method.
 *
 * @param handler   An `IItipInboundHandler` implementation (typically `ItipInboundService`).
 * @param userId    The ID of the receiving user (attendee for REQUEST, organizer for REPLY).
 * @param invite    The parsed `ICalInviteEmailDTO` from the mail layer.
 * @returns         A typed discriminated union describing what was done.
 */
export async function processInboundItip(
  handler: IItipInboundHandler,
  userId: string,
  invite: ICalInviteEmailDTO,
): Promise<ItipInboundResult> {
  switch (invite.method) {
    case ITipMethod.Request: {
      // Also covers UPDATE (same method, higher SEQUENCE — handled inside handleRequest)
      const result = await handler.handleRequest(userId, invite);
      return { method: ITipMethod.Request, result };
    }

    case ITipMethod.Reply: {
      // Attendee has RSVP'd; update their partstat in the organizer's event
      const partstat = await handler.handleReply(userId, invite);
      return { method: ITipMethod.Reply, partstat };
    }

    case ITipMethod.Cancel: {
      await handler.handleCancel(userId, invite);
      return { method: ITipMethod.Cancel, result: undefined };
    }

    case ITipMethod.Counter: {
      // Counter-proposal — return the counter ICS for manual organizer review
      const counterIcs = await handler.handleCounter(userId, invite);
      return { method: ITipMethod.Counter, counterIcs };
    }

    default: {
      // PUBLISH, REFRESH, ADD, DECLINECOUNTER — not handled; log & ignore
      return { method: 'UNSUPPORTED', iTipMethod: invite.method };
    }
  }
}
