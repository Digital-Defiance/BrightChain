/**
 * FHIR R4 DocumentReference Resource with BrightChain Metadata
 *
 * Defines the `IDocumentReferenceResource<TID>` interface representing a FHIR R4
 * DocumentReference resource augmented with BrightChain storage metadata.
 * Supports metadata about any document (scanned paper, PDFs, images, C-CDA XML,
 * external lab reports) with content attachments and clinical context.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://www.hl7.org/FHIR/R4/documentreference.html
 * @module documentation/documentReferenceResource
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
  DocumentReferenceContent,
  DocumentReferenceContext,
  DocumentReferenceRelatesTo,
} from './documentReferenceBackboneElements';
import { CompositionStatus, DocumentReferenceStatus } from './enumerations';

/**
 * FHIR R4 DocumentReference Resource with BrightChain extensions.
 *
 * Represents metadata about a document of any kind — clinical notes,
 * scanned paper, PDFs, images, C-CDA XML, or external reports — with
 * content attachments and clinical context.
 *
 * @see https://www.hl7.org/FHIR/R4/documentreference.html
 */
export interface IDocumentReferenceResource<TID = string> {
  /** Fixed value: 'DocumentReference' */
  resourceType: 'DocumentReference';

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

  // --- FHIR R4 DocumentReference fields ---

  /** Master version-specific identifier */
  masterIdentifier?: IIdentifier<TID>;

  /** Other identifiers for the document */
  identifier?: IIdentifier<TID>[];

  /** current | superseded | entered-in-error (required) */
  status: DocumentReferenceStatus;

  /** preliminary | final | amended | entered-in-error */
  docStatus?: CompositionStatus;

  /** Kind of document — LOINC document type */
  type?: ICodeableConcept;

  /** Categorization of document */
  category?: ICodeableConcept[];

  /** Who/what is the subject of the document (Patient reference) */
  subject?: IReference<TID>;

  /** When this document reference was created (instant) */
  date?: string;

  /** Who and/or what authored the document */
  author?: IReference<TID>[];

  /** Who/what authenticated the document */
  authenticator?: IReference<TID>;

  /** Organization which maintains the document */
  custodian?: IReference<TID>;

  /** Relationships to other documents */
  relatesTo?: DocumentReferenceRelatesTo<TID>[];

  /** Human-readable description */
  description?: string;

  /** Document security-tags */
  securityLabel?: ICodeableConcept[];

  /** Document referenced (required) */
  content: DocumentReferenceContent<TID>[];

  /** Clinical context of document */
  context?: DocumentReferenceContext<TID>;
}
