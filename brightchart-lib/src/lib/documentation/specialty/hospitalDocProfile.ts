/**
 * Hospital Documentation Specialty Extension
 *
 * Hospital/inpatient-specific note templates including Admission Note,
 * ICU Progress Note, Operative Report, and Nursing Assessment, plus
 * reused History & Physical and Discharge Summary templates.
 *
 * @module documentation/specialty/hospitalDocProfile
 */

import {
  DISCHARGE_SUMMARY,
  HISTORY_AND_PHYSICAL,
  NURSE_NOTE,
  OPERATIVE_NOTE,
  PROGRESS_NOTE,
} from '../enumerations';
import type { INoteTemplate } from '../templates/noteTemplateTypes';
import {
  DISCHARGE_SUMMARY_TEMPLATE,
  HISTORY_AND_PHYSICAL_TEMPLATE,
} from '../templates/predefinedTemplates';
import type { IDocumentationSpecialtyExtension } from './documentationSpecialtyTypes';

/** LOINC terminology system URI */
const LOINC_SYSTEM = 'http://loinc.org';

/** BrightChart custom section code system URI */
const BRIGHTCHART_SECTION_SYSTEM = 'http://brightchart.org/fhir/section';

// ---------------------------------------------------------------------------
// Admission Note Template
// ---------------------------------------------------------------------------

/**
 * Admission Note template for hospital inpatient admissions.
 */
const ADMISSION_NOTE_TEMPLATE: INoteTemplate = {
  templateId: 'hospital-admission-note',
  name: 'Admission Note',
  description:
    'Hospital admission note documenting chief complaint, history, examination, and admitting diagnosis.',
  loincTypeCode: '34117-2',
  specialtyCode: 'hospital',
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
      title: 'Medications on Admission',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '10160-0',
            display: 'Medications on Admission',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Allergies',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '48765-2', display: 'Allergies' },
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
      title: 'Assessment & Plan',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '51847-2',
            display: 'Assessment & Plan',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Admitting Diagnosis',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '46241-6',
            display: 'Admitting Diagnosis',
          },
        ],
      },
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// ICU Progress Note Template
// ---------------------------------------------------------------------------

/**
 * ICU Progress Note template for intensive care unit daily documentation.
 */
const ICU_PROGRESS_NOTE_TEMPLATE: INoteTemplate = {
  templateId: 'hospital-icu-progress-note',
  name: 'ICU Progress Note',
  description:
    'Intensive care unit progress note covering overnight events, ventilator settings, hemodynamics, and organ-system assessment.',
  loincTypeCode: '11506-3',
  specialtyCode: 'hospital',
  isDefault: false,
  sections: [
    {
      title: 'Overnight Events',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '8648-8', display: 'Hospital Course' },
        ],
      },
      required: true,
    },
    {
      title: 'Ventilator Settings',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'ventilator-settings',
            display: 'Ventilator Settings',
          },
        ],
      },
      required: false,
    },
    {
      title: 'Hemodynamics',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'hemodynamics',
            display: 'Hemodynamics',
          },
        ],
      },
      required: false,
    },
    {
      title: 'Intake & Output',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'intake-output',
            display: 'Intake & Output',
          },
        ],
      },
      required: true,
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
      title: 'Labs & Imaging',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '30954-2', display: 'Labs & Imaging' },
        ],
      },
      required: true,
    },
    {
      title: 'Assessment',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '51848-0', display: 'Assessment' },
        ],
      },
      required: true,
    },
    {
      title: 'Plan',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '18776-5', display: 'Plan of Care' },
        ],
      },
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Operative Report Template
// ---------------------------------------------------------------------------

/**
 * Operative Report template for surgical procedure documentation.
 */
