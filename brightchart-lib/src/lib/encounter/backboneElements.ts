/**
 * FHIR R4 Encounter Backbone Elements
 *
 * Exported TypeScript interfaces for backbone elements used by the
 * Encounter resource: EncounterParticipant, EncounterDiagnosis,
 * EncounterHospitalization, EncounterLocation, EncounterStatusHistory,
 * and EncounterClassHistory.
 *
 * Interfaces containing IReference fields are generic on `<TID = string>`
 * to support both frontend (string) and backend (Uint8Array) usage.
 *
 * @see https://build.fhir.org/encounter.html
 * @module encounter/backboneElements
 */

import {
  ICodeableConcept,
  ICoding,
  IIdentifier,
  IPeriod,
  IReference,
} from '../fhir/datatypes';
import { EncounterLocationStatus, EncounterStatus } from './enumerations';

/**
 * FHIR R4 Encounter.participant backbone element
 * Practitioners or other individuals involved in the encounter.
 * Generic on TID because individual is an IReference field.
 * @see https://build.fhir.org/encounter-definitions.html#Encounter.participant
 */
export interface EncounterParticipant<TID = string> {
  /** Role of participant in encounter */
  type?: ICodeableConcept[];
  /** Period of time during the encounter that the participant participated */
  period?: IPeriod;
  /** Persons involved in the encounter other than the patient */
  individual?: IReference<TID>;
}

/**
 * FHIR R4 Encounter.diagnosis backbone element
 * The list of diagnosis relevant to this encounter.
 * Generic on TID because condition is an IReference field.
 * @see https://build.fhir.org/encounter-definitions.html#Encounter.diagnosis
 */
export interface EncounterDiagnosis<TID = string> {
  /** The diagnosis or procedure relevant to the encounter (required) */
  condition: IReference<TID>;
  /** Role that this diagnosis has within the encounter (e.g. admission, billing, discharge) */
  use?: ICodeableConcept;
  /** Ranking of the diagnosis (for each role type) */
  rank?: number;
}

/**
 * FHIR R4 Encounter.hospitalization backbone element
 * Details about the admission to a healthcare service.
 * Generic on TID because origin and destination are IReference fields.
 * @see https://build.fhir.org/encounter-definitions.html#Encounter.hospitalization
 */
export interface EncounterHospitalization<TID = string> {
  /** Pre-admission identifier */
  preAdmissionIdentifier?: IIdentifier<TID>;
  /** The location/organization from which the patient came before admission */
  origin?: IReference<TID>;
  /** From where patient was admitted (physician referral, transfer) */
  admitSource?: ICodeableConcept;
  /** The type of hospital re-admission that has occurred (if any) */
  reAdmission?: ICodeableConcept;
  /** Diet preferences reported by the patient */
  dietPreference?: ICodeableConcept[];
  /** Special courtesies (VIP, board member) */
  specialCourtesy?: ICodeableConcept[];
  /** Wheelchair, translator, stretcher, etc. */
  specialArrangement?: ICodeableConcept[];
  /** Location/organization to which the patient is discharged */
  destination?: IReference<TID>;
  /** Category or kind of location after discharge */
  dischargeDisposition?: ICodeableConcept;
}

/**
 * FHIR R4 Encounter.location backbone element
 * List of locations where the patient has been during this encounter.
 * Generic on TID because location is an IReference field.
 * @see https://build.fhir.org/encounter-definitions.html#Encounter.location
 */
export interface EncounterLocation<TID = string> {
  /** Location the encounter takes place (required) */
  location: IReference<TID>;
  /** planned | active | reserved | completed */
  status?: EncounterLocationStatus;
  /** The physical type of the location (e.g. ward, bed, room) */
  physicalType?: ICodeableConcept;
  /** Time period during which the patient was present at the location */
  period?: IPeriod;
}

/**
 * FHIR R4 Encounter.statusHistory backbone element
 * The status history permits the encounter resource to contain the
 * status history without needing to read through the historical
 * versions of the resource.
 * @see https://build.fhir.org/encounter-definitions.html#Encounter.statusHistory
 */
export interface EncounterStatusHistory {
  /** planned | arrived | triaged | in-progress | onleave | finished | cancelled | entered-in-error | unknown (required) */
  status: EncounterStatus;
  /** The time that the episode was in the specified status (required) */
  period: IPeriod;
}

/**
 * FHIR R4 Encounter.classHistory backbone element
 * The class history permits the tracking of the encounters transitions
 * without needing to go through the resource history.
 * @see https://build.fhir.org/encounter-definitions.html#Encounter.classHistory
 */
export interface EncounterClassHistory {
  /** inpatient | outpatient | ambulatory | emergency+ (required) */
  class: ICoding;
  /** The time that the episode was in the specified class (required) */
  period: IPeriod;
}
