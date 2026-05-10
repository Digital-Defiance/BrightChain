/**
 * Order Specialty Extension Types
 *
 * Defines the `IOrderSpecialtyExtension` interface that extends
 * the Module 2 specialty adapter pattern to order-specific
 * configurations. Each specialty (medical, dental, veterinary)
 * provides order code sets, order templates, and validation rules.
 *
 * @module orders/specialty/orderSpecialtyTypes
 */

import type { IValidationRule } from '../../clinical/specialty/specialtyTypes';
import type { ICodeableConcept } from '../../fhir/datatypes';

/**
 * A terminology code set used for order codes within a specialty.
 *
 * For example, medical orders use CPT and LOINC; dental orders use CDT.
 */
export interface IOrderCodeSet {
  /** URI identifying the code system (e.g. "http://loinc.org") */
  system: string;
  /** Display name of the code set (e.g. "LOINC") */
  name: string;
  /** Optional version of the code set */
  version?: string;
  /** Description of what this code set covers */
  description?: string;
}

/**
 * A predefined order template (order set) for a specialty.
 *
 * Order templates group commonly ordered items together, such as
 * "Basic Metabolic Panel" or "Dental Panoramic X-Ray Series".
 */
export interface IOrderTemplate {
  /** Unique identifier for this template */
  templateId: string;
  /** Display name (e.g. "Basic Metabolic Panel") */
  displayName: string;
  /** Description of the order set */
  description: string;
  /** The codes included in this order set */
  codes: ICodeableConcept[];
}

/**
 * Order-specific specialty extension.
 *
 * Augments the base `ISpecialtyProfile` from Module 2 with order
 * code sets, predefined order templates, and order-specific
 * validation rules for each specialty.
 *
 * @see Requirement 14.1
 */
export interface IOrderSpecialtyExtension {
  /** Specialty identifier matching `ISpecialtyProfile.specialtyCode` */
  specialtyCode: string;

  /** Terminology code sets available for order codes in this specialty */
  orderCodeSets: IOrderCodeSet[];

  /** Predefined order templates (order sets) for this specialty */
  orderTemplates: IOrderTemplate[];

  /** Order-specific validation rules for this specialty */
  validationRules: IValidationRule[];
}
