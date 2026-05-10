/**
 * Veterinary Documentation Specialty Extension
 *
 * Veterinary-specific note templates with species-specific examination
 * sections, herd health report templates, and vaccination certificate
 * templates.
 *
 * @module documentation/specialty/veterinaryDocProfile
 */

import type { INoteTemplate } from '../templates/noteTemplateTypes';
import type { IDocumentationSpecialtyExtension } from './documentationSpecialtyTypes';

/** LOINC terminology system URI */
const LOINC_SYSTEM = 'http://loinc.org';

/** VeNom veterinary terminology system URI */
const VENOM_SYSTEM = 'http://www.venomcoding.org';

/**
 * Species-Specific Examination template.
 */
const VET_EXAM_TEMPLATE: INoteTemplate = {
  templateId: 'vet-species-exam',
  name: 'Species-Specific Examination',
  description:
    'Veterinary examination template with species-specific physical exam sections and body condition scoring.',
  loincTypeCode: '11506-3',
  specialtyCode: 'veterinary',
  isDefault: true,
  sections: [
    {
      title: 'Presenting Complaint',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '10154-3', display: 'Chief Complaint' },
        ],
      },
      required: true,
    },
    {
      title: 'Species & Signalment',
      code: {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'signalment',
            display: 'Species & Signalment',
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
      title: 'Body Condition Score',
      code: {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'body-condition-score',
            display: 'Body Condition Score',
          },
        ],
      },
      required: false,
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

/**
 * Herd Health Report template.
 */
const HERD_HEALTH_TEMPLATE: INoteTemplate = {
  templateId: 'vet-herd-health',
  name: 'Herd Health Report',
  description:
    'Veterinary herd health assessment report for livestock and group animal management.',
  loincTypeCode: '11506-3',
  specialtyCode: 'veterinary',
  isDefault: false,
  sections: [
    {
      title: 'Herd Identification',
      code: {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'herd-id',
            display: 'Herd Identification',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Population Summary',
      code: {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'population-summary',
            display: 'Population Summary',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Health Assessment',
      code: {
        coding: [
          { system: LOINC_SYSTEM, code: '51848-0', display: 'Assessment' },
        ],
      },
      required: true,
    },
    {
      title: 'Recommendations',
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
 * Vaccination Certificate template.
 */
const VACCINATION_CERTIFICATE_TEMPLATE: INoteTemplate = {
  templateId: 'vet-vaccination-cert',
  name: 'Vaccination Certificate',
  description:
    'Veterinary vaccination certificate documenting administered vaccines, lot numbers, and next due dates.',
  loincTypeCode: '11506-3',
  specialtyCode: 'veterinary',
  isDefault: false,
  sections: [
    {
      title: 'Animal Identification',
      code: {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'animal-id',
            display: 'Animal Identification',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Vaccines Administered',
      code: {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'vaccines-administered',
            display: 'Vaccines Administered',
          },
        ],
      },
      required: true,
    },
    {
      title: 'Next Due Dates',
      code: {
        coding: [
          { system: VENOM_SYSTEM, code: 'next-due', display: 'Next Due Dates' },
        ],
      },
      required: true,
    },
    {
      title: 'Veterinarian Certification',
      code: {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'vet-certification',
            display: 'Veterinarian Certification',
          },
        ],
      },
      required: true,
    },
  ],
};

/**
 * Veterinary documentation specialty extension.
 */
export const VETERINARY_DOCUMENTATION_EXTENSION: IDocumentationSpecialtyExtension =
  {
    specialtyCode: 'veterinary',
    noteTemplates: [
      VET_EXAM_TEMPLATE,
      HERD_HEALTH_TEMPLATE,
      VACCINATION_CERTIFICATE_TEMPLATE,
    ],
    documentTypeExtensions: [
      {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'vet-exam',
            display: 'Veterinary Examination',
          },
        ],
      },
      {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'herd-health',
            display: 'Herd Health Report',
          },
        ],
      },
      {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'vaccination-cert',
            display: 'Vaccination Certificate',
          },
        ],
      },
    ],
    sectionExtensions: [
      {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'signalment',
            display: 'Species & Signalment',
          },
        ],
      },
      {
        coding: [
          {
            system: VENOM_SYSTEM,
            code: 'body-condition-score',
            display: 'Body Condition Score',
          },
        ],
      },
    ],
    validationRules: [],
  };
