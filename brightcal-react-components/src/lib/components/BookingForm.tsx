import type {
  IAppointmentTypeDTO,
  IBookingQuestion,
} from '@brightchain/brightcal-lib';
import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import React, { useCallback, useState } from 'react';
import type { BookingSlot } from './BookingPageView';

/**
 * Data submitted by the booking form.
 */
export interface BookingFormData {
  name: string;
  email: string;
  answers: Record<string, string>;
}

/**
 * Props for the BookingForm component.
 */
export interface BookingFormProps {
  /** The appointment type being booked */
  appointmentType: IAppointmentTypeDTO;
  /** The selected time slot */
  selectedSlot: BookingSlot;
  /** Custom questions from the booking page config */
  questions: IBookingQuestion[];
  /** Callback when the form is submitted */
  onSubmit: (data: BookingFormData) => void;
  /** Callback when the user cancels */
  onCancel: () => void;
}

/**
 * BookingForm collects booker information (name, email, custom questions)
 * and submits a booking request.
 *
 * Requirements: 9.3, 9.5, 9.9
 */
export function BookingForm({
  appointmentType,
  selectedSlot,
  questions,
  onSubmit,
  onCancel,
}: BookingFormProps) {
  const { tBranded: t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswerChange = useCallback((label: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [label]: value }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({ name, email, answers });
    },
    [name, email, answers, onSubmit],
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <form
      className="brightcal-booking-form"
      onSubmit={handleSubmit}
      aria-label={t(BrightCalStrings.Label_BookingForm)}
    >
      <div className="brightcal-booking-form-summary">
        <p>
          {appointmentType.name} — {appointmentType.durationMinutes} min
        </p>
        <p>
          {formatTime(selectedSlot.start)} — {formatTime(selectedSlot.end)}
        </p>
      </div>

      <div className="brightcal-booking-form-field">
        <label htmlFor="booking-name">{t(BrightCalStrings.Label_Name)}</label>
        <input
          id="booking-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="brightcal-booking-form-field">
        <label htmlFor="booking-email">{t(BrightCalStrings.Label_Email)}</label>
        <input
          id="booking-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {questions.map((q) => (
        <div key={q.label} className="brightcal-booking-form-field">
          <label htmlFor={`booking-q-${q.label}`}>{q.label}</label>
          {q.type === 'textarea' ? (
            <textarea
              id={`booking-q-${q.label}`}
              value={answers[q.label] ?? ''}
              onChange={(e) => handleAnswerChange(q.label, e.target.value)}
              required={q.required}
            />
          ) : (
            <input
              id={`booking-q-${q.label}`}
              type={q.type}
              value={answers[q.label] ?? ''}
              onChange={(e) => handleAnswerChange(q.label, e.target.value)}
              required={q.required}
            />
          )}
        </div>
      ))}

      <div className="brightcal-booking-form-actions">
        <button type="submit">
          {t(BrightCalStrings.Action_ConfirmBooking)}
        </button>
        <button type="button" onClick={onCancel}>
          {t(BrightCalStrings.Action_Cancel)}
        </button>
      </div>
    </form>
  );
}
