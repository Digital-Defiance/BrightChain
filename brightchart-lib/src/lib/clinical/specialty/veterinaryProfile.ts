/**
 * Veterinary Specialty Profile
 *
 * VeNom terminology set with species/breed extensions on Patient
 * and bodyConditionScore extension on Observation.
 *
 * @module clinical/specialty/veterinaryProfile
 */

import type { ISpecialtyProfile, IValidationResult } from './specialtyTypes';

export const VETERINARY_SPECIALTY_PROFILE: ISpecialtyProfile = {
  specialtyCode: 'veterinary',
  displayName: 'BrightChart Vet',
  terminologySets: [{ system: 'http://www.venomcoding.org', name: 'VeNom' }],
  resourceExtensions: [
    {
      resourceType: 'Patient',
      url: 'http://brightchart.org/fhir/StructureDefinition/species',
      valueType: 'valueCodeableConcept',
      description: 'Species (VeNom species codes)',
    },
    {
      resourceType: 'Patient',
      url: 'http://brightchart.org/fhir/StructureDefinition/breed',
      valueType: 'valueCodeableConcept',
      description: 'Breed (VeNom breed codes)',
    },
    {
      resourceType: 'Observation',
      url: 'http://brightchart.org/fhir/StructureDefinition/bodyConditionScore',
      valueType: 'valueInteger',
      description: 'Body condition score (1-9 scale)',
    },
  ],
  validationRules: [
    {
      resourceType: 'Observation',
      field: 'extension[bodyConditionScore]',
      description: 'Body condition score must be 1-9',
      rule: (value: unknown): IValidationResult => {
        if (value === undefined || value === null)
          return { valid: true, errors: [] };
        const score = value as number;
        if (score < 1 || score > 9 || !Number.isInteger(score)) {
          return {
            valid: false,
            errors: [
              {
                field: 'extension[bodyConditionScore]',
                message: `Body condition score must be 1-9, got ${score}`,
                rule: 'vet-body-condition-score',
              },
            ],
          };
        }
        return { valid: true, errors: [] };
      },
    },
  ],
};
