import type {
  IAppointmentTypeDTO,
  IBookingPageDTO,
} from '@brightchain/brightcal-lib';
import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useCallback } from 'react';

/**
 * A time slot available for booking.
 */
export interface BookingSlot {
  start: string; // ISO 8601
  end: string; // ISO 8601
}

/**
 * Props for the BookingPageView component.
 */
export interface BookingPageViewProps {
  /** Booking page configuration */
  bookingPage: IBookingPageDTO;
  /** Currently selected date */
  selectedDate: Date;
  /** Selected appointment type */
  appointmentType: IAppointmentTypeDTO;
  /** Available time slots for the selected date */
  slots: BookingSlot[];
  /** Callback when a slot is selected */
  onSlotSelect: (slot: BookingSlot) => void;
  /** Callback when the selected date changes */
  onDateChange: (date: Date) => void;
}

/**
 * BookingPageView displays a public booking page with available time slots.
 * Users can select a date and pick an available slot to book an appointment.
 *
 * Requirements: 9.2, 9.9
 */
export function BookingPageView({
  bookingPage,
  selectedDate,
  appointmentType,
  slots,
  onSlotSelect,
  onDateChange,
}: BookingPageViewProps) {
  const { tBranded: t } = useI18n();
  const { formatDate } = useFormattedDate();
  const handlePreviousDay = useCallback(() => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev);
  }, [selectedDate, onDateChange]);

  const handleNextDay = useCallback(() => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
  }, [selectedDate, onDateChange]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="brightcal-booking-page"
      role="region"
      aria-label={t(BrightCalStrings.Label_BookingPage)}
    >
      <header className="brightcal-booking-header">
        <h2>{bookingPage.title}</h2>
        {bookingPage.description && <p>{bookingPage.description}</p>}
        <p className="brightcal-booking-type">
          {appointmentType.name} — {appointmentType.durationMinutes} min
        </p>
      </header>

      <nav
        className="brightcal-booking-date-nav"
        aria-label={t(BrightCalStrings.Label_DateNavigation)}
      >
        <button
          type="button"
          onClick={handlePreviousDay}
          aria-label={t(BrightCalStrings.Action_PreviousDay)}
        >
          ←
        </button>
        <span>
          {formatDate(selectedDate)}
        </span>
        <button
          type="button"
          onClick={handleNextDay}
          aria-label={t(BrightCalStrings.Action_NextDay)}
        >
          →
        </button>
      </nav>

      <div
        className="brightcal-booking-slots"
        role="list"
        aria-label={t(BrightCalStrings.Label_AvailableSlots)}
      >
        {slots.length === 0 ? (
          <p className="brightcal-booking-no-slots">
            {t(BrightCalStrings.Status_NoAvailableSlots)}
          </p>
        ) : (
          slots.map((slot) => (
            <button
              key={slot.start}
              type="button"
              className="brightcal-booking-slot"
              role="listitem"
              onClick={() => onSlotSelect(slot)}
              aria-label={`Book ${formatTime(slot.start)} - ${formatTime(slot.end)}`}
            >
              {formatTime(slot.start)} — {formatTime(slot.end)}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
