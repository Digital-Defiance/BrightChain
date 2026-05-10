/**
 * Billing Enumerations and Constants
 *
 * FHIR R4 status code enumerations for billing resources (Coverage, Claim,
 * ExplanationOfBenefit, CoverageEligibilityRequest/Response) and claim type
 * constants. Includes BrightChart-specific superbill and ledger enumerations.
 *
 * @see https://build.fhir.org/valueset-fm-status.html
 * @see https://build.fhir.org/valueset-claim-use.html
 * @see https://build.fhir.org/valueset-remittance-outcome.html
 * @see https://build.fhir.org/valueset-eligibilityrequest-purpose.html
 * @see https://build.fhir.org/valueset-claim-type.html
 * @module billing/enumerations
 */

import type { ICodeableConcept } from '../fhir/datatypes';

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Coverage status codes (required binding).
 * @see https://build.fhir.org/valueset-fm-status.html
 */
export enum CoverageStatus {
  Active = 'active',
  Cancelled = 'cancelled',
  Draft = 'draft',
  EnteredInError = 'entered-in-error',
}

/**
 * FHIR R4 Claim status codes (required binding).
 * @see https://build.fhir.org/valueset-fm-status.html
 */
export enum ClaimStatus {
  Active = 'active',
  Cancelled = 'cancelled',
  Draft = 'draft',
  EnteredInError = 'entered-in-error',
}

/**
 * FHIR R4 Claim use codes (required binding).
 * @see https://build.fhir.org/valueset-claim-use.html
 */
export enum ClaimUse {
  Claim = 'claim',
  Preauthorization = 'preauthorization',
  Predetermination = 'predetermination',
}

/**
 * FHIR R4 ExplanationOfBenefit status codes (required binding).
 * @see https://build.fhir.org/valueset-fm-status.html
 */
export enum EOBStatus {
  Active = 'active',
  Cancelled = 'cancelled',
  Draft = 'draft',
  EnteredInError = 'entered-in-error',
}

/**
 * FHIR R4 Remittance outcome codes (required binding).
 * @see https://build.fhir.org/valueset-remittance-outcome.html
 */
export enum RemittanceOutcome {
  Queued = 'queued',
  Complete = 'complete',
  Error = 'error',
  Partial = 'partial',
}

/**
 * FHIR R4 Eligibility request purpose codes (required binding).
 * @see https://build.fhir.org/valueset-eligibilityrequest-purpose.html
 */
export enum EligibilityRequestPurpose {
  AuthRequirements = 'auth-requirements',
  Benefits = 'benefits',
  Discovery = 'discovery',
  Validation = 'validation',
}

/**
 * BrightChart superbill status codes.
 */
export enum SuperbillStatus {
  Draft = 'draft',
  Finalized = 'finalized',
  Billed = 'billed',
}

/**
 * BrightChart patient ledger entry type codes.
 */
export enum LedgerEntryType {
  Charge = 'charge',
  Payment = 'payment',
  Adjustment = 'adjustment',
  Refund = 'refund',
  WriteOff = 'write-off',
}

// ---------------------------------------------------------------------------
// Claim Type Constants
// ---------------------------------------------------------------------------

/** FHIR R4 Claim type code system URI */
const CLAIM_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/claim-type';

/**
 * Institutional claim type.
 * @see https://build.fhir.org/valueset-claim-type.html
 */
export const CLAIM_TYPE_INSTITUTIONAL: ICodeableConcept = {
  coding: [
    {
      system: CLAIM_TYPE_SYSTEM,
      code: 'institutional',
      display: 'Institutional',
    },
  ],
};

/**
 * Oral (dental) claim type.
 * @see https://build.fhir.org/valueset-claim-type.html
 */
export const CLAIM_TYPE_ORAL: ICodeableConcept = {
  coding: [{ system: CLAIM_TYPE_SYSTEM, code: 'oral', display: 'Oral' }],
};

/**
 * Pharmacy claim type.
 * @see https://build.fhir.org/valueset-claim-type.html
 */
export const CLAIM_TYPE_PHARMACY: ICodeableConcept = {
  coding: [
    { system: CLAIM_TYPE_SYSTEM, code: 'pharmacy', display: 'Pharmacy' },
  ],
};

/**
 * Professional claim type.
 * @see https://build.fhir.org/valueset-claim-type.html
 */
export const CLAIM_TYPE_PROFESSIONAL: ICodeableConcept = {
  coding: [
    {
      system: CLAIM_TYPE_SYSTEM,
      code: 'professional',
      display: 'Professional',
    },
  ],
};

/**
 * Vision claim type.
 * @see https://build.fhir.org/valueset-claim-type.html
 */
export const CLAIM_TYPE_VISION: ICodeableConcept = {
  coding: [{ system: CLAIM_TYPE_SYSTEM, code: 'vision', display: 'Vision' }],
};
