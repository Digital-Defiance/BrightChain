/**
 * Billing Specialty Extension Interfaces
 *
 * Defines the billing specialty extension interface for specialty-specific
 * billing configurations including claim types, code systems, fee schedule
 * defaults, and validation rules.
 *
 * @see Requirement 18.1
 * @module billing/specialty/billingSpecialtyTypes
 */

import type { ICodeableConcept } from '../../fhir/datatypes';
import type { IFeeScheduleEntry } from '../feeSchedule/feeScheduleTypes';

/**
 * A billing validation rule that can be applied to claim line items
 * for specialty-specific requirements (e.g. dental tooth/surface).
 */
export interface IBillingValidationRule {
  /** Unique rule identifier */
  ruleId: string;
  /** Human-readable description of the rule */
  description: string;
  /** Validate a claim line item, returning true if valid */
  validate(lineItem: unknown): boolean;
}

/**
 * Billing specialty extension defining specialty-specific billing
 * configuration including claim type, code systems, fee schedule
 * defaults, and validation rules.
 *
 * @see Requirement 18.1
 */
export interface IBillingSpecialtyExtension {
  /** Specialty code (e.g. 'medical', 'dental', 'veterinary') */
  specialtyCode: string;
  /** Default claim type for this specialty */
  claimType: ICodeableConcept;
  /** Billing code systems used by this specialty */
  billingCodeSystems: { system: string; name: string }[];
  /** Default fee schedule entries for this specialty */
  feeScheduleDefaults: IFeeScheduleEntry[];
  /** Specialty-specific validation rules for claim line items */
  validationRules: IBillingValidationRule[];
}
