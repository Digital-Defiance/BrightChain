/**
 * Hospital Encounter Specialty Profile
 *
 * Defines the default encounter specialty extension for hospital
 * (inpatient) encounters, including hospital-specific encounter classes
 * (IMP, EMER, SS, OBSENC), hospital encounter types (admission,
 * surgical admission, observation stay, day surgery, emergency admission),
 * bed/ward/unit location tracking extensions, and the hospital default
 * workflow configuration.
 *
 * @module encounter/specialty/hospitalEncounterProfile
 */

import {
  ENCOUNTER_CLASS_EMER,
  ENCOUNTER_CLASS_IMP,
  ENCOUNTER_CLASS_OBSENC,
  ENCOUNTER_CLASS_SS,
  EncounterStatus,
} from '../enumerations';
import type { IEncounterWorkflowConfig } from '../workflow/workflowTypes';
import type { IEncounterSpecialtyExtension } from './encounterSpecialtyTypes';

/** SNOMED CT system URI */
const SNOMED_SYSTEM = 'http://snomed.info/sct';

/**
 * Hospital default workflow configuration.
 *
 * States: Pre-Admission → Admitted → In Ward → In Surgery → In Recovery
 *         → In ICU → Awaiting Discharge → Discharged
 * Plus Cancelled as a terminal state.
 *
 * @see Requirement 11.1, 11.6
 */
const HOSPITAL_DEFAULT_WORKFLOW: IEncounterWorkflowConfig = {
  configId: 'hospital-default',
  specialtyCode: 'hospital',
  states: [
    {
      code: 'pre-admission',
      displayName: 'Pre-Admission',
      mappedFhirStatus: EncounterStatus.Planned,
      description: 'Patient is in the pre-admission process',
      sortOrder: 1,
      isTerminal: false,
    },
    {
      code: 'admitted',
      displayName: 'Admitted',
      mappedFhirStatus: EncounterStatus.Arrived,
      description: 'Patient has been admitted to the hospital',
      sortOrder: 2,
      isTerminal: false,
    },
    {
      code: 'in-ward',
      displayName: 'In Ward',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Patient is in a hospital ward/bed',
      sortOrder: 3,
      isTerminal: false,
    },
    {
      code: 'in-surgery',
      displayName: 'In Surgery',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Patient is undergoing a surgical procedure',
      sortOrder: 4,
      isTerminal: false,
    },
    {
      code: 'in-recovery',
      displayName: 'In Recovery',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Patient is in post-operative recovery',
      sortOrder: 5,
      isTerminal: false,
    },
    {
      code: 'in-icu',
      displayName: 'In ICU',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Patient is in the intensive care unit',
      sortOrder: 6,
      isTerminal: false,
    },
    {
      code: 'awaiting-discharge',
      displayName: 'Awaiting Discharge',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Patient is medically cleared and awaiting discharge',
      sortOrder: 7,
      isTerminal: false,
    },
    {
      code: 'discharged',
      displayName: 'Discharged',
      mappedFhirStatus: EncounterStatus.Finished,
      description: 'Patient has been discharged from the hospital',
      sortOrder: 8,
      isTerminal: true,
    },
    {
      code: 'cancelled',
      displayName: 'Cancelled',
      mappedFhirStatus: EncounterStatus.Cancelled,
      description: 'Hospital encounter was cancelled',
      sortOrder: 9,
      isTerminal: true,
    },
  ],
  transitions: [
    // pre-admission → admitted (planned → arrived)
    { fromState: 'pre-admission', toState: 'admitted' },
    // pre-admission → cancelled (planned → cancelled)
    { fromState: 'pre-admission', toState: 'cancelled' },
    // admitted → in-ward (arrived → in-progress)
    { fromState: 'admitted', toState: 'in-ward' },
    // admitted → in-surgery (arrived → in-progress) — direct to surgery
    { fromState: 'admitted', toState: 'in-surgery' },
    // admitted → in-icu (arrived → in-progress) — direct to ICU
    { fromState: 'admitted', toState: 'in-icu' },
    // admitted → cancelled (arrived → cancelled)
    { fromState: 'admitted', toState: 'cancelled' },
    // in-ward → in-surgery (in-progress → in-progress)
    { fromState: 'in-ward', toState: 'in-surgery' },
    // in-ward → in-icu (in-progress → in-progress)
    { fromState: 'in-ward', toState: 'in-icu' },
    // in-ward → awaiting-discharge (in-progress → in-progress)
    { fromState: 'in-ward', toState: 'awaiting-discharge' },
    // in-ward → discharged (in-progress → finished)
    { fromState: 'in-ward', toState: 'discharged' },
    // in-surgery → in-recovery (in-progress → in-progress)
    { fromState: 'in-surgery', toState: 'in-recovery' },
    // in-surgery → in-icu (in-progress → in-progress)
    { fromState: 'in-surgery', toState: 'in-icu' },
    // in-recovery → in-ward (in-progress → in-progress)
    { fromState: 'in-recovery', toState: 'in-ward' },
    // in-recovery → in-icu (in-progress → in-progress)
    { fromState: 'in-recovery', toState: 'in-icu' },
    // in-recovery → awaiting-discharge (in-progress → in-progress)
    { fromState: 'in-recovery', toState: 'awaiting-discharge' },
    // in-icu → in-ward (in-progress → in-progress)
    { fromState: 'in-icu', toState: 'in-ward' },
    // in-icu → in-surgery (in-progress → in-progress)
    { fromState: 'in-icu', toState: 'in-surgery' },
    // in-icu → awaiting-discharge (in-progress → in-progress)
    { fromState: 'in-icu', toState: 'awaiting-discharge' },
    // awaiting-discharge → discharged (in-progress → finished)
    { fromState: 'awaiting-discharge', toState: 'discharged' },
    // awaiting-discharge → in-ward (in-progress → in-progress) — discharge cancelled
    { fromState: 'awaiting-discharge', toState: 'in-ward' },
  ],
  defaultInitialState: 'pre-admission',
};

/**
 * Hospital encounter specialty extension.
 *
 * Includes hospital-specific encounter classes (IMP, EMER, SS, OBSENC),
 * hospital encounter types (admission, surgical admission, observation
 * stay, day surgery, emergency admission), and bed/ward/unit location
 * tracking extensions.
 *
 * @see Requirement 11.1
 */
export const HOSPITAL_ENCOUNTER_EXTENSION: IEncounterSpecialtyExtension = {
  specialtyCode: 'hospital',

  encounterClassExtensions: [
    ENCOUNTER_CLASS_IMP,
    ENCOUNTER_CLASS_EMER,
    ENCOUNTER_CLASS_SS,
    ENCOUNTER_CLASS_OBSENC,
  ],

  encounterTypeExtensions: [
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '32485007',
          display: 'Hospital admission',
        },
      ],
      text: 'Admission',
    },
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '305408004',
          display: 'Admission to surgical department',
        },
      ],
      text: 'Surgical admission',
    },
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '448951000124107',
          display: 'Observation stay',
        },
      ],
      text: 'Observation stay',
    },
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '305408004',
          display: 'Day surgery admission',
        },
      ],
      text: 'Day surgery',
    },
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '50849002',
          display: 'Emergency department admission',
        },
      ],
      text: 'Emergency admission',
    },
  ],

  validationRules: [],

  defaultWorkflowConfig: HOSPITAL_DEFAULT_WORKFLOW,
};
