/**
 * Dental Scheduling Profile
 *
 * Defines dental-specific appointment types, default durations,
 * operatory/chair-based scheduling, and hygienist-then-doctor
 * sequencing rules.
 *
 * @see Requirement 15.3
 * @module scheduling/specialty
 */

import type {
  ISchedulingRule,
  ISchedulingSpecialtyExtension,
} from './schedulingSpecialtyTypes';

/** Service-type codes used as keys in the defaultDurations map */
const CLEANING = 'cleaning-prophylaxis';
const FILLING = 'filling';
const CROWN_PREP = 'crown-prep';
const EMERGENCY = 'emergency-dental';

/**
 * Operatory / chair-based scheduling rule.
 *
 * Dental appointments require an operatory (chair) resource to be
 * assigned. This rule ensures that every dental appointment is
 * associated with an available operatory.
 */
const OPERATORY_RULE: ISchedulingRule = {
  ruleId: 'dental-operatory-requirement',
  description:
    'Dental appointments require an operatory (chair) resource assignment',
  ruleType: 'resource-requirement',
  parameters: {
    resourceType: 'Location',
    resourceSubType: 'operatory',
    required: true,
  },
};

/**
 * Hygienist-then-doctor sequencing rule.
 *
 * Cleaning / prophylaxis appointments follow a two-phase sequence:
 * the hygienist performs the cleaning first, then the doctor performs
 * a check / exam. This rule encodes that sequencing constraint.
 */
const HYGIENIST_THEN_DOCTOR_RULE: ISchedulingRule = {
  ruleId: 'dental-hygienist-then-doctor',
  description:
    'Cleaning appointments require hygienist first, then doctor check',
  ruleType: 'sequencing',
  parameters: {
    applicableServiceTypes: [CLEANING],
    sequence: [
      { role: 'hygienist', phase: 'cleaning' },
      { role: 'doctor', phase: 'exam' },
    ],
  },
};

/**
 * Pre-built scheduling extension for dental practices.
 *
 * - Four standard dental appointment types: Cleaning/Prophylaxis,
 *   Filling, Crown Prep, Emergency
 * - Default durations: 60 min, 30 min, 90 min, 30 min respectively
 * - Operatory/chair-based scheduling (resource-requirement rule)
 * - Hygienist-then-doctor sequencing for cleaning appointments
 */
export const DENTAL_SCHEDULING_EXTENSION: ISchedulingSpecialtyExtension = {
  specialtyCode: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '722163006',
        display: 'Dentistry',
      },
    ],
    text: 'Dentistry',
  },

  appointmentTypeExtensions: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: CLEANING,
          display: 'Cleaning/Prophylaxis',
        },
      ],
      text: 'Cleaning/Prophylaxis',
    },
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: FILLING,
          display: 'Filling',
        },
      ],
      text: 'Filling',
    },
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: CROWN_PREP,
          display: 'Crown Prep',
        },
      ],
      text: 'Crown Prep',
    },
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: EMERGENCY,
          display: 'Emergency',
        },
      ],
      text: 'Emergency',
    },
  ],

  defaultDurations: {
    [CLEANING]: 60,
    [FILLING]: 30,
    [CROWN_PREP]: 90,
    [EMERGENCY]: 30,
  },

  schedulingRules: [OPERATORY_RULE, HYGIENIST_THEN_DOCTOR_RULE],
};
