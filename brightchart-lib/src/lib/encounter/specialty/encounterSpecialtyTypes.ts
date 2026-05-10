/**
 * Encounter Specialty Extension Types
 *
 * Defines the `IEncounterSpecialtyExtension` interface that extends
 * the Module 2 specialty adapter pattern to encounter-specific
 * configurations. Each specialty (medical, dental, veterinary, hospital)
 * provides encounter class/type extensions, validation rules, and a
 * default workflow configuration.
 *
 * @module encounter/specialty/encounterSpecialtyTypes
 */

import type { IValidationRule } from '../../clinical/specialty/specialtyTypes';
import type { ICodeableConcept, ICoding } from '../../fhir/datatypes';
import type { IEncounterWorkflowConfig } from '../workflow/workflowTypes';

/**
 * Encounter-specific specialty extension.
 *
 * Augments the base `ISpecialtyProfile` from Module 2 with encounter
 * class/type codes, encounter validation rules, and a default workflow
 * configuration that ships sensible workflow states and transitions
 * for the specialty.
 *
 * @see Requirement 11.1
 */
export interface IEncounterSpecialtyExtension {
  /** Specialty identifier matching `ISpecialtyProfile.specialtyCode` */
  specialtyCode: string;

  /** Additional encounter class codes specific to this specialty */
  encounterClassExtensions: ICoding[];

  /** Additional encounter type codes specific to this specialty */
  encounterTypeExtensions: ICodeableConcept[];

  /** Encounter-specific validation rules for this specialty */
  validationRules: IValidationRule[];

  /** Default workflow configuration with states and transitions */
  defaultWorkflowConfig: IEncounterWorkflowConfig;
}
