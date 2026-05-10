/**
 * Scheduling Enumerations
 *
 * FHIR R4 scheduling status codes for appointments, slots, participants,
 * and BrightChart-specific waitlist and reminder enumerations.
 *
 * @see https://build.fhir.org/valueset-appointmentstatus.html
 * @see https://build.fhir.org/valueset-slotstatus.html
 * @see https://build.fhir.org/valueset-participantrequired.html
 * @see https://build.fhir.org/valueset-participationstatus.html
 * @module scheduling/enumerations
 */

/**
 * FHIR R4 Appointment status codes (required binding).
 * @see https://build.fhir.org/valueset-appointmentstatus.html
 */
export enum AppointmentStatus {
  Proposed = 'proposed',
  Pending = 'pending',
  Booked = 'booked',
  Arrived = 'arrived',
  Fulfilled = 'fulfilled',
  Cancelled = 'cancelled',
  Noshow = 'noshow',
  EnteredInError = 'entered-in-error',
  CheckedIn = 'checked-in',
  Waitlist = 'waitlist',
}

/**
 * FHIR R4 Slot status codes (required binding).
 * @see https://build.fhir.org/valueset-slotstatus.html
 */
export enum SlotStatus {
  Busy = 'busy',
  Free = 'free',
  BusyUnavailable = 'busy-unavailable',
  BusyTentative = 'busy-tentative',
  EnteredInError = 'entered-in-error',
}

/**
 * FHIR R4 Participant required codes (required binding).
 * @see https://build.fhir.org/valueset-participantrequired.html
 */
export enum ParticipantRequired {
  Required = 'required',
  Optional = 'optional',
  InformationOnly = 'information-only',
}

/**
 * FHIR R4 Participation status codes (required binding).
 * @see https://build.fhir.org/valueset-participationstatus.html
 */
export enum ParticipationStatus {
  Accepted = 'accepted',
  Declined = 'declined',
  Tentative = 'tentative',
  NeedsAction = 'needs-action',
}

/**
 * BrightChart waitlist entry status codes.
 */
export enum WaitlistEntryStatus {
  Waiting = 'waiting',
  Offered = 'offered',
  Booked = 'booked',
  Cancelled = 'cancelled',
  Expired = 'expired',
}

/**
 * BrightChart appointment reminder delivery types.
 */
export enum ReminderType {
  Sms = 'sms',
  Email = 'email',
  Push = 'push',
  Phone = 'phone',
}

/**
 * BrightChart appointment reminder status codes.
 */
export enum ReminderStatus {
  Scheduled = 'scheduled',
  Sent = 'sent',
  Failed = 'failed',
  Cancelled = 'cancelled',
}
