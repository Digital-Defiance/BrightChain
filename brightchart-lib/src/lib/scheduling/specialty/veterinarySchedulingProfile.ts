/**
 * Veterinary Scheduling Profile
 *
 * Defines veterinary-specific appointment types, species-aware default
 * durations, farm call scheduling with travel time, and herd vaccination
 * block scheduling rules.
 *
 * @see Requirement 15.4
 * @module scheduling/specialty
 */

import type {
  ISchedulingRule,
  ISchedulingSpecialtyExtension,
} from './schedulingSpecialtyTypes';

/** Service-type codes used as keys in the defaultDurations map */
const CAT_EXAM = 'cat-exam';
const DOG_EXAM = 'dog-exam';
const EQUINE_EXAM = 'equine-exam';
const FARM_CALL = 'farm-call';

/**
 * Species-aware duration rule.
 *
 * Veterinary appointments vary significantly in duration based on the
 * species being treated. This rule enables the scheduler to override
 * the default duration based on the species associated with the
 * appointment.
 */
const SPECIES_AWARE_DURATION_RULE: ISchedulingRule = {
  ruleId: 'vet-species-aware-duration',
  description:
    'Appointment duration is determined by the species being treated',
  ruleType: 'duration-override',
  parameters: {
    speciesDurations: {
      [CAT_EXAM]: 20,
      [DOG_EXAM]: 30,
      [EQUINE_EXAM]: 60,
      [FARM_CALL]: 120,
    },
  },
};

/**
 * Farm call scheduling rule.
 *
 * Farm calls require additional travel time and are location-based.
 * This rule ensures that farm call appointments account for travel
 * time and are associated with an off-site location resource.
 */
const FARM_CALL_SCHEDULING_RULE: ISchedulingRule = {
  ruleId: 'vet-farm-call-scheduling',
  description:
    'Farm call appointments include travel time and require a location resource',
  ruleType: 'resource-requirement',
  parameters: {
    applicableServiceTypes: [FARM_CALL],
    resourceType: 'Location',
    resourceSubType: 'farm',
    includesTravelTime: true,
    required: true,
  },
};

/**
 * Herd vaccination block scheduling rule.
 *
 * Herd vaccinations are scheduled as a single block covering multiple
 * animals. This rule enables block scheduling where one appointment
 * slot covers the entire herd rather than individual animals.
 */
const HERD_VACCINATION_BLOCK_RULE: ISchedulingRule = {
  ruleId: 'vet-herd-vaccination-block',
  description:
    'Herd vaccinations are scheduled as a single block for multiple animals',
  ruleType: 'block-scheduling',
  parameters: {
    applicableServiceTypes: [FARM_CALL],
    blockType: 'herd-vaccination',
    allowMultipleAnimals: true,
    minimumBlockMinutes: 60,
  },
};

/**
 * Pre-built scheduling extension for veterinary practices.
 *
 * - Four standard veterinary appointment types: Cat Exam, Dog Exam,
 *   Equine Exam, Farm Call
 * - Default durations: 20 min, 30 min, 60 min, 120 min respectively
 * - Species-aware duration overrides (duration-override rule)
 * - Farm call scheduling with travel time (resource-requirement rule)
 * - Herd vaccination block scheduling (block-scheduling rule)
 */
export const VETERINARY_SCHEDULING_EXTENSION: ISchedulingSpecialtyExtension = {
  specialtyCode: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '394812008',
        display: 'Veterinary medicine',
      },
    ],
    text: 'Veterinary medicine',
  },

  appointmentTypeExtensions: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: CAT_EXAM,
          display: 'Cat Exam',
        },
      ],
      text: 'Cat Exam',
    },
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: DOG_EXAM,
          display: 'Dog Exam',
        },
      ],
      text: 'Dog Exam',
    },
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: EQUINE_EXAM,
          display: 'Equine Exam',
        },
      ],
      text: 'Equine Exam',
    },
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
          code: FARM_CALL,
          display: 'Farm Call',
        },
      ],
      text: 'Farm Call',
    },
  ],

  defaultDurations: {
    [CAT_EXAM]: 20,
    [DOG_EXAM]: 30,
    [EQUINE_EXAM]: 60,
    [FARM_CALL]: 120,
  },

  schedulingRules: [
    SPECIES_AWARE_DURATION_RULE,
    FARM_CALL_SCHEDULING_RULE,
    HERD_VACCINATION_BLOCK_RULE,
  ],
};
