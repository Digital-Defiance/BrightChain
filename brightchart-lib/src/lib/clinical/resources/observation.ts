/**
 * FHIR R4 Observation Resource with BrightChain Metadata
 *
 * Defines the `IObservationResource<TID>` interface representing a FHIR R4
 * Observation resource augmented with BrightChain storage metadata.
 * Supports vital signs, lab results, and other clinical measurements.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/observation.html
 * @module clinical/resources/observation
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
import {
  ObservationComponent,
  ObservationReferenceRange,
} from '../backboneElements';
import {
  IAnnotation,
  IQuantity,
  IRange,
  IRatio,
  ISampledData,
} from '../datatypes';
import { ObservationStatus } from '../enumerations';

/**
 * FHIR R4 Observation Resource with BrightChain extensions.
 *
 * Represents measurements, vital signs, lab results, or other clinical
 * findings linked to a patient and optionally to an encounter.
 *
 * @see https://build.fhir.org/observation.html
 */
export interface IObservationResource<TID = string> {
  /** Fixed value: 'Observation' */
  resourceType: 'Observation';

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

  // --- FHIR R4 Observation fields ---

  /** Business identifiers assigned to this observation */
  identifier?: IIdentifier<TID>[];

  /** registered | preliminary | final | amended | corrected | cancelled | entered-in-error | unknown */
  status: ObservationStatus;

  /** Classification of type of observation (e.g. vital-signs, laboratory) */
  category?: ICodeableConcept[];

  /** Type of observation (code / type) */
  code: ICodeableConcept;

  /** Who and/or what the observation is about (Patient reference) */
  subject?: IReference<TID>;

  /** Healthcare event during which this observation is made (forward-compatible Encounter reference) */
  encounter?: IReference<TID>;

  /** Clinically relevant time/time-period for observation (dateTime) */
  effectiveDateTime?: string;

  /** Clinically relevant time/time-period for observation (Period) */
  effectivePeriod?: IPeriod;

  /** Date/Time this version was made available (instant) */
  issued?: string;

  /** Who is responsible for the observation */
  performer?: IReference<TID>[];

  // --- value[x] polymorphic types ---

  /** Actual result — Quantity */
  valueQuantity?: IQuantity;

  /** Actual result — CodeableConcept */
  valueCodeableConcept?: ICodeableConcept;

  /** Actual result — string */
  valueString?: string;

  /** Actual result — boolean */
  valueBoolean?: boolean;

  /** Actual result — integer */
  valueInteger?: number;

  /** Actual result — Range */
  valueRange?: IRange;

  /** Actual result — Ratio */
  valueRatio?: IRatio;

  /** Actual result — SampledData */
  valueSampledData?: ISampledData;

  /** Actual result — time (HH:mm:ss) */
  valueTime?: string;

  /** Actual result — dateTime */
  valueDateTime?: string;

  /** Actual result — Period */
  valuePeriod?: IPeriod;

  // --- Additional Observation fields ---

  /** Why the result is missing */
  dataAbsentReason?: ICodeableConcept;

  /** High, low, normal, etc. */
  interpretation?: ICodeableConcept[];

  /** Comments about the observation */
  note?: IAnnotation<TID>[];

  /** Observed body part */
  bodySite?: ICodeableConcept;

  /** How it was done */
  method?: ICodeableConcept;

  /** Provides guide for interpretation */
  referenceRange?: ObservationReferenceRange[];

  /** Component results */
  component?: ObservationComponent[];

  /** Related resource that belongs to the Observation group */
  hasMember?: IReference<TID>[];
}
