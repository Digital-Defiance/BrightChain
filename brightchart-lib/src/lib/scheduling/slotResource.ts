/**
 * FHIR R4 Slot Resource with BrightChain Metadata
 *
 * Defines the `ISlotResource<TID>` interface representing a FHIR R4
 * Slot resource augmented with BrightChain storage metadata.
 * A Slot is a time window on a Schedule that may be available for
 * booking appointments.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/slot.html
 * @module scheduling/slotResource
 */

import type {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IReference,
} from '../fhir/datatypes';
import type { IBrightchainMetadata } from '../fhir/patientResource';
import type { SlotStatus } from './enumerations';

/**
 * FHIR R4 Slot Resource with BrightChain extensions.
 *
 * A slot of time on a schedule that may be available for booking appointments.
 * Slots are the atomic bookable units within a Schedule.
 *
 * @see https://build.fhir.org/slot.html
 */
export interface ISlotResource<TID = string> {
  /** Fixed value: 'Slot' */
  resourceType: 'Slot';

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

  // --- FHIR R4 Slot fields ---

  /** External identifiers for this item */
  identifier?: IIdentifier<TID>[];

  /** High-level category (e.g. General Practice, Specialist) */
  serviceCategory?: ICodeableConcept[];

  /** Specific service to be performed */
  serviceType?: ICodeableConcept[];

  /** Type of specialty needed */
  specialty?: ICodeableConcept[];

  /** The style of appointment or patient that may be booked in the slot */
  appointmentType?: ICodeableConcept;

  /** The Schedule resource that this Slot defines an interval of status information for (required) */
  schedule: IReference<TID>;

  /** busy | free | busy-unavailable | busy-tentative | entered-in-error (required) */
  status: SlotStatus;

  /** Date/Time that the slot is to begin (required) */
  start: string;

  /** Date/Time that the slot is to conclude (required) */
  end: string;

  /** Whether this slot has been overbooked */
  overbooked?: boolean;

  /** Comments on the slot */
  comment?: string;
}
