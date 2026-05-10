/**
 * FHIR R4 Encounter Resource with BrightChain Metadata
 *
 * Defines the `IEncounterResource<TID>` interface representing a FHIR R4
 * Encounter resource augmented with BrightChain storage metadata.
 * Supports inpatient, outpatient, emergency, telehealth, dental,
 * and veterinary encounters.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/encounter.html
 * @module encounter/encounterResource
 */

import { IQuantity } from '../clinical/datatypes';
import {
  ICodeableConcept,
  ICoding,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IPeriod,
  IReference,
} from '../fhir/datatypes';
import { IBrightchainMetadata } from '../fhir/patientResource';
import {
  EncounterClassHistory,
  EncounterDiagnosis,
  EncounterHospitalization,
  EncounterLocation,
  EncounterParticipant,
  EncounterStatusHistory,
} from './backboneElements';
import { EncounterStatus } from './enumerations';

/**
 * FHIR R4 Duration datatype.
 *
 * A length of time expressed as a Quantity with UCUM time units.
 * Structurally identical to IQuantity but semantically constrained
 * to time-based units (s, min, h, d, wk, mo, a).
 *
 * @see https://build.fhir.org/datatypes.html#Duration
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IDuration extends IQuantity {}

/**
 * FHIR R4 Encounter Resource with BrightChain extensions.
 *
 * Represents an interaction between a patient and healthcare provider(s)
 * for the purpose of providing healthcare services or assessing health status.
 *
 * @see https://build.fhir.org/encounter.html
 */
export interface IEncounterResource<TID = string> {
  /** Fixed value: 'Encounter' */
  resourceType: 'Encounter';

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

  // --- FHIR R4 Encounter fields ---

  /** An identifier for this encounter */
  identifier?: IIdentifier<TID>[];

  /** planned | arrived | triaged | in-progress | onleave | finished | cancelled | entered-in-error | unknown (required) */
  status: EncounterStatus;

  /** List of past encounter statuses */
  statusHistory?: EncounterStatusHistory[];

  /** Classification of patient encounter (required) — e.g. inpatient, outpatient, ambulatory, emergency */
  class: ICoding;

  /** List of past encounter classes */
  classHistory?: EncounterClassHistory[];

  /** Specific type of encounter (e.g. consultation, follow-up) */
  type?: ICodeableConcept[];

  /** Specific type of service */
  serviceType?: ICodeableConcept;

  /** Indicates the urgency of the encounter */
  priority?: ICodeableConcept;

  /** The patient or group present at the encounter (Patient reference) */
  subject?: IReference<TID>;

  /** Episode(s) of care that this encounter should be recorded against */
  episodeOfCare?: IReference<TID>[];

  /** The ServiceRequest that initiated this encounter */
  basedOn?: IReference<TID>[];

  /** List of participants involved in the encounter */
  participant?: EncounterParticipant<TID>[];

  /** The appointment that scheduled this encounter */
  appointment?: IReference<TID>[];

  /** The start and end time of the encounter */
  period?: IPeriod;

  /** Quantity of time the encounter lasted (up to 24h resolution) */
  length?: IDuration;

  /** Coded reason the encounter takes place */
  reasonCode?: ICodeableConcept[];

  /** Reason the encounter takes place (reference) — Condition, Procedure, Observation, or ImmunizationRecommendation */
  reasonReference?: IReference<TID>[];

  /** The list of diagnosis relevant to this encounter */
  diagnosis?: EncounterDiagnosis<TID>[];

  /** The set of accounts that may be used for billing for this encounter */
  account?: IReference<TID>[];

  /** Details about the admission to a healthcare service */
  hospitalization?: EncounterHospitalization<TID>;

  /** List of locations where the patient has been */
  location?: EncounterLocation<TID>[];

  /** The organization (facility) responsible for this encounter */
  serviceProvider?: IReference<TID>;

  /** Another Encounter this encounter is part of */
  partOf?: IReference<TID>;
}
