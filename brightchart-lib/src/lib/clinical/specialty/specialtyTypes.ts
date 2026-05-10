/**
 * Specialty Adapter Interfaces
 *
 * Defines the configuration-driven specialty system that makes BrightChart
 * Medical, Dental, and Vet configurations of the same codebase.
 *
 * @module clinical/specialty/specialtyTypes
 */

import type {
  ClinicalResource,
  ClinicalResourceType,
} from '../resources/index';

/** A terminology code system used by a specialty */
export interface ITerminologySet {
  /** URI identifying the code system */
  system: string;
  /** Display name */
  name: string;
  /** Optional version */
  version?: string;
  /** Commonly used codes for validation hints */
  codes?: string[];
}

/** A FHIR extension added by a specialty to a resource type */
export interface IResourceExtension {
  /** The resource type this extension applies to */
  resourceType: ClinicalResourceType | 'Patient';
  /** Extension URI */
  url: string;
  /** FHIR datatype of the extension value */
  valueType: string;
  /** Human-readable description */
  description: string;
}

/** Result of a specialty validation check */
export interface IValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string; rule: string }>;
}

/** A specialty-specific validation rule */
export interface IValidationRule {
  /** Resource type this rule applies to */
  resourceType: ClinicalResourceType;
  /** Field path the rule validates */
  field: string;
  /** Validation function */
  rule: (value: unknown) => IValidationResult;
  /** Human-readable description */
  description: string;
}

/** Configuration object defining a healthcare specialty */
export interface ISpecialtyProfile {
  /** Specialty identifier (e.g. "medical", "dental", "veterinary") */
  specialtyCode: string;
  /** Display name (e.g. "BrightChart Medical") */
  displayName: string;
  /** Terminology code systems used by this specialty */
  terminologySets: ITerminologySet[];
  /** FHIR extensions added by this specialty */
  resourceExtensions: IResourceExtension[];
  /** Validation rules for this specialty */
  validationRules: IValidationRule[];
}

/** Runtime context holding the active specialty profile */
export interface ISpecialtyContext {
  /** The active specialty profile */
  profile: ISpecialtyProfile;
  /** Get all terminology sets for the active specialty */
  getTerminologySets(): ITerminologySet[];
  /** Get extensions applicable to a specific resource type */
  getExtensionsForResource(
    resourceType: ClinicalResourceType | 'Patient',
  ): IResourceExtension[];
  /** Validate a clinical resource against specialty rules */
  validateResource(resource: ClinicalResource): IValidationResult;
}
