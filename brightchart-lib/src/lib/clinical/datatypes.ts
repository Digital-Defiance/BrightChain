/**
 * FHIR R4 Complex Datatypes for Clinical Resources
 *
 * Exported TypeScript interfaces for FHIR R4 complex datatypes required
 * by clinical resources: IQuantity, ISimpleQuantity, IRange, IRatio, IAge,
 * IAnnotation, IDosage, IDosageDoseAndRate, ITiming, ITimingRepeat, ISampledData.
 *
 * All interfaces that contain IReference fields are generic on `<TID = string>`
 * to support both frontend (string) and backend (Uint8Array) usage.
 *
 * @see https://build.fhir.org/datatypes.html
 * @module clinical/datatypes
 */

import { ICodeableConcept, IPeriod, IReference } from '../fhir/datatypes';

/**
 * FHIR R4 Quantity datatype
 * A measured amount (or an amount that can potentially be measured).
 * @see https://build.fhir.org/datatypes.html#Quantity
 */
export interface IQuantity {
  /** Numerical value (with implicit precision) */
  value?: number;
  /** < | <= | >= | > — how to understand the value */
  comparator?: string;
  /** Unit representation */
  unit?: string;
  /** System that defines coded unit form */
  system?: string;
  /** Coded form of the unit */
  code?: string;
}

/**
 * FHIR R4 SimpleQuantity datatype
 * A fixed quantity (no comparator).
 * @see https://build.fhir.org/datatypes.html#SimpleQuantity
 */
export interface ISimpleQuantity {
  /** Numerical value (with implicit precision) */
  value?: number;
  /** Unit representation */
  unit?: string;
  /** System that defines coded unit form */
  system?: string;
  /** Coded form of the unit */
  code?: string;
}

/**
 * FHIR R4 Range datatype
 * A set of ordered Quantity values defined by a low and high limit.
 * @see https://build.fhir.org/datatypes.html#Range
 */
export interface IRange {
  /** Low limit */
  low?: ISimpleQuantity;
  /** High limit */
  high?: ISimpleQuantity;
}

/**
 * FHIR R4 Ratio datatype
 * A relationship of two Quantity values — a numerator and a denominator.
 * @see https://build.fhir.org/datatypes.html#Ratio
 */
export interface IRatio {
  /** Numerator value */
  numerator?: IQuantity;
  /** Denominator value */
  denominator?: IQuantity;
}

/**
 * FHIR R4 Age datatype
 * A duration of time during which an organism (or a process) has existed.
 * Extends IQuantity with age-specific constraints (value >= 0, system = UCUM).
 * @see https://build.fhir.org/datatypes.html#Age
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IAge extends IQuantity {}

/**
 * FHIR R4 Annotation datatype
 * A text note which also contains information about who made the statement and when.
 * Generic on TID because authorReference is an IReference.
 * @see https://build.fhir.org/datatypes.html#Annotation
 */
export interface IAnnotation<TID = string> {
  /** Individual responsible for the annotation (Reference) */
  authorReference?: IReference<TID>;
  /** Individual responsible for the annotation (string) */
  authorString?: string;
  /** When the annotation was made */
  time?: string;
  /** The annotation text content */
  text: string;
}

/**
 * FHIR R4 Timing.repeat element
 * A set of rules that describe when a recurring event is scheduled.
 * @see https://build.fhir.org/datatypes.html#Timing
 */
