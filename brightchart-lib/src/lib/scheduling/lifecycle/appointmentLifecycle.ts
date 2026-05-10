/**
 * Appointment Lifecycle Interface and FHIR Status Transitions
 *
 * Defines the `IAppointmentLifecycle<TID>` interface governing appointment
 * status transitions per the FHIR R4 appointment state machine, and exports
 * the default transition map as `APPOINTMENT_STATUS_TRANSITIONS`.
 *
 * @see https://build.fhir.org/valueset-appointmentstatus.html
 * @module scheduling/lifecycle/appointmentLifecycle
 */

import type { IAppointmentResource } from '../appointmentResource';
import { AppointmentStatus } from '../enumerations';

/**
 * Valid FHIR R4 appointment status transitions.
 *
 * Each key is a source status; its value is the array of statuses
 * reachable from that source. Every status can transition to
 * `entered-in-error` (included explicitly in each entry).
 *
 * @see Requirement 6.2
 */
export const APPOINTMENT_STATUS_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  [AppointmentStatus.Proposed]: [
    AppointmentStatus.Pending,
    AppointmentStatus.Cancelled,
    AppointmentStatus.EnteredInError,
  ],
  [AppointmentStatus.Pending]: [
    AppointmentStatus.Booked,
    AppointmentStatus.Cancelled,
    AppointmentStatus.EnteredInError,
  ],
  [AppointmentStatus.Booked]: [
    AppointmentStatus.Arrived,
    AppointmentStatus.Cancelled,
    AppointmentStatus.Noshow,
    AppointmentStatus.EnteredInError,
  ],
  [AppointmentStatus.Arrived]: [
    AppointmentStatus.Fulfilled,
    AppointmentStatus.Cancelled,
    AppointmentStatus.EnteredInError,
  ],
  [AppointmentStatus.Fulfilled]: [AppointmentStatus.EnteredInError],
  [AppointmentStatus.Cancelled]: [AppointmentStatus.EnteredInError],
  [AppointmentStatus.Noshow]: [AppointmentStatus.EnteredInError],
  [AppointmentStatus.EnteredInError]: [],
  [AppointmentStatus.CheckedIn]: [
    AppointmentStatus.Arrived,
    AppointmentStatus.EnteredInError,
  ],
  [AppointmentStatus.Waitlist]: [
    AppointmentStatus.Proposed,
    AppointmentStatus.Booked,
    AppointmentStatus.Cancelled,
    AppointmentStatus.EnteredInError,
  ],
};

/**
 * Appointment lifecycle state machine interface.
 *
 * Provides status transition validation and execution for FHIR R4
 * appointment statuses. Implementations apply transitions and return
 * the updated appointment with the new status.
 *
 * @typeParam TID - Identifier type (defaults to `string`)
 *
 * @see Requirement 6.1, 6.3, 6.4
 */
export interface IAppointmentLifecycle<TID = string> {
  /**
   * Check whether a status transition is valid.
   *
   * @param from - Current appointment status
   * @param to   - Desired target status
   * @returns `true` if the transition is allowed
   *
   * @see Requirement 6.1
   */
  isValidTransition(from: AppointmentStatus, to: AppointmentStatus): boolean;

  /**
   * Apply a status transition to an appointment.
   *
   * On success the returned appointment has `status` set to `to`.
   * Implementations should throw or return an error when the
   * transition is invalid.
   *
   * When transitioning to "arrived", implementations should support
   * creating a linked Encounter via the Appointment-Encounter bridge.
   *
   * @param appointment - The appointment to transition
   * @param to          - Desired target status
   * @returns Updated appointment with the new status
   *
   * @see Requirement 6.1, 6.3
   */
  transition(
    appointment: IAppointmentResource<TID>,
    to: AppointmentStatus,
  ): IAppointmentResource<TID>;
}
