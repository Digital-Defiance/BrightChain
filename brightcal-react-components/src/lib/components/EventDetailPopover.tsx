import type { ICalendarEventDTO } from '@brightchain/brightcal-lib';
import {
  BrightCalStrings,
  ParticipationStatus,
} from '@brightchain/brightcal-lib';
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import { useI18n } from '@digitaldefiance/express-suite-react-components';

export interface EventDetailPopoverProps {
  /** The event to display details for */
  event: ICalendarEventDTO;
  /** Callback to edit the event */
  onEdit?: (event: ICalendarEventDTO) => void;
  /** Callback to delete the event */
  onDelete?: (event: ICalendarEventDTO) => void;
  /** Callback for RSVP action */
  onRsvp?: (event: ICalendarEventDTO, status: ParticipationStatus) => void;
  /** Callback to close the popover */
  onClose: () => void;
}

/**
 * EventDetailPopover shows event details including title, time, location,
 * description, attendees, and RSVP status with action buttons.
 *
 * Requirements: 12.11
 */
export function EventDetailPopover({
  event,
  onEdit,
  onDelete,
  onRsvp,
  onClose,
}: EventDetailPopoverProps) {
  const { tBranded: t } = useI18n();
  const { formatDateTime } = useFormattedDate();
  const startDate = new Date(event.dtstart);
  const endDate = event.dtend ? new Date(event.dtend) : null;

  return (
    <div
      className="brightcal-event-popover"
      role="dialog"
      aria-label={`Event details: ${event.summary}`}
    >
      <div className="brightcal-popover-header">
        <h3 className="brightcal-popover-title">{event.summary}</h3>
        <button
          type="button"
          className="brightcal-popover-close"
          onClick={onClose}
          aria-label={t(BrightCalStrings.Action_Close)}
        >
          ×
        </button>
      </div>

      <div className="brightcal-popover-body">
        <div className="brightcal-popover-time">
          {event.allDay
            ? t(BrightCalStrings.Label_AllDay)
            : `${formatDateTime(startDate)}${endDate ? ` – ${formatDateTime(endDate)}` : ''}`}
        </div>

        {event.location && (
          <div className="brightcal-popover-location">{event.location}</div>
        )}

        {event.description && (
          <div className="brightcal-popover-description">
            {event.description}
          </div>
        )}

        {event.attendees.length > 0 && (
          <div className="brightcal-popover-attendees">
            <h4>
              {t(BrightCalStrings.Label_Attendees)} ({event.attendees.length})
            </h4>
            <ul>
              {event.attendees.map((attendee, i) => (
                <li key={i}>
                  {attendee.displayName ?? attendee.email} –{' '}
                  <span
                    className={`brightcal-partstat-${attendee.partstat.toLowerCase()}`}
                  >
                    {attendee.partstat}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="brightcal-popover-actions">
        {onRsvp && (
          <div
            className="brightcal-rsvp-actions"
            role="group"
            aria-label={t(BrightCalStrings.Label_RsvpActions)}
          >
            <button
              type="button"
              onClick={() => onRsvp(event, ParticipationStatus.Accepted)}
            >
              {t(BrightCalStrings.Action_Accept)}
            </button>
            <button
              type="button"
              onClick={() => onRsvp(event, ParticipationStatus.Tentative)}
            >
              {t(BrightCalStrings.Action_Tentative)}
            </button>
            <button
              type="button"
              onClick={() => onRsvp(event, ParticipationStatus.Declined)}
            >
              {t(BrightCalStrings.Action_Decline)}
            </button>
          </div>
        )}
        {onEdit && (
          <button type="button" onClick={() => onEdit(event)}>
            {t(BrightCalStrings.Action_Edit)}
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={() => onDelete(event)}>
            {t(BrightCalStrings.Action_Delete)}
          </button>
        )}
      </div>
    </div>
  );
}