export interface ITimingRepeat {
  /** Length/Range of lengths, or (Start and/or end) limits (Duration) */
  boundsDuration?: IQuantity;
  /** Length/Range of lengths, or (Start and/or end) limits (Range) */
  boundsRange?: IRange;
  /** Length/Range of lengths, or (Start and/or end) limits (Period) */
  boundsPeriod?: IPeriod;
  /** Number of times to repeat */
  count?: number;
  /** Maximum number of times to repeat */
  countMax?: number;
  /** How long when it happens */
  duration?: number;
  /** How long when it happens (Max) */
  durationMax?: number;
  /** s | min | h | d | wk | mo | a — unit of time (UCUM) */
  durationUnit?: string;
  /** Event occurs frequency times per period */
  frequency?: number;
  /** Event occurs up to frequencyMax times per period */
  frequencyMax?: number;
  /** Event occurs frequency times per period */
  period?: number;
  /** Upper limit of period (e.g. 3-4 hours) */
  periodMax?: number;
  /** s | min | h | d | wk | mo | a — unit of time (UCUM) */
  periodUnit?: string;
  /** mon | tue | wed | thu | fri | sat | sun */
  dayOfWeek?: string[];
  /** Time of day for action (HH:mm:ss) */
  timeOfDay?: string[];
  /** Code for time period of occurrence */
  when?: string[];
  /** Minutes from event (before or after) */
  offset?: number;
}

/**
 * FHIR R4 Timing datatype
 * Specifies an event that may occur multiple times.
 * @see https://build.fhir.org/datatypes.html#Timing
 */
export interface ITiming {
  /** When the event occurs (dateTime array) */
  event?: string[];
  /** When the event is to occur */
  repeat?: ITimingRepeat;
  /** BID | TID | QID | AM | PM | QD | QOD | + */
  code?: ICodeableConcept;
}

/**
 * FHIR R4 Dosage.doseAndRate element
 * The amount of medication administered.
 * @see https://build.fhir.org/dosage.html
 */
export interface IDosageDoseAndRate {
  /** The kind of dose or rate specified */
  type?: ICodeableConcept;
  /** Amount of medication per dose (Range) */
  doseRange?: IRange;
  /** Amount of medication per dose (Quantity) */
  doseQuantity?: ISimpleQuantity;
  /** Amount of medication per unit of time (Ratio) */
  rateRatio?: IRatio;
  /** Amount of medication per unit of time (Range) */
  rateRange?: IRange;
  /** Amount of medication per unit of time (Quantity) */
  rateQuantity?: ISimpleQuantity;
}

/**
 * FHIR R4 Dosage datatype
 * How the medication is/was taken or should be taken.
 * Generic on TID because maxDosePerPeriod uses IRatio (no IReference),
 * but kept generic for consistency with the clinical module pattern.
 * @see https://build.fhir.org/dosage.html
 */
export interface IDosage {
  /** The order of the dosage instructions */
  sequence?: number;
  /** Free text dosage instructions */
  text?: string;
  /** Supplemental instruction or warnings to the patient */
  additionalInstruction?: ICodeableConcept[];
  /** Patient or consumer oriented instructions */
  patientInstruction?: string;
  /** When medication should be administered */
  timing?: ITiming;
  /** Body site to administer to */
  site?: ICodeableConcept;
  /** How drug should enter body */
  route?: ICodeableConcept;
  /** Technique for administering medication */
  method?: ICodeableConcept;
  /** Amount of medication administered */
  doseAndRate?: IDosageDoseAndRate[];
  /** Upper limit on medication per unit of time */
  maxDosePerPeriod?: IRatio;
  /** Upper limit on medication per administration */
  maxDosePerAdministration?: ISimpleQuantity;
  /** Upper limit on medication per lifetime of the patient */
  maxDosePerLifetime?: ISimpleQuantity;
}

/**
 * FHIR R4 SampledData datatype
 * Data that comes from a series of measurements taken by a device.
 * @see https://build.fhir.org/datatypes.html#SampledData
 */
export interface ISampledData {
  /** Zero value and units */
  origin: ISimpleQuantity;
  /** Number of milliseconds between samples */
  period: number;
  /** Multiply data by this before adding to origin */
  factor?: number;
  /** Lower limit of detection */
  lowerLimit?: number;
  /** Upper limit of detection */
  upperLimit?: number;
  /** Number of sample points at each time point */
  dimensions: number;
  /** Decimal values with spaces, or "E" | "U" | "L" */
  data?: string;
}
