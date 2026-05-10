/**
 * Dental Billing Specialty Profile
 *
 * Predefined billing specialty extension for dental (oral) billing
 * using CDT and ICD-10-CM code systems with tooth/surface validation.
 *
 * @see Requirement 18.3
 * @module billing/specialty/dentalBillingProfile
 */

import { CLAIM_TYPE_ORAL } from '../enumerations';
import type {
  IBillingSpecialtyExtension,
  IBillingValidationRule,
} from './billingSpecialtyTypes';

/**
 * Validation rule requiring tooth number (bodySite) on dental claim line items.
 */
const TOOTH_NUMBER_RULE: IBillingValidationRule = {
  ruleId: 'dental-tooth-number',
  description:
    'Dental claim line items with CDT codes must include a tooth number in bodySite',
  validate(lineItem: unknown): boolean {
    const item = lineItem as { bodySite?: { coding?: { code?: string }[] } };
    return (
      item.bodySite !== undefined &&
      Array.isArray(item.bodySite.coding) &&
      item.bodySite.coding.length > 0
    );
  },
};

/**
 * Validation rule requiring surface codes (subSite) on dental claim line items.
 */
const SURFACE_CODE_RULE: IBillingValidationRule = {
  ruleId: 'dental-surface-code',
  description:
    'Dental claim line items with CDT codes must include surface codes in subSite',
  validate(lineItem: unknown): boolean {
    const item = lineItem as { subSite?: { coding?: { code?: string }[] }[] };
    return Array.isArray(item.subSite) && item.subSite.length > 0;
  },
};

/**
 * Dental billing specialty extension.
 * Uses oral claim type with CDT and ICD-10-CM code systems.
 * Includes validation rules for tooth number and surface codes.
 *
 * @see Requirement 18.3
 */
export const DENTAL_BILLING_EXTENSION: IBillingSpecialtyExtension = {
  specialtyCode: 'dental',
  claimType: CLAIM_TYPE_ORAL,
  billingCodeSystems: [
    { system: 'http://www.ada.org/cdt', name: 'CDT' },
    { system: 'http://hl7.org/fhir/sid/icd-10-cm', name: 'ICD-10-CM' },
  ],
  feeScheduleDefaults: [],
  validationRules: [TOOTH_NUMBER_RULE, SURFACE_CODE_RULE],
};
