/**
 * FHIR R4 Clinical Resource Backbone Elements
 *
 * Exported TypeScript interfaces for backbone elements used by clinical
 * resources: ObservationReferenceRange, ObservationComponent, ConditionStage,
 * ConditionEvidence, AllergyIntoleranceReaction, MedicationIngredient,
 * MedicationBatch, ProcedurePerformer, ProcedureFocalDevice.
 *
 * Interfaces containing IReference fields are generic on `<TID = string>`
 * to support both frontend (string) and backend (Uint8Array) usage.
 *
 * @see https://build.fhir.org/observation.html
 * @see https://build.fhir.org/condition.html
 * @see https://build.fhir.org/allergyintolerance.html
 * @see https://build.fhir.org/medication.html
 * @see https://build.fhir.org/procedure.html
 * @module clinical/backboneElements
 */

import type { IPeriod } from '../fhir/datatypes';
import { ICodeableConcept, IReference } from '../fhir/datatypes';
import {
  IAnnotation,
  IQuantity,
  IRange,
  IRatio,
  ISampledData,
  ISimpleQuantity,
} from './datatypes';

/**
 * FHIR R4 Observation.referenceRange backbone element
 * Guidance on how to interpret the value by comparison to a normal or recommended range.
 * @see https://build.fhir.org/observation-definitions.html#Observation.referenceRange
 */
export interface ObservationReferenceRange {
  /** Low Range, if relevant */
  low?: ISimpleQuantity;
  /** High Range, if relevant */
  high?: ISimpleQuantity;
  /** Reference range qualifier */
  type?: ICodeableConcept;
  /** Reference range population */
  appliesTo?: ICodeableConcept[];
  /** Applicable age range, if relevant */
  age?: IRange;
  /** Text based reference range in an observation */
  text?: string;
}

/**
 * FHIR R4 Observation.component backbone element
 * Component results for an Observation. Supports value[x] polymorphic types.
 * @see https://build.fhir.org/observation-definitions.html#Observation.component
 */
export interface ObservationComponent {
  /** Type of component observation (code / type) */
  code: ICodeableConcept;
  /** Actual component result — Quantity */
  valueQuantity?: IQuantity;
  /** Actual component result — CodeableConcept */
  valueCodeableConcept?: ICodeableConcept;
  /** Actual component result — string */
  valueString?: string;
  /** Actual component result — boolean */
  valueBoolean?: boolean;
  /** Actual component result — integer */
  valueInteger?: number;
  /** Actual component result — Range */
  valueRange?: IRange;
  /** Actual component result — Ratio */
  valueRatio?: IRatio;
  /** Actual component result — SampledData */
  valueSampledData?: ISampledData;
  /** Actual component result — dateTime */
  valueDateTime?: string;
  /** Actual component result — Period */
  valuePeriod?: IPeriod;
  /** Actual component result — time */
  valueTime?: string;
  /** Why the component result is missing */
  dataAbsentReason?: ICodeableConcept;
  /** High, low, normal, etc. */
  interpretation?: ICodeableConcept[];
  /** Provides guide for interpretation of component result */
  referenceRange?: ObservationReferenceRange[];
}

/**
 * FHIR R4 Condition.stage backbone element
 * Clinical stage or grade of a condition.
 * Generic on TID because assessment contains IReference fields.
 * @see https://build.fhir.org/condition-definitions.html#Condition.stage
 */
export interface ConditionStage<TID = string> {
  /** Simple summary (disease specific) */
  summary?: ICodeableConcept;
  /** Formal record of assessment */
  assessment?: IReference<TID>[];
  /** Kind of staging */
  type?: ICodeableConcept;
}

/**
 * FHIR R4 Condition.evidence backbone element
 * Supporting evidence for the condition.
 * Generic on TID because detail contains IReference fields.
 * @see https://build.fhir.org/condition-definitions.html#Condition.evidence
 */
export interface ConditionEvidence<TID = string> {
  /** Manifestation/symptom */
  code?: ICodeableConcept[];
  /** Supporting information found elsewhere */
  detail?: IReference<TID>[];
}

/**
 * FHIR R4 AllergyIntolerance.reaction backbone element
 * Details about each adverse reaction event.
 * Generic on TID because note contains IAnnotation which has IReference.
 * @see https://build.fhir.org/allergyintolerance-definitions.html#AllergyIntolerance.reaction
 */
export interface AllergyIntoleranceReaction<TID = string> {
  /** Specific substance or pharmaceutical product considered to be responsible for event */
  substance?: ICodeableConcept;
  /** Clinical symptoms/signs associated with the Event */
  manifestation: ICodeableConcept[];
  /** Description of the event as a whole */
  description?: string;
  /** Date(/time) when manifestations showed */
  onset?: string;
  /** mild | moderate | severe (AllergyIntoleranceSeverity) */
  severity?: string;
  /** How the subject was exposed to the substance */
  exposureRoute?: ICodeableConcept;
  /** Text about event not captured in other fields */
  note?: IAnnotation<TID>[];
}

/**
 * FHIR R4 Medication.ingredient backbone element
 * Identifies a particular constituent of interest in the product.
 * Generic on TID because itemReference is an IReference.
 * @see https://build.fhir.org/medication-definitions.html#Medication.ingredient
 */
export interface MedicationIngredient<TID = string> {
  /** The actual ingredient or content (CodeableConcept) */
  itemCodeableConcept?: ICodeableConcept;
  /** The actual ingredient or content (Reference) */
  itemReference?: IReference<TID>;
  /** Active ingredient indicator */
  isActive?: boolean;
  /** Quantity of ingredient present */
  strength?: IRatio;
}

/**
 * FHIR R4 Medication.batch backbone element
 * Information about a group of medication produced or packaged.
 * @see https://build.fhir.org/medication-definitions.html#Medication.batch
 */
export interface MedicationBatch {
  /** Identifier assigned to batch */
  lotNumber?: string;
  /** When batch will expire */
  expirationDate?: string;
}

/**
 * FHIR R4 Procedure.performer backbone element
 * The people who performed the procedure.
 * Generic on TID because actor and onBehalfOf are IReference fields.
 * @see https://build.fhir.org/procedure-definitions.html#Procedure.performer
 */
export interface ProcedurePerformer<TID = string> {
  /** Type of performance */
  function?: ICodeableConcept;
  /** The reference to the practitioner */
  actor: IReference<TID>;
  /** Organization the device or practitioner was acting for */
  onBehalfOf?: IReference<TID>;
}

/**
 * FHIR R4 Procedure.focalDevice backbone element
 * A device that is implanted, removed, or otherwise manipulated as a focal portion of the Procedure.
 * Generic on TID because manipulated is an IReference field.
 * @see https://build.fhir.org/procedure-definitions.html#Procedure.focalDevice
 */
export interface ProcedureFocalDevice<TID = string> {
  /** Kind of change to device */
  action?: ICodeableConcept;
  /** Device that was changed */
  manipulated: IReference<TID>;
}
