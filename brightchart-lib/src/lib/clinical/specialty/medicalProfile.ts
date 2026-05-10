/**
 * Medical Specialty Profile
 *
 * SNOMED CT, ICD-10-CM, CPT, and LOINC terminology sets.
 * No resource extensions (standard FHIR fields suffice).
 *
 * @module clinical/specialty/medicalProfile
 */

import type { ISpecialtyProfile, IValidationResult } from './specialtyTypes';

const MEDICAL_TERMINOLOGY_URIS = [
  'http://snomed.info/sct',
  'http://hl7.org/fhir/sid/icd-10-cm',
  'http://www.ama-assn.org/go/cpt',
  'http://loinc.org',
];

export const MEDICAL_SPECIALTY_PROFILE: ISpecialtyProfile = {
  specialtyCode: 'medical',
  displayName: 'BrightChart Medical',
  terminologySets: [
    { system: 'http://snomed.info/sct', name: 'SNOMED CT' },
    { system: 'http://hl7.org/fhir/sid/icd-10-cm', name: 'ICD-10-CM' },
    { system: 'http://www.ama-assn.org/go/cpt', name: 'CPT' },
    { system: 'http://loinc.org', name: 'LOINC' },
  ],
  resourceExtensions: [],
  validationRules: [
    {
      resourceType: 'Observation',
      field: 'code.coding[].system',
      description: 'Code system must be a recognized medical terminology URI',
      rule: (value: unknown): IValidationResult => {
        const coding = value as Array<{ system?: string }> | undefined;
        if (!coding || !Array.isArray(coding)) {
          return { valid: true, errors: [] };
        }
        const errors = coding
          .filter(
            (c) => c.system && !MEDICAL_TERMINOLOGY_URIS.includes(c.system),
          )
          .map((c) => ({
            field: 'code.coding[].system',
            message: `Unrecognized terminology system: ${c.system}`,
            rule: 'medical-terminology-system',
          }));
        return { valid: errors.length === 0, errors };
      },
    },
  ],
};
