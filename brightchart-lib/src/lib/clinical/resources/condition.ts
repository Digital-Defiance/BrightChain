/**
 * FHIR R4 Condition Resource with BrightChain Metadata
 *
 * Defines the `IConditionResource<TID>` interface representing a FHIR R4
 * Condition resource augmented with BrightChain storage metadata.
 * Supports diagnoses, problem list entries, and health concerns.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/condition.html
 * @module clinical/resources/condition
 */

import {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IPeriod,
  IReference,
} from '../../fhir/datatypes';
import { IBrightchainMetadata } from '../../fhir/patientResource';
import { ConditionEvidence, ConditionStage } from '../backboneElements';
import { IAge, IRange } from '../datatypes';

/**
 * FHIR R4 Condition Resource with BrightChain extensions.
 *
 * Represents clinical conditions, problems, diagnoses, or health concerns
 * linked to a patient and optionally to an encounter.
 *
 * @see https://build.fhir.org/condition.html
 */
export interface IConditionResource<TID = string> {
  /** Fixed value: 'Condition' */
  resourceType: 'Condition';

  // --- FHIR metadata fields ---

  /** Logical id of this artifact */
  id?: string;

  /** Metadata about the resource */
  meta?: IMeta;

  /** Text summary of the resource */
  text?: INarrative;

  /** Additional content defined by implementations */
  extension?: IExtension[];

  // --- BrightChain metadata ---

  /** BrightChain storage metadata */
  brightchainMetadata: IBrightchainMetadata<TID>;

  // --- FHIR R4 Condition fields ---

  /** Business identifiers assigned to this condition */
  identifier?: IIdentifier<TID>[];

  /** active | recurrence | relapse | inactive | remission | resolved */
  clinicalStatus?: ICodeableConcept;

  /** unconfirmed | provisional | differential | confirmed | refuted | entered-in-error */
  verificationStatus?: ICodeableConcept;

  /** Classification of type of condition (e.g. problem-list-item, encounter-diagnosis) */
  category?: ICodeableConcept[];

  /** Subjective severity of condition */
  severity?: ICodeableConcept;

  /** Identification of the condition, problem or diagnosis */
  code?: ICodeableConcept;

  /** Anatomical location, if relevant */
  bodySite?: ICodeableConcept[];

  /** Who has the condition (Patient reference, required) */
  subject: IReference<TID>;

  /** Healthcare event during which this condition was first asserted (forward-compatible Encounter reference) */
  encounter?: IReference<TID>;

  // --- onset[x] polymorphic types ---

  /** Estimated or actual date/time the condition began (dateTime) */
  onsetDateTime?: string;

  /** Estimated or actual date/time the condition began (Age) */
  onsetAge?: IAge;

  /** Estimated or actual date/time the condition began (Period) */
  onsetPeriod?: IPeriod;

  /** Estimated or actual date/time the condition began (Range) */
  onsetRange?: IRange;

  /** Estimated or actual date/time the condition began (string) */
  onsetString?: string;

  // --- abatement[x] polymorphic types ---

  /** When in resolution/remission (dateTime) */
  abatementDateTime?: string;

  /** When in resolution/remission (Age) */
  abatementAge?: IAge;

  /** When in resolution/remission (Period) */
  abatementPeriod?: IPeriod;

  /** When in resolution/remission (Range) */
  abatementRange?: IRange;

  /** When in resolution/remission (string) */
  abatementString?: string;

  // --- Additional Condition fields ---

  /** Date record was first recorded (dateTime) */
  recordedDate?: string;

  /** Who recorded the condition */
  recorder?: IReference<TID>;

  /** Person who asserts this condition */
  asserter?: IReference<TID>;

  /** Stage/grade, usually assessed formally */
  stage?: ConditionStage<TID>[];

  /** Supporting evidence */
  evidence?: ConditionEvidence<TID>[];
}
