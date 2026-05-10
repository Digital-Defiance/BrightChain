/**
 * Medical Order Specialty Profile
 *
 * CPT and LOINC order code sets with common medical order templates
 * (BMP, CBC, CMP, Lipid Panel, Thyroid Panel, Urinalysis, etc.).
 *
 * @module orders/specialty/medicalOrderProfile
 */

import type { IOrderSpecialtyExtension } from './orderSpecialtyTypes';

/** CPT code system URI */
const CPT_SYSTEM = 'http://www.ama-assn.org/go/cpt';

/** LOINC code system URI */
const LOINC_SYSTEM = 'http://loinc.org';

/**
 * Medical order specialty extension.
 *
 * Includes CPT/LOINC order code sets and common medical order
 * templates for lab panels and diagnostic studies.
 *
 * @see Requirement 14.2
 */
export const MEDICAL_ORDER_EXTENSION: IOrderSpecialtyExtension = {
  specialtyCode: 'medical',

  orderCodeSets: [
    {
      system: CPT_SYSTEM,
      name: 'CPT',
      description:
        'Current Procedural Terminology codes for medical procedures and services',
    },
    {
      system: LOINC_SYSTEM,
      name: 'LOINC',
      description:
        'Logical Observation Identifiers Names and Codes for lab orders and observations',
    },
  ],

  orderTemplates: [
    {
      templateId: 'medical-bmp',
      displayName: 'Basic Metabolic Panel (BMP)',
      description:
        'Glucose, BUN, creatinine, sodium, potassium, chloride, CO2, calcium',
      codes: [
        {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: '51990-0',
              display: 'Basic metabolic panel',
            },
          ],
          text: 'Basic Metabolic Panel',
        },
      ],
    },
    {
      templateId: 'medical-cbc',
      displayName: 'Complete Blood Count (CBC)',
      description: 'WBC, RBC, hemoglobin, hematocrit, platelets, differential',
      codes: [
        {
          coding: [
            { system: LOINC_SYSTEM, code: '58410-2', display: 'CBC panel' },
          ],
          text: 'Complete Blood Count',
        },
      ],
    },
    {
      templateId: 'medical-cmp',
      displayName: 'Comprehensive Metabolic Panel (CMP)',
      description: 'BMP plus albumin, bilirubin, ALP, ALT, AST, total protein',
      codes: [
        {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: '24323-8',
              display: 'Comprehensive metabolic panel',
            },
          ],
          text: 'Comprehensive Metabolic Panel',
        },
      ],
    },
    {
      templateId: 'medical-lipid',
      displayName: 'Lipid Panel',
      description: 'Total cholesterol, HDL, LDL, triglycerides',
      codes: [
        {
          coding: [
            { system: LOINC_SYSTEM, code: '24331-1', display: 'Lipid panel' },
          ],
          text: 'Lipid Panel',
        },
      ],
    },
    {
      templateId: 'medical-thyroid',
      displayName: 'Thyroid Panel',
      description: 'TSH, free T4, free T3',
      codes: [
        {
          coding: [
            { system: LOINC_SYSTEM, code: '24348-5', display: 'Thyroid panel' },
          ],
          text: 'Thyroid Panel',
        },
      ],
    },
    {
      templateId: 'medical-urinalysis',
      displayName: 'Urinalysis',
      description: 'Complete urinalysis with microscopy',
      codes: [
        {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: '24357-6',
              display: 'Urinalysis panel',
            },
          ],
          text: 'Urinalysis',
        },
      ],
    },
    {
      templateId: 'medical-hba1c',
      displayName: 'Hemoglobin A1c',
      description: 'Glycated hemoglobin for diabetes monitoring',
      codes: [
        {
          coding: [
            { system: LOINC_SYSTEM, code: '4548-4', display: 'Hemoglobin A1c' },
          ],
          text: 'Hemoglobin A1c',
        },
      ],
    },
  ],

  validationRules: [],
};
