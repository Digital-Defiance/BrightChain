/**
 * AppointmentBookingForm Component
 *
 * A React form for booking or rescheduling FHIR R4 Appointments.
 * Provides searchable patient/provider inputs, slot selection from
 * available slots, service type selection (optionally driven by a
 * specialty profile), reason, priority, notes, and inline validation.
 *
 * On submit the form emits a complete IAppointmentResource<string>
 * with status "booked".
 *
 * @module scheduling/AppointmentBookingForm
 */
import type {
  IAppointmentResource,
  ISchedulingSpecialtyExtension,
  ISlotResource,
} from '@brightchain/brightchart-lib';
import {
  AppointmentStatus,
  BrightChartStrings,
  ParticipationStatus,
} from '@brightchain/brightchart-lib';
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AppointmentBookingFormProps {
  /** Callback emitting the built appointment on valid submission. */
  onSubmit: (appointment: IAppointmentResource<string>) => void;
  /** When provided the form pre-fills for rescheduling. */
  appointment?: IAppointmentResource<string>;
  /** Available slots the user can choose from. */
  availableSlots: ISlotResource<string>[];
  /** Optional specialty profile for service type options and durations. */
  specialtyProfile?: ISchedulingSpecialtyExtension;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO instant to a readable time string. */
function formatSlotTime(instant: string): string {
  try {
    return new Date(instant).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return instant;
  }
}

/** Extract patient display name from an existing appointment. */
function extractPatient(appt?: IAppointmentResource<string>): string {
  if (!appt) return '';
  const p = appt.participant.find(
    (pt) =>
      pt.actor?.reference?.startsWith('Patient/') ||
      pt.type?.some(
        (t) => t.coding?.some((c) => c.code === 'patient') ?? false,
      ),
  );
  return p?.actor?.display ?? '';
}

/** Extract provider display name from an existing appointment. */
function extractProvider(appt?: IAppointmentResource<string>): string {
  if (!appt) return '';
  const p = appt.participant.find(
    (pt) =>
      pt.actor?.reference?.startsWith('Practitioner/') ||
      pt.type?.some(
        (t) => t.coding?.some((c) => c.code === 'practitioner') ?? false,
      ),
  );
  return p?.actor?.display ?? '';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface FormErrors {
  patient?: string;
  provider?: string;
  slot?: string;
  serviceType?: string;
}

function validate(
  patient: string,
  provider: string,
  selectedSlotId: string,
): FormErrors {
  const errors: FormErrors = {};
  if (!patient.trim()) errors.patient = 'Patient is required';
  if (!provider.trim()) errors.provider = 'Provider is required';
  if (!selectedSlotId) errors.slot = 'A slot must be selected';
  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AppointmentBookingForm: React.FC<AppointmentBookingFormProps> = ({
  onSubmit,
  appointment,
  availableSlots,
  specialtyProfile,
}) => {
  const { t } = useBrightChartTranslation();
  const { formatDateTime } = useFormattedDate();

  /** Format an ISO instant to a readable date + time string using the hook. */
  const formatSlotDateTime = useCallback(
    (instant: string): string => {
      try {
        return formatDateTime(instant);
      } catch {
        return instant;
      }
    },
    [formatDateTime],
  );

  // Form state
  const [patient, setPatient] = useState('');
  const [provider, setProvider] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState(0);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill when rescheduling
  useEffect(() => {
    if (appointment) {
      setPatient(extractPatient(appointment));
      setProvider(extractProvider(appointment));
      setServiceType(
        appointment.serviceType?.[0]?.text ??
          appointment.serviceType?.[0]?.coding?.[0]?.display ??
          '',
      );
      setReason(
        appointment.reasonCode?.[0]?.text ??
          appointment.reasonCode?.[0]?.coding?.[0]?.display ??
          '',
      );
      setPriority(appointment.priority ?? 0);
      setNotes(appointment.comment ?? '');
    }
  }, [appointment]);

  // Service type options from specialty profile
  const serviceTypeOptions = useMemo(() => {
    if (!specialtyProfile) return [];
    return specialtyProfile.appointmentTypeExtensions.map(
      (cc) => cc.text ?? cc.coding?.[0]?.display ?? '',
    );
  }, [specialtyProfile]);

  // Slot filtering (simple text search on date/time)
  const [slotFilter, setSlotFilter] = useState('');
  const filteredSlots = useMemo(() => {
    if (!slotFilter.trim()) return availableSlots;
    const lower = slotFilter.toLowerCase();
    return availableSlots.filter(
      (s) =>
        formatSlotDateTime(s.start).toLowerCase().includes(lower) ||
        formatSlotDateTime(s.end).toLowerCase().includes(lower),
    );
  }, [availableSlots, slotFilter]);

  // Build the appointment resource on submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);

      const formErrors = validate(patient, provider, selectedSlotId);
      setErrors(formErrors);
      if (Object.keys(formErrors).length > 0) return;

      const selectedSlot = availableSlots.find((s) => s.id === selectedSlotId);

      const now = new Date().toISOString();

      const built: IAppointmentResource<string> = {
        resourceType: 'Appointment',
        status: AppointmentStatus.Booked,
        brightchainMetadata: appointment?.brightchainMetadata ?? {
          blockId: '',
          creatorMemberId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          poolId: '',
          encryptionType: 0 as never,
        },
        participant: [
          {
            actor: { reference: `Patient/${patient}`, display: patient },
            status: ParticipationStatus.Accepted,
            type: [{ coding: [{ code: 'patient', display: 'Patient' }] }],
          },
          {
            actor: { reference: `Practitioner/${provider}`, display: provider },
            status: ParticipationStatus.Accepted,
            type: [
              { coding: [{ code: 'practitioner', display: 'Practitioner' }] },
            ],
          },
        ],
        start: selectedSlot?.start,
        end: selectedSlot?.end,
        slot: selectedSlot
          ? [{ reference: `Slot/${selectedSlot.id}` }]
          : undefined,
        serviceType: serviceType ? [{ text: serviceType }] : undefined,
        reasonCode: reason ? [{ text: reason }] : undefined,
        priority: priority || undefined,
        comment: notes || undefined,
        created: appointment?.created ?? now,
        ...(appointment?.id ? { id: appointment.id } : {}),
      };

      onSubmit(built);
    },
    [
      patient,
      provider,
      selectedSlotId,
      serviceType,
      reason,
      priority,
      notes,
      availableSlots,
      appointment,
      onSubmit,
    ],
  );

  // Re-validate on change after first submit attempt
  useEffect(() => {
    if (submitted) {
      setErrors(validate(patient, provider, selectedSlotId));
    }
  }, [patient, provider, selectedSlotId, submitted]);

  return (
    <form
      className="appointment-booking-form"
      onSubmit={handleSubmit}
      aria-label="Appointment Booking Form"
      noValidate
    >
      {/* Patient */}
      <div className="appointment-booking-form__field">
        <label htmlFor="abf-patient">Patient</label>
        <input
          id="abf-patient"
          type="text"
          value={patient}
          onChange={(e) => setPatient(e.target.value)}
          placeholder="Search patient…"
          aria-required="true"
          aria-invalid={!!errors.patient}
          aria-describedby={errors.patient ? 'abf-patient-error' : undefined}
        />
        {errors.patient && (
          <span
            id="abf-patient-error"
            className="appointment-booking-form__error"
            role="alert"
          >
            {errors.patient}
          </span>
        )}
      </div>

      {/* Provider */}
      <div className="appointment-booking-form__field">
        <label htmlFor="abf-provider">Provider</label>
        <input
          id="abf-provider"
          type="text"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          placeholder="Search provider…"
          aria-required="true"
          aria-invalid={!!errors.provider}
          aria-describedby={errors.provider ? 'abf-provider-error' : undefined}
        />
        {errors.provider && (
          <span
            id="abf-provider-error"
            className="appointment-booking-form__error"
            role="alert"
          >
            {errors.provider}
          </span>
        )}
      </div>

      {/* Slot selection */}
      <fieldset className="appointment-booking-form__field">
        <legend>Select Slot</legend>
        <input
          id="abf-slot-filter"
          type="text"
          value={slotFilter}
          onChange={(e) => setSlotFilter(e.target.value)}
          placeholder="Filter slots…"
          aria-label="Filter available slots"
        />
        {errors.slot && (
          <span
            id="abf-slot-error"
            className="appointment-booking-form__error"
            role="alert"
          >
            {errors.slot}
          </span>
        )}
        <div
          className="appointment-booking-form__slots"
          role="radiogroup"
          aria-label="Available time slots"
          aria-required="true"
          aria-invalid={!!errors.slot}
          aria-describedby={errors.slot ? 'abf-slot-error' : undefined}
        >
          {filteredSlots.length === 0 ? (
            <p role="status">No available slots.</p>
          ) : (
            filteredSlots.map((slot, idx) => {
              const slotId = slot.id ?? `slot-${idx}`;
              return (
                <label
                  key={slotId}
                  className="appointment-booking-form__slot-option"
                >
                  <input
                    type="radio"
                    name="slot"
                    value={slotId}
                    checked={selectedSlotId === slotId}
                    onChange={() => setSelectedSlotId(slotId)}
                    aria-label={`Slot: ${formatSlotTime(slot.start)} – ${formatSlotTime(slot.end)}`}
                  />
                  <span>
                    {formatSlotDateTime(slot.start)} –{' '}
                    {formatSlotTime(slot.end)}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </fieldset>

      {/* Service type */}
      <div className="appointment-booking-form__field">
        <label htmlFor="abf-service-type">Service Type</label>
        {serviceTypeOptions.length > 0 ? (
          <select
            id="abf-service-type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          >
            <option value="">— Select —</option>
            {serviceTypeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="abf-service-type"
            type="text"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="Service type"
          />
        )}
      </div>

      {/* Reason */}
      <div className="appointment-booking-form__field">
        <label htmlFor="abf-reason">Reason</label>
        <input
          id="abf-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for appointment"
        />
      </div>

      {/* Priority */}
      <div className="appointment-booking-form__field">
        <label htmlFor="abf-priority">Priority</label>
        <input
          id="abf-priority"
          type="number"
          min={0}
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
        />
      </div>

      {/* Notes */}
      <div className="appointment-booking-form__field">
        <label htmlFor="abf-notes">Notes</label>
        <textarea
          id="abf-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes"
        />
      </div>

      {/* Submit */}
      <button type="submit" className="appointment-booking-form__submit">
        {appointment
          ? t(BrightChartStrings.Form_RescheduleAppointment)
          : t(BrightChartStrings.Form_BookAppointment)}
      </button>
    </form>
  );
};
