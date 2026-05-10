/**
 * Documentation Specialty Extension Types
 *
 * Defines the IDocumentationSpecialtyExtension interface that extends
 * the Specialty Adapter from Module 2 with documentation-specific
 * configurations: note templates, document type extensions, section
 * extensions, and validation rules.
 *
 * @module documentation/specialty/documentationSpecialtyTypes
 */

import type { IValidationRule } from '../../clinical/specialty/specialtyTypes';
import type { ICodeableConcept } from '../../fhir/datatypes';
import type { INoteTemplate } from '../templates/noteTemplateTypes';

/**
 * Documentation-specific specialty extension.
 *
 * Each specialty (medical, dental, veterinary) provides its own set of
 * note templates, document type codes, section types, and validation rules
 * for clinical documentation.
 */
export interface IDocumentationSpecialtyExtension {
  /** Specialty identifier matching ISpecialtyProfile.specialtyCode */
  specialtyCode: string;
  /** Note templates available for this specialty */
  noteTemplates: INoteTemplate[];
  /** Additional LOINC document type codes for this specialty */
  documentTypeExtensions: ICodeableConcept[];
  /** Additional section types for this specialty */
  sectionExtensions: ICodeableConcept[];
  /** Validation rules for documentation in this specialty */
  validationRules: IValidationRule[];
}
