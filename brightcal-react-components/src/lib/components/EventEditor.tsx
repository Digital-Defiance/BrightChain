import type {
  ICalendarCollectionDTO,
  ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import {
  BrightCalStrings,
  EventTransparency,
  EventVisibility,
} from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import React, { useCallback, useState } from 'react';

/**
 * Partial event data for creating/editing events.
 */
export interface EventFormData {
  summary: string;
  description: string;
  location: string;
  dtstart: string;
  dtend: string;
  allDay: boolean;
  calendarId: string;
  visibility: EventVisibility;
  transparency: EventTransparency;
}

export interface EventEditorProps {
  /** Existing event to edit (undefined for create mode) */
  event?: ICalendarEventDTO;
  /** Available calendars to assign the event to */
  calendars: ICalendarCollectionDTO[];
  /** Callback when the form is saved */
  onSave: (data: EventFormData) => void;
  /** Callback when editing is cancelled */
  onCancel: () => void;
  /**
   * Optional callback invoked after a successful save or cancel when the
   * event has attendees and iTIP notifications should be delivered.
   *
   * The caller (page/container) is responsible for flushing the
   * `CalendarNotificationService` message queue (e.g. via an API call to
   * `POST /calendar/notifications/flush`).  The boolean argument indicates
   * whether the trigger was a save (`true`) or cancel (`false`).
   *
   * @see ItipMailDeliveryService.flushQueue()
   */
  onItipFlush?: (isSave: boolean) => void;
}

function toLocalDateTimeString(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

/**
 * EventEditor provides a create/edit event form with fields for title,
 * description, location, time, calendar, visibility, and transparency.
 *
 * Requirements: 12.11, 4.1
 */
export function EventEditor({
  event,
  calendars,
  onSave,
  onCancel,
  onItipFlush,
}: EventEditorProps) {
  const { tBranded: t } = useI18n();
  const [formData, setFormData] = useState<EventFormData>({
    summary: event?.summary ?? '',
    description: event?.description ?? '',
    location: event?.location ?? '',
    dtstart: toLocalDateTimeString(event?.dtstart),
    dtend: toLocalDateTimeString(event?.dtend),
    allDay: event?.allDay ?? false,
    calendarId: event
      ? String(event.calendarId)
      : calendars[0]
        ? String(calendars[0].id)
        : '',
    visibility: event?.visibility ?? EventVisibility.Public,
    transparency: event?.transparency ?? EventTransparency.Opaque,
  });

  const handleChange = useCallback(
    (field: keyof EventFormData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
      // Notify the caller to flush the iTIP queue if this event has attendees.
      if (onItipFlush && (event?.attendees?.length ?? 0) > 0) {
        onItipFlush(true);
      }
    },
    [event?.attendees?.length, formData, onItipFlush, onSave],
  );

  return (
    <form
      className="brightcal-event-editor"
      onSubmit={handleSubmit}
      aria-label={
        event
          ? t(BrightCalStrings.Label_EditEvent)
          : t(BrightCalStrings.Label_CreateEvent)
      }
    >
      <div className="brightcal-form-field">
        <label htmlFor="brightcal-summary">
          {t(BrightCalStrings.Label_Title)}
        </label>
        <input
          id="brightcal-summary"
          type="text"
          value={formData.summary}
          onChange={(e) => handleChange('summary', e.target.value)}
          required
        />
      </div>

      <div className="brightcal-form-field">
        <label htmlFor="brightcal-calendar">
          {t(BrightCalStrings.Label_Calendar)}
        </label>
        <select
          id="brightcal-calendar"
          value={formData.calendarId}
          onChange={(e) => handleChange('calendarId', e.target.value)}
        >
          {calendars.map((cal) => (
            <option key={String(cal.id)} value={String(cal.id)}>
              {cal.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="brightcal-form-field">
        <label>
          <input
            type="checkbox"
            checked={formData.allDay}
            onChange={(e) => handleChange('allDay', e.target.checked)}
          />
          {t(BrightCalStrings.Label_AllDay)}
        </label>
      </div>

      <div className="brightcal-form-field">
        <label htmlFor="brightcal-dtstart">
          {t(BrightCalStrings.Label_Start)}
        </label>
        <input
          id="brightcal-dtstart"
          type={formData.allDay ? 'date' : 'datetime-local'}
          value={formData.dtstart}
          onChange={(e) => handleChange('dtstart', e.target.value)}
          required
        />
      </div>

      <div className="brightcal-form-field">
        <label htmlFor="brightcal-dtend">{t(BrightCalStrings.Label_End)}</label>
        <input
          id="brightcal-dtend"
          type={formData.allDay ? 'date' : 'datetime-local'}
          value={formData.dtend}
          onChange={(e) => handleChange('dtend', e.target.value)}
        />
      </div>

      <div className="brightcal-form-field">
        <label htmlFor="brightcal-location">
          {t(BrightCalStrings.Label_Location)}
        </label>
        <input
          id="brightcal-location"
          type="text"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
        />
      </div>

      <div className="brightcal-form-field">
        <label htmlFor="brightcal-description">
          {t(BrightCalStrings.Label_Description)}
        </label>
        <textarea
          id="brightcal-description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div className="brightcal-form-field">
        <label htmlFor="brightcal-visibility">
          {t(BrightCalStrings.Label_Visibility)}
        </label>
        <select
          id="brightcal-visibility"
          value={formData.visibility}
          onChange={(e) =>
            handleChange('visibility', e.target.value as EventVisibility)
          }
        >
          <option value={EventVisibility.Public}>
            {t(BrightCalStrings.Visibility_Public)}
          </option>
          <option value={EventVisibility.Private}>
            {t(BrightCalStrings.Visibility_Private)}
          </option>
          <option value={EventVisibility.Confidential}>
            {t(BrightCalStrings.Visibility_Confidential)}
          </option>
        </select>
      </div>

      <div className="brightcal-form-actions">
        <button type="submit">
          {event
            ? t(BrightCalStrings.Action_Save)
            : t(BrightCalStrings.Action_Create)}
        </button>
        <button type="button" onClick={() => {
          onCancel();
          // A cancel on an event with attendees triggers a iTIP CANCEL flush.
          if (onItipFlush && (event?.attendees?.length ?? 0) > 0) {
            onItipFlush(false);
          }
        }}>
          {t(BrightCalStrings.Action_Cancel)}
        </button>
      </div>
    </form>
  );
}
