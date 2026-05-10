/**
 * Dental Encounter Specialty Profile
 *
 * Defines the default encounter specialty extension for dental
 * encounters, including dental-specific encounter types, operatory/chair
 * location extensions, and the dental default workflow configuration.
 *
 * @module encounter/specialty/dentalEncounterProfile
 */

import {
  ENCOUNTER_CLASS_AMB,
  ENCOUNTER_CLASS_EMER,
  ENCOUNTER_CLASS_VR,
  EncounterStatus,
} from '../enumerations';
import type { IEncounterWorkflowConfig } from '../workflow/workflowTypes';
import type { IEncounterSpecialtyExtension } from './encounterSpecialtyTypes';

/** SNOMED CT system URI */
const SNOMED_SYSTEM = 'http://snomed.info/sct';

/** CDT (Code on Dental Procedures and Nomenclature) system URI */
const CDT_SYSTEM = 'http://www.ada.org/cdt';

/**
 * Dental default workflow configuration.
 *
 * States: Scheduled → Checked In → In Hygiene Chair → Waiting for Doctor
 *         → With Doctor → Checkout → Complete
 * Plus Cancelled as a terminal state.
 *
 * @see Requirement 11.3, 11.6
 */
const DENTAL_DEFAULT_WORKFLOW: IEncounterWorkflowConfig = {
  configId: 'dental-default',
  specialtyCode: 'dental',
  states: [
    {
      code: 'scheduled',
      displayName: 'Scheduled',
      mappedFhirStatus: EncounterStatus.Planned,
      description: 'Dental appointment scheduled',
      sortOrder: 1,
      isTerminal: false,
    },
    {
      code: 'checked-in',
      displayName: 'Checked In',
      mappedFhirStatus: EncounterStatus.Arrived,
      description: 'Patient has arrived and checked in',
      sortOrder: 2,
      isTerminal: false,
    },
    {
      code: 'in-hygiene-chair',
      displayName: 'In Hygiene Chair',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Patient is seated in the hygiene operatory',
      sortOrder: 3,
      isTerminal: false,
    },
    {
      code: 'waiting-for-doctor',
      displayName: 'Waiting for Doctor',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Hygiene complete, waiting for dentist exam',
      sortOrder: 4,
      isTerminal: false,
    },
    {
      code: 'with-doctor',
      displayName: 'With Doctor',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Patient is with the dentist',
      sortOrder: 5,
      isTerminal: false,
    },
    {
      code: 'checkout',
      displayName: 'Checkout',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Patient is at checkout (scheduling, payment)',
      sortOrder: 6,
      isTerminal: false,
    },
    {
      code: 'complete',
      displayName: 'Complete',
      mappedFhirStatus: EncounterStatus.Finished,
      description: 'Dental encounter is complete',
      sortOrder: 7,
      isTerminal: true,
    },
    {
      code: 'cancelled',
      displayName: 'Cancelled',
      mappedFhirStatus: EncounterStatus.Cancelled,
      description: 'Dental encounter was cancelled',
      sortOrder: 8,
      isTerminal: true,
    },
  ],
  transitions: [
    // scheduled → checked-in (planned → arrived)
    { fromState: 'scheduled', toState: 'checked-in' },
    // scheduled → cancelled (planned → cancelled)
    { fromState: 'scheduled', toState: 'cancelled' },
    // checked-in → in-hygiene-chair (arrived → in-progress)
    { fromState: 'checked-in', toState: 'in-hygiene-chair' },
    // checked-in → with-doctor (arrived → in-progress) — direct to doctor
    { fromState: 'checked-in', toState: 'with-doctor' },
    // checked-in → cancelled (arrived → cancelled)
    { fromState: 'checked-in', toState: 'cancelled' },
    // in-hygiene-chair → waiting-for-doctor (in-progress → in-progress)
    { fromState: 'in-hygiene-chair', toState: 'waiting-for-doctor' },
    // in-hygiene-chair → with-doctor (in-progress → in-progress)
    { fromState: 'in-hygiene-chair', toState: 'with-doctor' },
    // waiting-for-doctor → with-doctor (in-progress → in-progress)
    { fromState: 'waiting-for-doctor', toState: 'with-doctor' },
    // with-doctor → checkout (in-progress → in-progress)
    { fromState: 'with-doctor', toState: 'checkout' },
    // with-doctor → complete (in-progress → finished)
    { fromState: 'with-doctor', toState: 'complete' },
    // checkout → complete (in-progress → finished)
    { fromState: 'checkout', toState: 'complete' },
  ],
  defaultInitialState: 'scheduled',
};

/**
 * Dental encounter specialty extension.
 *
 * Includes dental-specific encounter types (periodic exam, emergency
 * dental, restorative visit), operatory/chair location extensions,
 * and the dental default workflow.
 *
 * @see Requirement 11.3
 */
export const DENTAL_ENCOUNTER_EXTENSION: IEncounterSpecialtyExtension = {
  specialtyCode: 'dental',

  encounterClassExtensions: [
    ENCOUNTER_CLASS_AMB,
    ENCOUNTER_CLASS_EMER,
    ENCOUNTER_CLASS_VR,
  ],

  encounterTypeExtensions: [
    {
      coding: [
        {
          system: CDT_SYSTEM,
          code: 'D0120',
          display: 'Periodic oral evaluation',
        },
        {
          system: SNOMED_SYSTEM,
          code: '34043003',
          display: 'Dental examination',
        },
      ],
      text: 'Periodic exam',
    },
    {
      coding: [
        {
          system: CDT_SYSTEM,
          code: 'D0140',
          display: 'Limited oral evaluation - problem focused',
        },
        {
          system: SNOMED_SYSTEM,
          code: '103697008',
          display: 'Emergency dental visit',
        },
      ],
      text: 'Emergency dental',
    },
    {
      coding: [
        { system: CDT_SYSTEM, code: 'D2000', display: 'Restorative' },
        {
          system: SNOMED_SYSTEM,
          code: '234713009',
          display: 'Restorative dental procedure',
        },
      ],
      text: 'Restorative visit',
    },
  ],

  validationRules: [],

  defaultWorkflowConfig: DENTAL_DEFAULT_WORKFLOW,
};
