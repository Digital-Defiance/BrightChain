/**
 * ScheduleCalendar Component
 *
 * Displays a day/week/month calendar view of FHIR R4 Appointment and Slot
 * resources. Appointments render as colored blocks showing patient name,
 * service type, and status. Free slots render as bookable areas. Supports
 * filtering by provider, location, and service type, and emits callbacks
 * on slot/appointment click.
 *
 * @module scheduling/ScheduleCalendar
 */
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import type {
  IAppointmentResource,
  ISlotResource,
} from '@brightchain/brightchart-lib';
import { AppointmentStatus, SlotStatus } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

/** Supported calendar view modes. */
export type CalendarViewMode = 'day' | 'week' | 'month';

/** Optional filters for narrowing displayed items. */
export interface ScheduleCalendarFilters {
  provider?: string;
  location?: string;
  serviceType?: string;
}

export interface ScheduleCalendarProps {
  /** Appointment resources to display as colored blocks. */
  appointments: IAppointmentResource<string>[];
  /** Slot resources to display as bookable areas. */
  slots: ISlotResource<string>[];
  /** Callback when a free slot is clicked. */
  onSlotSelect: (slot: ISlotResource<string>) => void;
  /** Callback when an appointment block is clicked. */
  onAppointmentSelect: (appointment: IAppointmentResource<string>) => void;
  /** Current calendar view mode. */
  viewMode: CalendarViewMode;
  /** Optional filters for provider, location, and service type. */
  filters?: ScheduleCalendarFilters;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a display-friendly patient name from appointment participants. */
function getPatientName(appointment: IAppointmentResource<string>): string {
  const patient = appointment.participant.find(
    (p) =>
      p.actor?.reference?.startsWith('Patient/') ||
      p.type?.some((t) => t.coding?.some((c) => c.code === 'patient') ?? false),
  );
  return patient?.actor?.display ?? 'Unknown Patient';
}

/** Extract service type display text from an appointment. */
function getServiceType(appointment: IAppointmentResource<string>): string {
  const st = appointment.serviceType?.[0];
  return st?.text ?? st?.coding?.[0]?.display ?? '';
}

/** Extract service type display text from a slot. */
function getSlotServiceType(slot: ISlotResource<string>): string {
  const st = slot.serviceType?.[0];
  return st?.text ?? st?.coding?.[0]?.display ?? '';
}

/** Check if an appointment matches the active filters. */
function matchesFilters(
  appointment: IAppointmentResource<string>,
  filters?: ScheduleCalendarFilters,
): boolean {
  if (!filters) return true;

  if (filters.provider) {
    const hasProvider = appointment.participant.some(
      (p) =>
        p.actor?.display
          ?.toLowerCase()
          .includes(filters.provider!.toLowerCase()) ||
        p.actor?.reference?.includes(filters.provider!),
    );
    if (!hasProvider) return false;
  }

  if (filters.location) {
    const hasLocation = appointment.participant.some(
      (p) =>
        p.actor?.reference?.startsWith('Location/') &&
        (p.actor.display
          ?.toLowerCase()
          .includes(filters.location!.toLowerCase()) ||
          p.actor.reference.includes(filters.location!)),
    );
    if (!hasLocation) return false;
  }

  if (filters.serviceType) {
    const st = getServiceType(appointment);
    if (!st.toLowerCase().includes(filters.serviceType.toLowerCase()))
      return false;
  }

  return true;
}

/** Check if a slot matches the active filters. */
function slotMatchesFilters(
  slot: ISlotResource<string>,
  filters?: ScheduleCalendarFilters,
): boolean {
  if (!filters) return true;

  if (filters.serviceType) {
    const st = getSlotServiceType(slot);
    if (st && !st.toLowerCase().includes(filters.serviceType.toLowerCase()))
      return false;
  }

  // Provider/location filtering for slots is done via schedule reference;
  // without the full Schedule resource loaded we pass through.
  return true;
}

/** CSS modifier class for appointment status. */
function statusModifier(status: AppointmentStatus | string): string {
  switch (status) {
    case AppointmentStatus.Booked:
      return 'schedule-calendar__appt--booked';
    case AppointmentStatus.Arrived:
    case AppointmentStatus.CheckedIn:
      return 'schedule-calendar__appt--arrived';
    case AppointmentStatus.Fulfilled:
      return 'schedule-calendar__appt--fulfilled';
    case AppointmentStatus.Cancelled:
      return 'schedule-calendar__appt--cancelled';
    case AppointmentStatus.Noshow:
      return 'schedule-calendar__appt--noshow';
    case AppointmentStatus.Proposed:
    case AppointmentStatus.Pending:
      return 'schedule-calendar__appt--pending';
    case AppointmentStatus.Waitlist:
      return 'schedule-calendar__appt--waitlist';
    default:
      return '';
  }
}

/** Format an ISO instant to a short time string. */
function formatTime(instant?: string): string {
  if (!instant) return '';
  try {
    return new Date(instant).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return instant;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  appointments,
  slots,
  onSlotSelect,
  onAppointmentSelect,
  viewMode: initialViewMode,
  filters,
}) => {
  const [activeView, setActiveView] =
    useState<CalendarViewMode>(initialViewMode);
  const { tEnum } = useBrightChartTranslation();
  const { formatDate } = useFormattedDate();

  // Filter appointments
  const filteredAppointments = useMemo(
    () => appointments.filter((a) => matchesFilters(a, filters)),
    [appointments, filters],
  );

  // Filter slots — only show free/busy-tentative
  const filteredSlots = useMemo(
    () =>
      slots.filter(
        (s) =>
          (s.status === SlotStatus.Free ||
            s.status === SlotStatus.BusyTentative) &&
          slotMatchesFilters(s, filters),
      ),
    [slots, filters],
  );

  // Sort everything by start time
  const sortedAppointments = useMemo(
    () =>
      [...filteredAppointments].sort((a, b) =>
        (a.start ?? '').localeCompare(b.start ?? ''),
      ),
    [filteredAppointments],
  );

  const sortedSlots = useMemo(
    () => [...filteredSlots].sort((a, b) => a.start.localeCompare(b.start)),
    [filteredSlots],
  );

  const handleViewChange = useCallback((mode: CalendarViewMode) => {
    setActiveView(mode);
  }, []);

  const handleSlotClick = useCallback(
    (slot: ISlotResource<string>) => {
      onSlotSelect(slot);
    },
    [onSlotSelect],
  );

  const handleAppointmentClick = useCallback(
    (appointment: IAppointmentResource<string>) => {
      onAppointmentSelect(appointment);
    },
    [onAppointmentSelect],
  );

  const handleSlotKeyDown = useCallback(
    (e: React.KeyboardEvent, slot: ISlotResource<string>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSlotSelect(slot);
      }
    },
    [onSlotSelect],
  );

