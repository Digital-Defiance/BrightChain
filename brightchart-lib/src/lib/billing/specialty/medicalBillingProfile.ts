/**
 * Medical Billing Specialty Profile
 *
 * Predefined billing specialty extension for medical (professional)
 * billing using CPT, HCPCS, and ICD-10-CM code systems.
 *
 * @see Requirement 18.2
 * @module billing/specialty/medicalBillingProfile
 */

import { CLAIM_TYPE_PROFESSIONAL } from '../enumerations';
import type { IBillingSpecialtyExtension } from './billingSpecialtyTypes';

/**
 * Medical billing specialty extension.
 * Uses professional claim type with CPT, HCPCS, and ICD-10-CM code systems.
 *
 * @see Requirement 18.2
 */
export const MEDICAL_BILLING_EXTENSION: IBillingSpecialtyExtension = {
  specialtyCode: 'medical',
  claimType: CLAIM_TYPE_PROFESSIONAL,
  billingCodeSystems: [
    { system: 'http://www.ama-assn.org/go/cpt', name: 'CPT' },
    {
      system: 'https://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets',
      name: 'HCPCS',
    },
    { system: 'http://hl7.org/fhir/sid/icd-10-cm', name: 'ICD-10-CM' },
  ],
  feeScheduleDefaults: [],
  validationRules: [],
};
