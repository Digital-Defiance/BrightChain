import type {
  IFreeBusyDataDTO,
  IFreeBusySlot,
} from '@brightchain/brightcal-lib';
import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useMemo } from 'react';

export interface FreeBusyAttendee {
  id: string;
  displayName: string;
  email: string;
}

export interface FreeBusyGridProps {
  /** Attendees to show in the grid */
  attendees: FreeBusyAttendee[];
  /** Free/busy data keyed by attendee ID */
  freeBusyData: Map<string, IFreeBusyDataDTO>;
  /** Start of the time range to display */
  rangeStart: Date;
  /** End of the time range to display */
  rangeEnd: Date;
}

/** Generate 30-minute time slot labels between start and end. */
function generateTimeSlots(start: Date, end: Date): Date[] {
  const slots: Date[] = [];
  const current = new Date(start);
  while (current < end) {
    slots.push(new Date(current));
    current.setMinutes(current.getMinutes() + 30);
  }
  return slots;
}

/** Determine if a time slot overlaps with any busy period. */
function getSlotStatus(
  slotStart: Date,
  slotEnd: Date,
  slots: IFreeBusySlot[],
): IFreeBusySlot['type'] {
  for (const slot of slots) {
    const busyStart = new Date(slot.start);
    const busyEnd = new Date(slot.end);
    if (slotStart < busyEnd && slotEnd > busyStart) {
      return slot.type;
    }
  }
  return 'FREE';
}

/**
 * FreeBusyGrid visualizes attendee availability across a time range.
 * Each row represents an attendee, each column a 30-minute time slot.
 *
 * Requirements: 8.3, 8.4
 */
export function FreeBusyGrid({
  attendees,
  freeBusyData,
  rangeStart,
  rangeEnd,
}: FreeBusyGridProps) {
  const { tBranded: t } = useI18n();
  const timeSlots = useMemo(
    () => generateTimeSlots(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  return (
    <div
      className="brightcal-freebusy-grid"
      role="grid"
      aria-label={t(BrightCalStrings.Label_AttendeeAvailability)}
    >
      {/* Header row with time labels */}
      <div className="brightcal-freebusy-header" role="row">
        <div className="brightcal-freebusy-name-col" role="columnheader">
          {t(BrightCalStrings.Label_Attendee)}
        </div>
        {timeSlots.map((slot, i) => (
          <div
            key={i}
            className="brightcal-freebusy-time-col"
            role="columnheader"
          >
            {slot.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        ))}
      </div>

      {/* Attendee rows */}
      {attendees.map((attendee) => {
        const data = freeBusyData.get(attendee.id);
        const busySlots = data?.slots ?? [];

        return (
          <div key={attendee.id} className="brightcal-freebusy-row" role="row">
            <div className="brightcal-freebusy-name" role="rowheader">
              {attendee.displayName}
            </div>
            {timeSlots.map((slot, i) => {
              const slotEnd = new Date(slot.getTime() + 30 * 60 * 1000);
              const status = getSlotStatus(slot, slotEnd, busySlots);
              return (
                <div
                  key={i}
                  className={`brightcal-freebusy-cell brightcal-freebusy-${status.toLowerCase()}`}
                  role="gridcell"
                  aria-label={`${attendee.displayName} ${slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${status}`}
                  title={`${status}`}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
