/**
 * Dental Documentation Specialty Extension
 *
 * Dental-specific note templates with odontogram/tooth chart sections,
 * CDT procedure documentation, and treatment plan sections.
 *
 * @module documentation/specialty/dentalDocProfile
 */

import type { INoteTemplate } from '../templates/noteTemplateTypes';
import type { IDocumentationSpecialtyExtension } from './documentationSpecialtyTypes';

/** LOINC terminology system URI */
const LOINC_SYSTEM = 'http://loinc.org';

/** ADA dental terminology system URI */
const ADA_SYSTEM = 'http://www.ada.org/dental';

/**
 * Dental Exam Note template with odontogram and CDT sections.
 */
const DENTAL_EXAM_TEMPLATE: INoteTemplate = {
  templateId: 'dental-exam',
  name: 'Dental Examination',
  description:
    'Comprehensive dental examination with odontogram, periodontal charting, and treatment planning.',
  loincTypeCode: '11506-3',
  specialtyCode: 'dental',
  isDefault: true,
  sections: [
    {
      title: 'Chief Complaint',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '10154-3', display: 'Chief Complaint' },
        ],
      },
      required: true,
    },
    {
      title: 'Odontogram',
      code: {
        coding: [
          {
            system: ADA_SYSTEM,
            code: 'odontogram',
            display: 'Odontogram / Tooth Chart',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Periodontal Charting',
      code: {
        coding: [
          {
            system: ADA_SYSTEM,
            code: 'perio-chart',
            display: 'Periodontal Charting',
          },
        ],
      },
      required: false,
    },
    {
      title: 'CDT Procedure Documentation',
      code: {
        coding: [
          {
            system: 'http://www.ada.org/cdt',
            code: 'cdt-procedures',
            display: 'CDT Procedure Documentation',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Treatment Plan',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '18776-5', display: 'Plan of Care' },
        ],
      },
      required: true,
    },
  ],
};

/**
 * Dental Treatment Plan template.
 */
const DENTAL_TREATMENT_PLAN_TEMPLATE: INoteTemplate = {
  templateId: 'dental-treatment-plan',
  name: 'Dental Treatment Plan',
  description:
    'Structured dental treatment plan with phased procedures and cost estimates.',
  loincTypeCode: '18776-5',
  specialtyCode: 'dental',
  isDefault: true,
  sections: [
    {
      title: 'Diagnosis Summary',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '51848-0', display: 'Assessment' },
        ],
      },
      required: true,
    },
    {
      title: 'Proposed Procedures',
      code: {
        coding: [
          {
            system: 'http://www.ada.org/cdt',
            code: 'proposed-procedures',
            display: 'Proposed CDT Procedures',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Treatment Phases',
      code: {
        coding: [
          {
            system: ADA_SYSTEM,
            code: 'treatment-phases',
            display: 'Treatment Phases',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Patient Consent',
      code: {
        coding: [{ system: LOINC_SYSTEM, code: '59284-0', display: 'Consent' }],
      },
      required: false,
    },
  ],
};

/**
 * Dental documentation specialty extension.
 */
export const DENTAL_DOCUMENTATION_EXTENSION: IDocumentationSpecialtyExtension =
  {
    specialtyCode: 'dental',
    noteTemplates: [DENTAL_EXAM_TEMPLATE, DENTAL_TREATMENT_PLAN_TEMPLATE],
    documentTypeExtensions: [
      {
        coding: [
          {
            system: ADA_SYSTEM,
            code: 'dental-exam',
            display: 'Dental Examination',
          },
        ],
      },
      {
        coding: [
          {
            system: ADA_SYSTEM,
            code: 'dental-treatment-plan',
            display: 'Dental Treatment Plan',
          },
        ],
      },
    ],
    sectionExtensions: [
      {
        coding: [
          {
            system: ADA_SYSTEM,
            code: 'odontogram',
            display: 'Odontogram / Tooth Chart',
          },
        ],
      },
      {
        coding: [
          {
            system: ADA_SYSTEM,
            code: 'perio-chart',
            display: 'Periodontal Charting',
          },
        ],
      },
      {
        coding: [
          {
            system: 'http://www.ada.org/cdt',
            code: 'cdt-procedures',
            display: 'CDT Procedure Documentation',
          },
        ],
      },
    ],
    validationRules: [],
  };
