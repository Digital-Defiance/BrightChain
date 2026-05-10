/**
 * useItipRsvp
 *
 * React hook that POSTs an RSVP response (Accept / Tentative / Decline) to
 * the calendar API for an incoming iTIP REQUEST.  The API route is expected
 * to:
 *
 *  1. Call `ItipInboundService.handleRequest()` (or a dedicated RSVP endpoint)
 *     to update the attendee's `partstat` in the organiser's event.
 *  2. Enqueue a REPLY iTIP via `CalendarNotificationService`.
 *  3. Flush the iTIP queue via `ItipMailDeliveryService.flushQueue()` so that
 *     the organiser receives a REPLY email.
 *
 * Endpoint contract
 * ─────────────────
 * POST `{apiBaseUrl}/calendar/itip/rsvp`
 * Body: `{ uid: string; partstat: ParticipationStatus; rawIcs: string; }`
 * 200: `{ partstat: ParticipationStatus }`
 *
 * Usage
 * ─────
 * ```tsx
 * const { rsvp, responding, error } = useItipRsvp({ apiBaseUrl, authToken });
 *
 * <CalendarInviteCard
 *   invite={invite}
 *   onRsvp={(status) => rsvp(invite.uid, invite.rawIcs, status)}
 *   currentPartstat={currentPartstat}
 * />
 * ```
 *
 * @see Requirements 10.3
 */
import type { ParticipationStatus } from '@brightchain/brightcal-lib';
import { useCallback, useState } from 'react';

export interface UseItipRsvpOptions {
  /** Base URL of the calendar API (no trailing slash). */
  apiBaseUrl: string;
  /** Bearer token for authenticated requests. */
  authToken?: string;
  /** Called after a successful RSVP with the confirmed partstat. */
  onSuccess?: (partstat: ParticipationStatus) => void;
}

export interface UseItipRsvpResult {
  /** True while an RSVP request is in-flight. */
  responding: boolean;
  /** Non-null if the last RSVP request failed. */
  error: string | null;
  /**
   * Send an RSVP for the given event UID.
   *
   * @param uid      The event UID from the iTIP invite.
   * @param rawIcs   The raw ICS string from the invite (used for server-side
   *                 parsing; may be the original `ICalInviteEmailDTO.rawIcs`).
   * @param partstat The chosen participation status.
   */
  rsvp: (
    uid: string,
    rawIcs: string,
    partstat: ParticipationStatus,
  ) => Promise<void>;
}

/**
 * Hook for submitting iTIP RSVP responses.
 *
 * @see Requirements 10.3
 */
export function useItipRsvp({
  apiBaseUrl,
  authToken,
  onSuccess,
}: UseItipRsvpOptions): UseItipRsvpResult {
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rsvp = useCallback(
    async (
      uid: string,
      rawIcs: string,
      partstat: ParticipationStatus,
    ): Promise<void> => {
      setResponding(true);
      setError(null);
      try {
        const resp = await fetch(`${apiBaseUrl}/calendar/itip/rsvp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ uid, partstat, rawIcs }),
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => resp.statusText);
          throw new Error(text);
        }

        const data = (await resp.json()) as { partstat: ParticipationStatus };
        onSuccess?.(data.partstat);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setResponding(false);
      }
    },
    [apiBaseUrl, authToken, onSuccess],
  );

  return { responding, error, rsvp };
}
