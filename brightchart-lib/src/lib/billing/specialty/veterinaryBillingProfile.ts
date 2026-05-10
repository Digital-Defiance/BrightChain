/**
 * Veterinary Billing Specialty Profile
 *
 * Predefined billing specialty extension for veterinary billing
 * using direct client invoicing with optional pet insurance support.
 *
 * @see Requirement 18.4
 * @module billing/specialty/veterinaryBillingProfile
 */

import { CLAIM_TYPE_PROFESSIONAL } from '../enumerations';
import type { IBillingSpecialtyExtension } from './billingSpecialtyTypes';

/**
 * Veterinary billing specialty extension.
 * Uses professional claim type with direct invoicing model.
 * Most vet practices bill clients directly; pet insurance claims are optional.
 *
 * @see Requirement 18.4
 */
export const VETERINARY_BILLING_EXTENSION: IBillingSpecialtyExtension = {
  specialtyCode: 'veterinary',
  claimType: CLAIM_TYPE_PROFESSIONAL,
  billingCodeSystems: [
    { system: 'http://www.ama-assn.org/go/cpt', name: 'CPT' },
    { system: 'http://hl7.org/fhir/sid/icd-10-cm', name: 'ICD-10-CM' },
  ],
  feeScheduleDefaults: [],
  validationRules: [],
};
