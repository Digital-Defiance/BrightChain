/**
 * FHIR R4 Schedule Resource with BrightChain Metadata
 *
 * Defines the `IScheduleResource<TID>` interface representing a FHIR R4
 * Schedule resource augmented with BrightChain storage metadata.
 * A Schedule controls the dates/times available for booking against
 * associated actors (practitioners, locations, devices, healthcare services).
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/schedule.html
 * @module scheduling/scheduleResource
 */

import type {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IPeriod,
  IReference,
} from '../fhir/datatypes';
import type { IBrightchainMetadata } from '../fhir/patientResource';

/**
 * FHIR R4 Schedule Resource with BrightChain extensions.
 *
 * A container for slots of time that may be available for booking appointments.
 * Each Schedule is associated with one or more actors (practitioners, locations,
 * devices, or healthcare services).
 *
 * @see https://build.fhir.org/schedule.html
 */
export interface IScheduleResource<TID = string> {
  /** Fixed value: 'Schedule' */
  resourceType: 'Schedule';

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

  // --- FHIR R4 Schedule fields ---

  /** External identifiers for this item */
  identifier?: IIdentifier<TID>[];

  /** Whether this schedule is in active use */
  active?: boolean;

  /** High-level category (e.g. General Practice, Specialist) */
  serviceCategory?: ICodeableConcept[];

  /** Specific service to be performed */
  serviceType?: ICodeableConcept[];

  /** Type of specialty needed */
  specialty?: ICodeableConcept[];

  /** Resource(s) that availability information is being provided for (required) */
  actor: IReference<TID>[];

  /** Period of time covered by the schedule */
  planningHorizon?: IPeriod;

  /** Comments on availability */
  comment?: string;
}
