/**
 * Medical / General Practice Scheduling Profile
 *
 * Defines standard appointment types and default durations for
 * medical/general-practice scheduling.
 *
 * @see Requirement 15.2
 * @module scheduling/specialty
 */

import type { ISchedulingSpecialtyExtension } from './schedulingSpecialtyTypes';

/** Service-type codes used as keys in the defaultDurations map */
const NEW_PATIENT = 'new-patient';
const FOLLOW_UP = 'follow-up';
const PHYSICAL_EXAM = 'physical-exam';

/**
 * Pre-built scheduling extension for medical / general-practice.
 *
 * - Three standard appointment types: New Patient, Follow-up, Physical Exam
 * - Default durations: 60 min, 15 min, 30 min respectively
 * - No specialty-specific sequencing rules
 */
export const MEDICAL_SCHEDULING_EXTENSION: ISchedulingSpecialtyExtension = {
  specialtyCode: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '394802001',
        display: 'General medicine',
      },
    ],
    text: 'General medicine',
  },

  appointmentTypeExtensions: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: NEW_PATIENT,
          display: 'New Patient',
        },
      ],
      text: 'New Patient',
    },
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: FOLLOW_UP,
          display: 'Follow-up',
        },
      ],
      text: 'Follow-up',
    },
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: PHYSICAL_EXAM,
          display: 'Physical Exam',
        },
      ],
      text: 'Physical Exam',
    },
  ],

  defaultDurations: {
    [NEW_PATIENT]: 60,
    [FOLLOW_UP]: 15,
    [PHYSICAL_EXAM]: 30,
  },

  schedulingRules: [],
};