  const handleAppointmentKeyDown = useCallback(
    (e: React.KeyboardEvent, appointment: IAppointmentResource<string>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onAppointmentSelect(appointment);
      }
    },
    [onAppointmentSelect],
  );

  return (
    <div
      className="schedule-calendar"
      role="region"
      aria-label="Schedule Calendar"
    >
      {/* View mode toggle */}
      <div
        className="schedule-calendar__view-toggle"
        role="group"
        aria-label="Calendar view mode"
      >
        {(['day', 'week', 'month'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`schedule-calendar__view-btn ${activeView === mode ? 'schedule-calendar__view-btn--active' : ''}`}
            onClick={() => handleViewChange(mode)}
            aria-pressed={activeView === mode}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className={`schedule-calendar__grid schedule-calendar__grid--${activeView}`}
        role="grid"
        aria-label={`${activeView} calendar view`}
      >
        {/* Appointments */}
        {sortedAppointments.length === 0 && sortedSlots.length === 0 ? (
          <p className="schedule-calendar__empty" role="status">
            No appointments or available slots for the current view.
          </p>
        ) : (
          <>
            {sortedAppointments.map((appt, idx) => {
              const classes = [
                'schedule-calendar__appt',
                statusModifier(appt.status),
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div
                  key={appt.id ?? `appt-${idx}`}
                  className={classes}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`Appointment: ${getPatientName(appt)}, ${getServiceType(appt) || 'No service type'}, ${appt.status}, ${formatTime(appt.start)} – ${formatTime(appt.end)}`}
                  onClick={() => handleAppointmentClick(appt)}
                  onKeyDown={(e) => handleAppointmentKeyDown(e, appt)}
                >
                  <span className="schedule-calendar__appt-time">
                    {formatTime(appt.start)} – {formatTime(appt.end)}
                  </span>
                  {activeView !== 'day' && (
                    <span className="schedule-calendar__appt-date">
                      {appt.start ? formatDate(appt.start) : ''}
                    </span>
                  )}
                  <span className="schedule-calendar__appt-patient">
                    {getPatientName(appt)}
                  </span>
                  <span className="schedule-calendar__appt-service">
                    {getServiceType(appt)}
                  </span>
                  <span className="schedule-calendar__appt-status">
                    {tEnum(AppointmentStatus, appt.status as AppointmentStatus)}
                  </span>
                </div>
              );
            })}

            {/* Free slots */}
            {sortedSlots.map((slot, idx) => (
              <div
                key={slot.id ?? `slot-${idx}`}
                className="schedule-calendar__slot"
                role="gridcell"
                tabIndex={0}
                aria-label={`Available slot: ${formatTime(slot.start)} – ${formatTime(slot.end)}${getSlotServiceType(slot) ? `, ${getSlotServiceType(slot)}` : ''}`}
                onClick={() => handleSlotClick(slot)}
                onKeyDown={(e) => handleSlotKeyDown(e, slot)}
              >
                <span className="schedule-calendar__slot-time">
                  {formatTime(slot.start)} – {formatTime(slot.end)}
                </span>
                {activeView !== 'day' && (
                  <span className="schedule-calendar__slot-date">
                    {formatDate(slot.start)}
                  </span>
                )}
                {getSlotServiceType(slot) && (
                  <span className="schedule-calendar__slot-service">
                    {getSlotServiceType(slot)}
                  </span>
                )}
                <span className="schedule-calendar__slot-label">Available</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