const OPERATIVE_REPORT_TEMPLATE: INoteTemplate = {
  templateId: 'hospital-operative-report',
  name: 'Operative Report',
  description:
    'Surgical operative report documenting procedure details, findings, anesthesia, and disposition.',
  loincTypeCode: '11504-8',
  specialtyCode: 'hospital',
  isDefault: true,
  sections: [
    {
      title: 'Preoperative Diagnosis',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '10219-4',
            display: 'Preoperative Diagnosis',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Postoperative Diagnosis',
      code: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '10218-6',
            display: 'Postoperative Diagnosis',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Procedure Performed',
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
      title: 'Surgeon(s)',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'surgeons',
            display: 'Surgeon(s)',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Anesthesia',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '59775-7', display: 'Anesthesia' },
        ],
      },
      required: true,
    },
    {
      title: 'Findings',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '59776-5', display: 'Findings' },
        ],
      },
      required: true,
    },
    {
      title: 'Estimated Blood Loss',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'estimated-blood-loss',
            display: 'Estimated Blood Loss',
          },
        ],
      },
      required: false,
    },
    {
      title: 'Specimens',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'specimens',
            display: 'Specimens',
          },
        ],
      },
      required: false,
    },
    {
      title: 'Complications',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '55109-3', display: 'Complications' },
        ],
      },
      required: false,
    },
    {
      title: 'Disposition',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'disposition',
            display: 'Disposition',
          },
        ],
      },
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Nursing Assessment Template
// ---------------------------------------------------------------------------

/**
 * Nursing Assessment template for inpatient nursing documentation.
 */
const NURSING_ASSESSMENT_TEMPLATE: INoteTemplate = {
  templateId: 'hospital-nursing-assessment',
  name: 'Nursing Assessment',
  description:
    'Inpatient nursing assessment covering patient status, pain, fall risk, skin integrity, and care plan.',
  loincTypeCode: '34746-8',
  specialtyCode: 'hospital',
  isDefault: true,
  sections: [
    {
      title: 'Patient Assessment',
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
      title: 'Pain Assessment',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'pain-assessment',
            display: 'Pain Assessment',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Fall Risk',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'fall-risk',
            display: 'Fall Risk',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Skin Assessment',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'skin-assessment',
            display: 'Skin Assessment',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Intake & Output',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'intake-output',
            display: 'Intake & Output',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Medications Administered',
      code: {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'medications-administered',
            display: 'Medications Administered',
          },
        ],
      },
      required: false,
    },
    {
      title: 'Nursing Plan',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '18776-5', display: 'Plan of Care' },
        ],
      },
      required: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Hospital Documentation Extension
// ---------------------------------------------------------------------------

/**
 * Hospital/inpatient documentation specialty extension.
 *
 * Includes hospital-specific templates (Admission Note, ICU Progress Note,
 * Operative Report, Nursing Assessment) plus reused H&P and Discharge
 * Summary templates, relevant LOINC document types, and custom section codes.
 */
export const HOSPITAL_DOCUMENTATION_EXTENSION: IDocumentationSpecialtyExtension =
  {
    specialtyCode: 'hospital',
    noteTemplates: [
      ADMISSION_NOTE_TEMPLATE,
      ICU_PROGRESS_NOTE_TEMPLATE,
      OPERATIVE_REPORT_TEMPLATE,
      NURSING_ASSESSMENT_TEMPLATE,
      HISTORY_AND_PHYSICAL_TEMPLATE,
      DISCHARGE_SUMMARY_TEMPLATE,
    ],
    documentTypeExtensions: [
      OPERATIVE_NOTE,
      NURSE_NOTE,
      DISCHARGE_SUMMARY,
      HISTORY_AND_PHYSICAL,
      PROGRESS_NOTE,
    ],
    sectionExtensions: [
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'ventilator-settings',
            display: 'Ventilator Settings',
          },
        ],
      },
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'hemodynamics',
            display: 'Hemodynamics',
          },
        ],
      },
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'intake-output',
            display: 'Intake & Output',
          },
        ],
      },
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'surgeons',
            display: 'Surgeon(s)',
          },
        ],
      },
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'estimated-blood-loss',
            display: 'Estimated Blood Loss',
          },
        ],
      },
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'specimens',
            display: 'Specimens',
          },
        ],
      },
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'disposition',
            display: 'Disposition',
          },
        ],
      },
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'pain-assessment',
            display: 'Pain Assessment',
          },
        ],
      },
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'fall-risk',
            display: 'Fall Risk',
          },
        ],
      },
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'skin-assessment',
            display: 'Skin Assessment',
          },
        ],
      },
      {
        coding: [
          {
            system: BRIGHTCHART_SECTION_SYSTEM,
            code: 'medications-administered',
            display: 'Medications Administered',
          },
        ],
      },
    ],
    validationRules: [],
  };
