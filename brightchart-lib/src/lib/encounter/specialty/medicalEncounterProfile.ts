/**
 * Medical Encounter Specialty Profile
 *
 * Defines the default encounter specialty extension for medical
 * (general practice / outpatient / inpatient) encounters, including
 * standard HL7 v3 ActCode classes, SNOMED CT encounter types, and
 * the medical default workflow configuration.
 *
 * @module encounter/specialty/medicalEncounterProfile
 */

import {
  ENCOUNTER_CLASS_AMB,
  ENCOUNTER_CLASS_EMER,
  ENCOUNTER_CLASS_HH,
  ENCOUNTER_CLASS_IMP,
  ENCOUNTER_CLASS_VR,
  EncounterStatus,
} from '../enumerations';
import type { IEncounterWorkflowConfig } from '../workflow/workflowTypes';
import type { IEncounterSpecialtyExtension } from './encounterSpecialtyTypes';

/** SNOMED CT system URI */
const SNOMED_SYSTEM = 'http://snomed.info/sct';

/**
 * Medical default workflow configuration.
 *
 * States: Scheduled → Checked In → Triage → With Provider → Checkout → Complete
 * Plus Cancelled as a terminal state reachable from early states.
 *
 * All transitions map to valid FHIR status transitions per
 * `ENCOUNTER_STATUS_TRANSITIONS`.
 *
 * @see Requirement 11.2, 11.6
 */
const MEDICAL_DEFAULT_WORKFLOW: IEncounterWorkflowConfig = {
  configId: 'medical-default',
  specialtyCode: 'medical',
  states: [
    {
      code: 'scheduled',
      displayName: 'Scheduled',
      mappedFhirStatus: EncounterStatus.Planned,
      description: 'Appointment scheduled, patient not yet arrived',
      sortOrder: 1,
      isTerminal: false,
    },
    {
      code: 'checked-in',
      displayName: 'Checked In',
      mappedFhirStatus: EncounterStatus.Arrived,
      description: 'Patient has arrived and checked in at the front desk',
      sortOrder: 2,
      isTerminal: false,
    },
    {
      code: 'triage',
      displayName: 'Triage',
      mappedFhirStatus: EncounterStatus.Triaged,
      description: 'Patient is being triaged (vitals, chief complaint)',
      sortOrder: 3,
      isTerminal: false,
    },
    {
      code: 'with-provider',
      displayName: 'With Provider',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Patient is with the provider for examination',
      sortOrder: 4,
      isTerminal: false,
    },
    {
      code: 'checkout',
      displayName: 'Checkout',
      mappedFhirStatus: EncounterStatus.InProgress,
      description: 'Patient is at checkout (scheduling follow-up, payment)',
      sortOrder: 5,
      isTerminal: false,
    },
    {
      code: 'complete',
      displayName: 'Complete',
      mappedFhirStatus: EncounterStatus.Finished,
      description: 'Encounter is complete',
      sortOrder: 6,
      isTerminal: true,
    },
    {
      code: 'cancelled',
      displayName: 'Cancelled',
      mappedFhirStatus: EncounterStatus.Cancelled,
      description: 'Encounter was cancelled',
      sortOrder: 7,
      isTerminal: true,
    },
  ],
  transitions: [
    // scheduled → checked-in (planned → arrived)
    { fromState: 'scheduled', toState: 'checked-in' },
    // scheduled → cancelled (planned → cancelled)
    { fromState: 'scheduled', toState: 'cancelled' },
    // checked-in → triage (arrived → triaged)
    { fromState: 'checked-in', toState: 'triage' },
    // checked-in → cancelled (arrived → cancelled)
    { fromState: 'checked-in', toState: 'cancelled' },
    // triage → with-provider (triaged → in-progress)
    { fromState: 'triage', toState: 'with-provider' },
    // triage → cancelled (triaged → cancelled)
    { fromState: 'triage', toState: 'cancelled' },
    // with-provider → checkout (in-progress → in-progress, same FHIR status)
    { fromState: 'with-provider', toState: 'checkout' },
    // with-provider → complete (in-progress → finished)
    { fromState: 'with-provider', toState: 'complete' },
    // with-provider → cancelled (in-progress → cancelled)
    { fromState: 'with-provider', toState: 'cancelled' },
    // checkout → complete (in-progress → finished)
    { fromState: 'checkout', toState: 'complete' },
  ],
  defaultInitialState: 'scheduled',
};

/**
 * Medical encounter specialty extension.
 *
 * Includes standard HL7 v3 ActCode encounter classes (IMP, AMB, EMER,
 * HH, VR), SNOMED CT encounter types, and the medical default workflow.
 *
 * @see Requirement 11.2
 */
export const MEDICAL_ENCOUNTER_EXTENSION: IEncounterSpecialtyExtension = {
  specialtyCode: 'medical',

  encounterClassExtensions: [
    ENCOUNTER_CLASS_IMP,
    ENCOUNTER_CLASS_AMB,
    ENCOUNTER_CLASS_EMER,
    ENCOUNTER_CLASS_HH,
    ENCOUNTER_CLASS_VR,
  ],

  encounterTypeExtensions: [
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '270427003',
          display: 'Patient-initiated encounter',
        },
      ],
      text: 'Patient-initiated encounter',
    },
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '185349003',
          display: 'Encounter for check up',
        },
      ],
      text: 'Encounter for check up',
    },
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '50849002',
          display: 'Emergency department visit',
        },
      ],
      text: 'Emergency department visit',
    },
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '281036007',
          display: 'Follow-up consultation',
        },
      ],
      text: 'Follow-up consultation',
    },
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '439740005',
          display: 'Postoperative follow-up visit',
        },
      ],
      text: 'Postoperative follow-up visit',
    },
  ],

  validationRules: [],

  defaultWorkflowConfig: MEDICAL_DEFAULT_WORKFLOW,
};
