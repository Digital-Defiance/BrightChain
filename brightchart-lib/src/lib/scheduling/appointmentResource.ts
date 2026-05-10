/**
 * FHIR R4 Appointment Resource with BrightChain Metadata
 *
 * Defines the `IAppointmentResource<TID>` interface representing a FHIR R4
 * Appointment resource augmented with BrightChain storage metadata.
 * An Appointment represents a booking of one or more Slots for a patient
 * with one or more participants (providers, locations).
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/appointment.html
 * @module scheduling/appointmentResource
 */

import type {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IPeriod,
  IReference,
} from '../fhir/datatypes';
import type { IBrightchainMetadata } from '../fhir/patientResource';
import type { AppointmentParticipant } from './backboneElements';
import type { AppointmentStatus } from './enumerations';

/**
 * FHIR R4 Appointment Resource with BrightChain extensions.
 *
 * Represents a booking of a healthcare event among patient(s), practitioner(s),
 * related person(s), and/or device(s) for a specific date/time.
 *
 * @see https://build.fhir.org/appointment.html
 */
export interface IAppointmentResource<TID = string> {
  /** Fixed value: 'Appointment' */
  resourceType: 'Appointment';

  // --- FHIR metadata fields ---

  /** Logical id of this artifact */
  id?: string;

  /** Metadata about the resource */
  meta?: IMeta;

  /** Text summary of the resource */
  text?: INarrative;

  /** Additional content defined by implementations */
  extension?: IExtension[];

  // --- BrightChain metadata ---

  /** BrightChain storage metadata */
  brightchainMetadata: IBrightchainMetadata<TID>;

  // --- FHIR R4 Appointment fields ---

  /** External identifiers for this item */
  identifier?: IIdentifier<TID>[];

  /** proposed | pending | booked | arrived | fulfilled | cancelled | noshow | entered-in-error | checked-in | waitlist (required) */
  status: AppointmentStatus;

  /** The coded reason for the appointment being cancelled */
  cancelationReason?: ICodeableConcept;

  /** High-level category (e.g. General Practice, Specialist) */
  serviceCategory?: ICodeableConcept[];

  /** Specific service to be performed */
  serviceType?: ICodeableConcept[];

  /** Type of specialty needed */
  specialty?: ICodeableConcept[];

  /** The style of appointment or patient that has been booked in the slot */
  appointmentType?: ICodeableConcept;

  /** Coded reason this appointment is scheduled */
  reasonCode?: ICodeableConcept[];

  /** Reference to the Condition/Procedure/Observation/ImmunizationRecommendation that is the reason */
  reasonReference?: IReference<TID>[];

  /** Used to make informed decisions if needing to re-prioritize (0 = undefined priority) */
  priority?: number;

  /** Shown on a subject line in a meeting request, or appointment list */
  description?: string;

  /** Additional information to support the appointment */
  supportingInformation?: IReference<TID>[];

  /** When appointment is to take place (instant) */
  start?: string;

  /** When appointment is to conclude (instant) */
  end?: string;

  /** Can be less than start/end (e.g. estimate) */
  minutesDuration?: number;

  /** The slots that this appointment is filling */
  slot?: IReference<TID>[];

  /** The date that this appointment was initially created (dateTime) */
  created?: string;

  /** Additional comments */
  comment?: string;

  /** Detailed information and instructions for the patient */
  patientInstruction?: string;

  /** The service request this appointment is allocated to assess (references to ServiceRequest) */
  basedOn?: IReference<TID>[];

  /** Participants involved in appointment (required) */
  participant: AppointmentParticipant<TID>[];

  /** Potential date/time interval(s) requested to allocate the appointment within */
  requestedPeriod?: IPeriod[];
}
