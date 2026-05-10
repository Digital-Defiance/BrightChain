import type { ICalendarEventDTO } from '@brightchain/brightcal-lib';
import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import { useI18n } from '@digitaldefiance/express-suite-react-components';

/**
 * Props for the InlineEventCard component.
 */
export interface InlineEventCardProps {
  /** The event parsed from an iCal attachment */
  event: ICalendarEventDTO;
  /** Whether this is an update (SEQUENCE > 0) */
  isUpdate?: boolean;
  /** Callback when Accept is clicked */
  onAccept?: (event: ICalendarEventDTO) => void;
  /** Callback when Decline is clicked */
  onDecline?: (event: ICalendarEventDTO) => void;
  /** Callback when Tentative is clicked */
  onTentative?: (event: ICalendarEventDTO) => void;
}

/**
 * InlineEventCard renders event details from an iCal email attachment
 * with RSVP action buttons. Shows change highlights for meeting updates.
 *
 * Requirements: 13.1, 13.2, 13.5
 */
export function InlineEventCard({
  event,
  isUpdate = false,
  onAccept,
  onDecline,
  onTentative,
}: InlineEventCardProps) {
  const { tBranded: t } = useI18n();
  const { formatDateTime } = useFormattedDate();

  return (
    <div
      className={`brightcal-inline-event-card${isUpdate ? ' brightcal-event-update' : ''}`}
      role="article"
      aria-label={`Event: ${event.summary}`}
    >
      {isUpdate && (
        <span className="brightcal-event-update-badge" role="status">
          {t(BrightCalStrings.Status_Updated)}
        </span>
      )}

      <h3 className="brightcal-inline-event-title">{event.summary}</h3>

      <dl className="brightcal-inline-event-details">
        <dt>{t(BrightCalStrings.Label_When)}</dt>
        <dd className={isUpdate ? 'brightcal-highlight' : ''}>
          {formatDateTime(event.dtstart)}
          {event.dtend && ` — ${formatDateTime(event.dtend)}`}
        </dd>

        {event.location && (
          <>
            <dt>{t(BrightCalStrings.Label_Where)}</dt>
            <dd className={isUpdate ? 'brightcal-highlight' : ''}>
              {event.location}
            </dd>
          </>
        )}

        {event.description && (
          <>
            <dt>{t(BrightCalStrings.Label_Description)}</dt>
            <dd>{event.description}</dd>
          </>
        )}

        {event.attendees.length > 0 && (
          <>
            <dt>{t(BrightCalStrings.Label_Attendees)}</dt>
            <dd>
              {event.attendees.map((a) => a.displayName ?? a.email).join(', ')}
            </dd>
          </>
        )}
      </dl>

      {(onAccept || onDecline || onTentative) && (
        <div
          className="brightcal-inline-event-actions"
          role="group"
          aria-label={t(BrightCalStrings.Label_RsvpActions)}
        >
          {onAccept && (
            <button type="button" onClick={() => onAccept(event)}>
              {t(BrightCalStrings.Action_Accept)}
            </button>
          )}
          {onTentative && (
            <button type="button" onClick={() => onTentative(event)}>
              {t(BrightCalStrings.Action_Tentative)}
            </button>
          )}
          {onDecline && (
            <button type="button" onClick={() => onDecline(event)}>
              {t(BrightCalStrings.Action_Decline)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
