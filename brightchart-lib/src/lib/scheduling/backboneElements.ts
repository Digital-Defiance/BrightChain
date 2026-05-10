/**
 * FHIR R4 Scheduling Backbone Elements
 *
 * Exported TypeScript interface for the Appointment.participant backbone
 * element used by the Appointment resource.
 *
 * The interface is generic on `<TID = string>` to support both frontend
 * (string) and backend (Uint8Array) usage.
 *
 * @see https://build.fhir.org/appointment-definitions.html#Appointment.participant
 * @module scheduling/backboneElements
 */

import type { ICodeableConcept, IPeriod, IReference } from '../fhir/datatypes';
import { ParticipantRequired, ParticipationStatus } from './enumerations';

/**
 * FHIR R4 Appointment.participant backbone element
 *
 * Represents a participant in an appointment — a patient, practitioner,
 * related person, device, healthcare service, or location.
 *
 * Generic on TID because actor is an IReference field.
 * @see https://build.fhir.org/appointment-definitions.html#Appointment.participant
 */
export interface AppointmentParticipant<TID = string> {
  /** Role of participant in the appointment */
  type?: ICodeableConcept[];
  /** Person, Location/HealthcareService or Device */
  actor?: IReference<TID>;
  /** required | optional | information-only */
  required?: ParticipantRequired;
  /** accepted | declined | tentative | needs-action (required) */
  status: ParticipationStatus;
  /** Participation period of the actor */
  period?: IPeriod;
}
