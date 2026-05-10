/**
 * Clinical Documentation Enumerations and Constants
 *
 * FHIR R4 status code enumerations for clinical documentation resources
 * and LOINC document type constants for common clinical note types.
 *
 * @see https://build.fhir.org/valueset-composition-status.html
 * @see https://build.fhir.org/valueset-document-reference-status.html
 * @see https://build.fhir.org/valueset-composition-attestation-mode.html
 * @see https://build.fhir.org/valueset-document-relationship-type.html
 * @see https://loinc.org/
 * @module documentation/enumerations
 */

import { ICodeableConcept } from '../fhir/datatypes';

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Composition status codes (required binding).
 * @see https://build.fhir.org/valueset-composition-status.html
 */
export enum CompositionStatus {
  Preliminary = 'preliminary',
  Final = 'final',
  Amended = 'amended',
  EnteredInError = 'entered-in-error',
}

/**
 * FHIR R4 DocumentReference status codes (required binding).
 * @see https://build.fhir.org/valueset-document-reference-status.html
 */
export enum DocumentReferenceStatus {
  Current = 'current',
  Superseded = 'superseded',
  EnteredInError = 'entered-in-error',
}

/**
 * FHIR R4 Composition attestation mode codes (required binding).
 * @see https://build.fhir.org/valueset-composition-attestation-mode.html
 */
export enum AttestationMode {
  Personal = 'personal',
  Professional = 'professional',
  Legal = 'legal',
  Official = 'official',
}

/**
 * FHIR R4 Document relationship type codes (required binding).
 * @see https://build.fhir.org/valueset-document-relationship-type.html
 */
export enum DocumentRelationshipType {
  Replaces = 'replaces',
  Transforms = 'transforms',
  Signs = 'signs',
  Appends = 'appends',
}

// ---------------------------------------------------------------------------
// LOINC Document Type Constants
// ---------------------------------------------------------------------------

/** LOINC terminology system URI */
const LOINC_SYSTEM = 'http://loinc.org';

/** Consultation Note (LOINC 11488-4) */
export const CONSULTATION_NOTE: ICodeableConcept = {
  coding: [
    { system: LOINC_SYSTEM, code: '11488-4', display: 'Consultation Note' },
  ],
};

/** Discharge Summary (LOINC 18842-5) */
export const DISCHARGE_SUMMARY: ICodeableConcept = {
  coding: [
    { system: LOINC_SYSTEM, code: '18842-5', display: 'Discharge Summary' },
  ],
};

/** History and Physical (LOINC 34117-2) */
export const HISTORY_AND_PHYSICAL: ICodeableConcept = {
  coding: [
    { system: LOINC_SYSTEM, code: '34117-2', display: 'History and Physical' },
  ],
};

/** Progress Note (LOINC 11506-3) */
export const PROGRESS_NOTE: ICodeableConcept = {
  coding: [{ system: LOINC_SYSTEM, code: '11506-3', display: 'Progress Note' }],
};

/** Procedure Note (LOINC 28570-0) */
export const PROCEDURE_NOTE: ICodeableConcept = {
  coding: [
    { system: LOINC_SYSTEM, code: '28570-0', display: 'Procedure Note' },
  ],
};

/** Operative Note (LOINC 11504-8) */
export const OPERATIVE_NOTE: ICodeableConcept = {
  coding: [
    { system: LOINC_SYSTEM, code: '11504-8', display: 'Operative Note' },
  ],
};

/** Surgical Operation Note — alias for Operative Note (LOINC 11504-8) */
export const SURGICAL_OPERATION_NOTE: ICodeableConcept = OPERATIVE_NOTE;

/** Nurse Note (LOINC 34746-8) */
export const NURSE_NOTE: ICodeableConcept = {
  coding: [{ system: LOINC_SYSTEM, code: '34746-8', display: 'Nurse Note' }],
};

/** Referral Note (LOINC 57133-1) */
export const REFERRAL_NOTE: ICodeableConcept = {
  coding: [{ system: LOINC_SYSTEM, code: '57133-1', display: 'Referral Note' }],
};

/** Transfer Summary (LOINC 18761-7) */
export const TRANSFER_SUMMARY: ICodeableConcept = {
  coding: [
    { system: LOINC_SYSTEM, code: '18761-7', display: 'Transfer Summary' },
  ],
};
