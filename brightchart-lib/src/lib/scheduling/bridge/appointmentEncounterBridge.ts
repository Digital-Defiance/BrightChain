/**
 * Appointment-Encounter Bridge Interface
 *
 * Defines the `IAppointmentEncounterBridge<TID>` interface that connects
 * the scheduling workflow to the clinical encounter workflow. When a
 * patient arrives (appointment status → "arrived"), the bridge creates
 * an Encounter from the Appointment data and supports bidirectional
 * lookup between the two resources.
 *
 * @see https://build.fhir.org/appointment.html
 * @see https://build.fhir.org/encounter.html
 * @module scheduling/bridge/appointmentEncounterBridge
 */

import type { IEncounterResource } from '../../encounter/encounterResource';
import type { IAppointmentResource } from '../appointmentResource';

/**
 * Appointment-Encounter bridge interface.
 *
 * Bridges the scheduling and clinical workflows by creating Encounters
 * from Appointments at check-in time and providing bidirectional lookup
 * between the two resource types.
 *
 * When an Encounter is created from an Appointment, the bridge populates:
 * - `subject` from the Appointment's patient participant
 * - `class` from the Appointment's serviceCategory/serviceType
 * - `period.start` from the current time
 * - `participant` from the Appointment's participants
 * - `appointment` reference pointing back to the Appointment
 *
 * @typeParam TID - Identifier type (defaults to `string`)
 *
 * @see Requirement 7.1, 7.2, 7.3, 7.4
 */
export interface IAppointmentEncounterBridge<TID = string> {
  /**
   * Create an Encounter from an Appointment when the patient arrives.
   *
   * The created Encounter is populated from the Appointment data per
   * the mapping rules described in Requirement 7.2.
   *
   * @param appointment - The appointment to create an encounter from
   * @param memberId    - The BrightChain member ID for ownership
   * @returns The newly created Encounter resource
   *
   * @see Requirement 7.1, 7.2
   */
  createEncounterFromAppointment(
    appointment: IAppointmentResource<TID>,
    memberId: TID,
  ): Promise<IEncounterResource<TID>>;

  /**
   * Look up the Encounter created for a given Appointment.
   *
   * @param appointmentId - The logical id of the Appointment
   * @returns The encounter id if one exists, or `null`
   *
   * @see Requirement 7.1, 7.3
   */
  getEncounterForAppointment(appointmentId: string): Promise<string | null>;

  /**
   * Look up the Appointment that originated a given Encounter.
   *
   * @param encounterId - The logical id of the Encounter
   * @returns The appointment id if one exists, or `null`
   *
   * @see Requirement 7.1, 7.3
   */
  getAppointmentForEncounter(encounterId: string): Promise<string | null>;
}
