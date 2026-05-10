/**
 * Encounter Enumerations and Constants
 *
 * FHIR R4 encounter status codes, location status codes, diagnosis role
 * constants, and HL7 v3 ActCode encounter class constants.
 *
 * @see https://www.hl7.org/fhir/codesystem-encounter-status.html
 * @see https://www.hl7.org/fhir/codesystem-encounter-location-status.html
 * @see http://terminology.hl7.org/CodeSystem/v3-ActCode
 * @see http://terminology.hl7.org/CodeSystem/diagnosis-role
 * @module encounter/enumerations
 */

import { ICoding } from '../fhir/datatypes';

/**
 * FHIR R4 Encounter status codes (required binding).
 * @see https://www.hl7.org/fhir/codesystem-encounter-status.html
 */
export enum EncounterStatus {
  Planned = 'planned',
  Arrived = 'arrived',
  Triaged = 'triaged',
  InProgress = 'in-progress',
  OnLeave = 'onleave',
  Finished = 'finished',
  Cancelled = 'cancelled',
  EnteredInError = 'entered-in-error',
  Unknown = 'unknown',
}

/**
 * FHIR R4 Encounter location status codes (required binding).
 * @see https://www.hl7.org/fhir/codesystem-encounter-location-status.html
 */
export enum EncounterLocationStatus {
  Planned = 'planned',
  Active = 'active',
  Reserved = 'reserved',
  Completed = 'completed',
}

// ---------------------------------------------------------------------------
// Diagnosis Role Constants
// ---------------------------------------------------------------------------

/**
 * Encounter diagnosis use/role constants.
 * @see http://terminology.hl7.org/CodeSystem/diagnosis-role
 */
export const DiagnosisRole = {
  /** Admission diagnosis */
  AD: 'AD',
  /** Discharge diagnosis */
  DD: 'DD',
  /** Chief complaint */
  CC: 'CC',
  /** Comorbidity diagnosis */
  CM: 'CM',
  /** Pre-op diagnosis */
  PreOp: 'pre-op',
  /** Post-op diagnosis */
  PostOp: 'post-op',
  /** Billing diagnosis */
  Billing: 'billing',
} as const;

/** Union type of all DiagnosisRole values */
export type DiagnosisRoleType =
  (typeof DiagnosisRole)[keyof typeof DiagnosisRole];

// ---------------------------------------------------------------------------
// HL7 v3 ActCode Encounter Class Constants (ICoding)
// ---------------------------------------------------------------------------

/** HL7 v3 ActCode system URI */
const V3_ACTCODE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';

/** Inpatient encounter */
export const ENCOUNTER_CLASS_IMP: ICoding = {
  system: V3_ACTCODE_SYSTEM,
  code: 'IMP',
  display: 'inpatient encounter',
};

/** Ambulatory encounter */
export const ENCOUNTER_CLASS_AMB: ICoding = {
  system: V3_ACTCODE_SYSTEM,
  code: 'AMB',
  display: 'ambulatory',
};

/** Emergency encounter */
export const ENCOUNTER_CLASS_EMER: ICoding = {
  system: V3_ACTCODE_SYSTEM,
  code: 'EMER',
  display: 'emergency',
};

/** Home health encounter */
export const ENCOUNTER_CLASS_HH: ICoding = {
  system: V3_ACTCODE_SYSTEM,
  code: 'HH',
  display: 'home health',
};

/** Virtual encounter */
export const ENCOUNTER_CLASS_VR: ICoding = {
  system: V3_ACTCODE_SYSTEM,
  code: 'VR',
  display: 'virtual',
};

/** Field encounter */
export const ENCOUNTER_CLASS_FLD: ICoding = {
  system: V3_ACTCODE_SYSTEM,
  code: 'FLD',
  display: 'field',
};

/** Short stay encounter */
export const ENCOUNTER_CLASS_SS: ICoding = {
  system: V3_ACTCODE_SYSTEM,
  code: 'SS',
  display: 'short stay',
};

/** Observation encounter */
export const ENCOUNTER_CLASS_OBSENC: ICoding = {
  system: V3_ACTCODE_SYSTEM,
  code: 'OBSENC',
  display: 'observation encounter',
};

/** Pre-admission encounter */
export const ENCOUNTER_CLASS_PRENC: ICoding = {
  system: V3_ACTCODE_SYSTEM,
  code: 'PRENC',
  display: 'pre-admission',
};
