/**
 * Veterinary Encounter Specialty Profile
 *
 * Defines the default encounter specialty extension for veterinary
 * encounters, including veterinary-specific encounter types (wellness
 * exam, vaccination visit, surgical procedure, farm call), species-aware
 * triage, herd/flock group encounter support, and the veterinary default
 * workflow configuration.
 *
 * @module encounter/specialty/veterinaryEncounterProfile
 */

import {
  ENCOUNTER_CLASS_AMB,
  ENCOUNTER_CLASS_EMER,
  ENCOUNTER_CLASS_FLD,
  ENCOUNTER_CLASS_VR,
  EncounterStatus,
} from '../enumerations';
import type { IEncounterWorkflowConfig } from '../workflow/workflowTypes';
import type { IEncounterSpecialtyExtension } from './encounterSpecialtyTypes';

/** SNOMED CT system URI */
const _SNOMED_SYSTEM = 'http://snomed.info/sct';

/** SNOMED CT Veterinary extension system URI */
const SNOMED_VET_SYSTEM = 'http://snomed.info/sct/veterinary';

/**
 * Veterinary default workflow configuration.
 *
 * States: Appointment Booked → In Waiting Room → Triage/Weigh-in
 *         → In Exam Room → In Surgery → In Recovery → Owner Pickup
 *         → Discharged
 * Plus Cancelled as a terminal state.
 *
 * @see Requirement 11.4, 11.6
 */
const VETERINARY_DEFAULT_WORKFLOW: IEncounterWorkflowConfig = {
  configId: 'veterinary-default',
  specialtyCode: 'veterinary',
  states: [
    {
      code: 'appointment-booked',
      displayName: 'Appointment Booked',
      mappedFhirStatus: EncounterStatus.Planned,
      description: 'Veterinary appointment has been booked',
      sortOrder: 1,
      isTerminal: false,
    },
    {
      code: 'in-waiting-room',
      displayName: 'In Waiting Room',
      mappedFhirStatus: EncounterStatus.Arrived,
      description: 'Animal and owner are in the waiting room',
      sortOrder: 2,
      isTerminal: false,
    },
    {
      code: 'triage-weigh-in',
      displayName: 'Triage/Weigh-in',
      mappedFhirStatus: EncounterStatus.Triaged,
      description: 'Species-aware triage: weight, vitals, chief complaint',
      sortOrder: 3,
      isTerminal: false,
    },
    {
      code: 'in-exam-room',
      displayName: 'In Exam Room',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Animal is being examined by the veterinarian',
      sortOrder: 4,
      isTerminal: false,
    },
    {
      code: 'in-surgery',
      displayName: 'In Surgery',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Animal is undergoing a surgical procedure',
      sortOrder: 5,
      isTerminal: false,
    },
    {
      code: 'in-recovery',
      displayName: 'In Recovery',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Animal is recovering post-procedure',
      sortOrder: 6,
      isTerminal: false,
    },
    {
      code: 'owner-pickup',
      displayName: 'Owner Pickup',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Animal is ready for owner pickup',
      sortOrder: 7,
      isTerminal: false,
    },
    {
      code: 'discharged',
      displayName: 'Discharged',
      mappedFhirStatus: EncounterStatus.Finished,
      description: 'Animal has been discharged to owner',
      sortOrder: 8,
      isTerminal: true,
    },
    {
      code: 'cancelled',
      displayName: 'Cancelled',
      mappedFhirStatus: EncounterStatus.Cancelled,
      description: 'Veterinary encounter was cancelled',
      sortOrder: 9,
      isTerminal: true,
    },
  ],
  transitions: [
    // appointment-booked → in-waiting-room (planned → arrived)
    { fromState: 'appointment-booked', toState: 'in-waiting-room' },
    // appointment-booked → cancelled (planned → cancelled)
    { fromState: 'appointment-booked', toState: 'cancelled' },
    // in-waiting-room → triage-weigh-in (arrived → triaged)
    { fromState: 'in-waiting-room', toState: 'triage-weigh-in' },
    // in-waiting-room → cancelled (arrived → cancelled)
    { fromState: 'in-waiting-room', toState: 'cancelled' },
    // triage-weigh-in → in-exam-room (triaged → in-progress)
    { fromState: 'triage-weigh-in', toState: 'in-exam-room' },
    // triage-weigh-in → cancelled (triaged → cancelled)
    { fromState: 'triage-weigh-in', toState: 'cancelled' },
    // in-exam-room → in-surgery (in-progress → in-progress)
    { fromState: 'in-exam-room', toState: 'in-surgery' },
    // in-exam-room → owner-pickup (in-progress → in-progress)
    { fromState: 'in-exam-room', toState: 'owner-pickup' },
    // in-exam-room → discharged (in-progress → finished)
    { fromState: 'in-exam-room', toState: 'discharged' },
    // in-exam-room → cancelled (in-progress → cancelled)
    { fromState: 'in-exam-room', toState: 'cancelled' },
    // in-surgery → in-recovery (in-progress → in-progress)
    { fromState: 'in-surgery', toState: 'in-recovery' },
    // in-recovery → owner-pickup (in-progress → in-progress)
    { fromState: 'in-recovery', toState: 'owner-pickup' },
    // in-recovery → discharged (in-progress → finished)
    { fromState: 'in-recovery', toState: 'discharged' },
    // owner-pickup → discharged (in-progress → finished)
    { fromState: 'owner-pickup', toState: 'discharged' },
  ],
  defaultInitialState: 'appointment-booked',
};

/**
 * Veterinary encounter specialty extension.
 *
 * Includes veterinary-specific encounter types (wellness exam,
 * vaccination visit, surgical procedure, farm call), species-aware
 * triage support, herd/flock group encounter support, and the
 * veterinary default workflow.
 *
 * @see Requirement 11.4
 */
export const VETERINARY_ENCOUNTER_EXTENSION: IEncounterSpecialtyExtension = {
  specialtyCode: 'veterinary',

  encounterClassExtensions: [
    ENCOUNTER_CLASS_AMB,
    ENCOUNTER_CLASS_EMER,
    ENCOUNTER_CLASS_FLD,
    ENCOUNTER_CLASS_VR,
  ],

  encounterTypeExtensions: [
    {
      coding: [
        {
          system: SNOMED_VET_SYSTEM,
          code: '410620009',
          display: 'Wellness examination',
        },
      ],
      text: 'Wellness exam',
    },
    {
      coding: [
        {
          system: SNOMED_VET_SYSTEM,
          code: '33879002',
          display: 'Vaccination visit',
        },
      ],
      text: 'Vaccination visit',
    },
    {
      coding: [
        {
          system: SNOMED_VET_SYSTEM,
          code: '387713003',
          display: 'Surgical procedure',
        },
      ],
      text: 'Surgical procedure',
    },
    {
      coding: [
        { system: SNOMED_VET_SYSTEM, code: '3457005', display: 'Farm call' },
      ],
      text: 'Farm call',
    },
  ],

  validationRules: [],

  defaultWorkflowConfig: VETERINARY_DEFAULT_WORKFLOW,
};
