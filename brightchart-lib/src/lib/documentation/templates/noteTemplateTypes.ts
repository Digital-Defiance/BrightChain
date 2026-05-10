/**
 * Note Template Type Definitions
 *
 * Defines the interfaces for the clinical note template system. Templates
 * provide predefined section structures (SOAP, H&P, Discharge Summary, etc.)
 * so clinicians can start from a structured layout rather than building notes
 * from scratch. Templates are specialty-aware and site-customizable.
 *
 * @module documentation/templates/noteTemplateTypes
 */

import type { ClinicalResourceType } from '../../clinical/resources/index';
import type { ICodeableConcept } from '../../fhir/datatypes';

/**
 * A single section within a note template.
 *
 * Defines the structure, LOINC code, and optional defaults for one section
 * of a clinical note. Sections can nest recursively via `subsections` and
 * can declare which clinical resource types may be linked as entries.
 *
 * @see {@link INoteTemplate} for the parent template interface
 */
export interface INoteTemplateSection {
  /** Display title for the section (e.g. "Subjective", "Assessment") */
  title: string;

  /** LOINC section code identifying this section type */
  code: ICodeableConcept;

  /** Whether this section must be completed before the note can be signed */
  required: boolean;

  /** Optional placeholder or boilerplate text pre-filled when the section is created */
  defaultText?: string;

  /** Optional nested sub-sections for hierarchical note structures */
  subsections?: INoteTemplateSection[];

  /** Optional list of clinical resource types that can be linked as entries in this section */
  entryTypes?: ClinicalResourceType[];
}

/**
 * A complete note template defining the section layout for a clinical note type.
 *
 * Each template is associated with a LOINC document type code and a specialty,
 * allowing the system to present the right templates for the current context.
 * One template per type+specialty combination can be marked as the default.
 *
 * @see {@link INoteTemplateSection} for section definitions
 * @see {@link INoteTemplateRegistry} for template lookup and registration
 */
export interface INoteTemplate {
  /** Unique identifier for this template */
  templateId: string;

  /** Human-readable template name (e.g. "SOAP Note", "History & Physical") */
  name: string;

  /** Brief description of when and how to use this template */
  description: string;

  /** LOINC document type code this template produces (e.g. "11506-3" for Progress Note) */
  loincTypeCode: string;

  /** Specialty code matching ISpecialtyProfile.specialtyCode (e.g. "medical", "dental") */
  specialtyCode: string;

  /** Ordered list of sections that make up this note template */
  sections: INoteTemplateSection[];

  /** Whether this is the default template for its type+specialty combination */
  isDefault: boolean;
}

/**
 * Registry for looking up, filtering, and registering note templates.
 *
 * Provides methods to retrieve templates by ID, filter by document type and
 * specialty, register custom templates, and resolve the default template for
 * a given type+specialty combination.
 */
export interface INoteTemplateRegistry {
  /**
   * Retrieve a template by its unique identifier.
   * @param templateId - The template's unique ID
   * @returns The matching note template
   * @throws If no template with the given ID exists
   */
  getTemplate(templateId: string): INoteTemplate;

  /**
   * Retrieve all templates for a given LOINC document type, optionally filtered by specialty.
   * @param loincTypeCode - LOINC document type code to filter by
   * @param specialtyCode - Optional specialty code to further narrow results
   * @returns Array of matching note templates
   */
  getTemplatesForType(
    loincTypeCode: string,
    specialtyCode?: string,
  ): INoteTemplate[];

  /**
   * Register a new template or replace an existing one with the same templateId.
   * @param template - The note template to register
   */
  registerTemplate(template: INoteTemplate): void;

  /**
   * Retrieve the default template for a given document type and specialty.
   * @param loincTypeCode - LOINC document type code
   * @param specialtyCode - Specialty code matching ISpecialtyProfile.specialtyCode
   * @returns The default note template for the type+specialty combination
   * @throws If no default template exists for the given combination
   */
  getDefaultTemplate(
    loincTypeCode: string,
    specialtyCode: string,
  ): INoteTemplate;
}
