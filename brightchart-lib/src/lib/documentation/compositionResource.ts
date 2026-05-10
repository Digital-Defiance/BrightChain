/**
 * FHIR R4 Composition Resource with BrightChain Metadata
 *
 * Defines the `ICompositionResource<TID>` interface representing a FHIR R4
 * Composition resource augmented with BrightChain storage metadata.
 * Supports structured clinical notes (SOAP, H&P, discharge summaries,
 * procedure notes, progress notes) with typed sections, attestation,
 * and encounter/patient context.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/composition.html
 * @module documentation/compositionResource
 */

import {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IReference,
} from '../fhir/datatypes';
import { IBrightchainMetadata } from '../fhir/patientResource';
import {
  CompositionAttester,
  CompositionEvent,
  CompositionRelatesTo,
  CompositionSection,
} from './compositionBackboneElements';
import { CompositionStatus } from './enumerations';

/**
 * FHIR R4 Composition Resource with BrightChain extensions.
 *
 * Represents a structured clinical document — a set of healthcare-related
 * information assembled together into a single logical package with a
 * particular stated purpose (e.g., SOAP note, H&P, discharge summary).
 *
 * @see https://build.fhir.org/composition.html
 */
export interface ICompositionResource<TID = string> {
  /** Fixed value: 'Composition' */
  resourceType: 'Composition';

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

  // --- FHIR R4 Composition fields ---

  /** An identifier for this composition */
  identifier?: IIdentifier<TID>;

  /** preliminary | final | amended | entered-in-error (required) */
  status: CompositionStatus;

  /** Type of composition — LOINC document type (required) */
  type: ICodeableConcept;

  /** Categorization of composition */
  category?: ICodeableConcept[];

  /** Who and/or what the composition is about (Patient reference) */
  subject?: IReference<TID>;

  /** Context of the composition (Encounter reference) */
  encounter?: IReference<TID>;

  /** Composition editing time (required, dateTime) */
  date: string;

  /** Who and/or what authored the composition (required) */
  author: IReference<TID>[];

  /** Human-readable label for the composition (required) */
  title: string;

  /** As defined by affinity domain */
  confidentiality?: string;

  /** Attests to accuracy of composition */
  attester?: CompositionAttester<TID>[];

  /** Organization which maintains the composition */
  custodian?: IReference<TID>;

  /** Relationships to other compositions/documents */
  relatesTo?: CompositionRelatesTo<TID>[];

  /** The clinical service(s) being documented */
  event?: CompositionEvent<TID>[];

  /** Composition is broken into sections */
  section?: CompositionSection<TID>[];
}
