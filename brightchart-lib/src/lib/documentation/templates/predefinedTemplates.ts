/**
 * Predefined Clinical Note Templates
 *
 * Provides ready-to-use note templates for common clinical documentation
 * patterns: SOAP Note, History & Physical, Discharge Summary, and
 * Procedure Note. Each template defines the standard section layout with
 * LOINC section codes so clinicians can start from a structured layout
 * rather than building notes from scratch.
 *
 * @see {@link INoteTemplate} for the template interface
 * @see {@link INoteTemplateSection} for section definitions
 * @module documentation/templates/predefinedTemplates
 */

import type { INoteTemplate } from './noteTemplateTypes';

/** LOINC terminology system URI */
const LOINC_SYSTEM = 'http://loinc.org';

// ---------------------------------------------------------------------------
// SOAP Note Template
// ---------------------------------------------------------------------------

/**
 * Standard SOAP (Subjective, Objective, Assessment, Plan) note template.
 *
 * The most common outpatient progress note format. Maps to LOINC document
 * type 11506-3 (Progress Note). All four sections are required.
 */
export const SOAP_NOTE_TEMPLATE: INoteTemplate = {
  templateId: 'soap-note',
  name: 'SOAP Note',
  description:
    'Standard Subjective, Objective, Assessment, Plan progress note format used in outpatient and inpatient settings.',
  loincTypeCode: '11506-3',
  specialtyCode: 'medical',
  isDefault: true,
  sections: [
    {
      title: 'Subjective',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '10164-2',
            display: 'History of Present Illness',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Objective',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '29545-1',
            display: 'Physical Examination',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Assessment',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '51848-0',
            display: 'Assessment',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Plan',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '18776-5',
            display: 'Plan of Care',
          },
        ],
      },
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// History & Physical Template
// ---------------------------------------------------------------------------

/**
 * History and Physical (H&P) note template.
 *
 * Comprehensive initial evaluation format used for hospital admissions and
 * new patient encounters. Maps to LOINC document type 34117-2 (History and
 * Physical Note). Review of Systems is optional; all other sections are
 * required.
 */
export const HISTORY_AND_PHYSICAL_TEMPLATE: INoteTemplate = {
  templateId: 'history-and-physical',
  name: 'History & Physical',
  description:
    'Comprehensive initial evaluation format for hospital admissions and new patient encounters.',
  loincTypeCode: '34117-2',
  specialtyCode: 'medical',
  isDefault: true,
  sections: [
    {
      title: 'Chief Complaint',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '10154-3',
            display: 'Chief Complaint',
          },
        ],
      },
      required: true,
    },
    {
      title: 'History of Present Illness',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '10164-2',
            display: 'History of Present Illness',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Past Medical History',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '11348-0',
            display: 'Past Medical History',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Review of Systems',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '10187-3',
            display: 'Review of Systems',
          },
        ],
      },
      required: false,
    },
    {
      title: 'Physical Examination',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '29545-1',
            display: 'Physical Examination',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Assessment',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '51848-0',
            display: 'Assessment',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Plan',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '18776-5',
            display: 'Plan of Care',
          },
        ],
      },
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Discharge Summary Template
// ---------------------------------------------------------------------------

/**
 * Discharge Summary note template.
 *
 * Standard format for documenting a patient's hospital stay at discharge.
 * Maps to LOINC document type 18842-5 (Discharge Summary). All sections
 * are required.
 */
export const DISCHARGE_SUMMARY_TEMPLATE: INoteTemplate = {
  templateId: 'discharge-summary',
  name: 'Discharge Summary',
  description:
    "Standard format for documenting a patient's hospital stay, diagnoses, course, and discharge plan.",
  loincTypeCode: '18842-5',
  specialtyCode: 'medical',
  isDefault: true,
  sections: [
    {
      title: 'Admission Diagnosis',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '46241-6',
            display: 'Admission Diagnosis',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Hospital Course',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '8648-8',
            display: 'Hospital Course',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Discharge Diagnosis',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '11535-2',
            display: 'Discharge Diagnosis',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Discharge Medications',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '10183-2',
            display: 'Discharge Medications',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Follow-Up Instructions',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '18776-5',
            display: 'Plan of Care',
          },
        ],
      },
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Procedure Note Template
// ---------------------------------------------------------------------------

/**
 * Procedure Note template.
 *
 * Standard format for documenting a clinical or surgical procedure. Maps
 * to LOINC document type 28570-0 (Procedure Note). Complications is
 * optional; all other sections are required.
 */
export const PROCEDURE_NOTE_TEMPLATE: INoteTemplate = {
  templateId: 'procedure-note',
  name: 'Procedure Note',
  description:
    'Standard format for documenting clinical or surgical procedures including indication, description, findings, and follow-up.',
  loincTypeCode: '28570-0',
  specialtyCode: 'medical',
  isDefault: true,
  sections: [
    {
      title: 'Indication',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '18785-6',
            display: 'Indication',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Procedure Description',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '29554-3',
            display: 'Procedure Description',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Findings',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '59776-5',
            display: 'Findings',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Complications',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '55109-3',
            display: 'Complications',
          },
        ],
      },
      required: false,
    },
    {
      title: 'Post-Procedure Plan',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '18776-5',
            display: 'Plan of Care',
          },
        ],
      },
      required: true,
    },
  ],
};
