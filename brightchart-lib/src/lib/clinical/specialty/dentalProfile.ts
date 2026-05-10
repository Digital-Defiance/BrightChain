/**
 * Dental Specialty Profile
 *
 * CDT and ADA Dental terminology sets with dentition-specific extensions
 * (toothNumber, surface, quadrant) on Procedure and Condition.
 *
 * @module clinical/specialty/dentalProfile
 */

import type { ISpecialtyProfile, IValidationResult } from './specialtyTypes';

const VALID_SURFACE_CODES = ['M', 'D', 'O', 'B', 'L'];
const VALID_QUADRANT_CODES = ['UR', 'UL', 'LR', 'LL'];

export const DENTAL_SPECIALTY_PROFILE: ISpecialtyProfile = {
  specialtyCode: 'dental',
  displayName: 'BrightChart Dental',
  terminologySets: [
    { system: 'http://www.ada.org/cdt', name: 'CDT' },
    { system: 'http://www.ada.org/dental', name: 'ADA Dental' },
  ],
  resourceExtensions: [
    {
      resourceType: 'Procedure',
      url: 'http://brightchart.org/fhir/StructureDefinition/toothNumber',
      valueType: 'valueInteger',
      description: 'ADA universal tooth numbering (1-32)',
    },
    {
      resourceType: 'Condition',
      url: 'http://brightchart.org/fhir/StructureDefinition/toothNumber',
      valueType: 'valueInteger',
      description: 'ADA universal tooth numbering (1-32)',
    },
    {
      resourceType: 'Procedure',
      url: 'http://brightchart.org/fhir/StructureDefinition/surface',
      valueType: 'valueCodeableConcept',
      description: 'Tooth surface (M, D, O, B, L)',
    },
    {
      resourceType: 'Condition',
      url: 'http://brightchart.org/fhir/StructureDefinition/surface',
      valueType: 'valueCodeableConcept',
      description: 'Tooth surface (M, D, O, B, L)',
    },
    {
      resourceType: 'Procedure',
      url: 'http://brightchart.org/fhir/StructureDefinition/quadrant',
      valueType: 'valueCode',
      description: 'Dental quadrant (UR, UL, LR, LL)',
    },
    {
      resourceType: 'Condition',
      url: 'http://brightchart.org/fhir/StructureDefinition/quadrant',
      valueType: 'valueCode',
      description: 'Dental quadrant (UR, UL, LR, LL)',
    },
  ],
  validationRules: [
    {
      resourceType: 'Procedure',
      field: 'extension[toothNumber]',
      description: 'Tooth number must be 1-32 when present',
      rule: (value: unknown): IValidationResult => {
        if (value === undefined || value === null)
          return { valid: true, errors: [] };
        const num = value as number;
        if (num < 1 || num > 32 || !Number.isInteger(num)) {
          return {
            valid: false,
            errors: [
              {
                field: 'extension[toothNumber]',
                message: `Tooth number must be 1-32, got ${num}`,
                rule: 'dental-tooth-number',
              },
            ],
          };
        }
        return { valid: true, errors: [] };
      },
    },
    {
      resourceType: 'Procedure',
      field: 'extension[surface]',
      description:
        'Surface codes must be valid ADA surface codes (M, D, O, B, L)',
      rule: (value: unknown): IValidationResult => {
        if (value === undefined || value === null)
          return { valid: true, errors: [] };
        const code = value as string;
        if (!VALID_SURFACE_CODES.includes(code)) {
          return {
            valid: false,
            errors: [
              {
                field: 'extension[surface]',
                message: `Invalid surface code: ${code}. Must be one of ${VALID_SURFACE_CODES.join(', ')}`,
                rule: 'dental-surface-code',
              },
            ],
          };
        }
        return { valid: true, errors: [] };
      },
    },
  ],
};

export { VALID_QUADRANT_CODES, VALID_SURFACE_CODES };
