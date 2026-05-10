/**
 * FHIR R4 DocumentReference Backbone Elements
 *
 * Exported TypeScript interfaces for backbone elements used by the
 * DocumentReference resource: IAttachment, DocumentReferenceContent,
 * DocumentReferenceContext, and DocumentReferenceRelatesTo.
 *
 * Interfaces containing IReference fields are generic on `<TID = string>`
 * to support both frontend (string) and backend (Uint8Array) usage.
 *
 * IAttachment is a standalone FHIR R4 Attachment datatype and is NOT generic.
 *
 * @see https://www.hl7.org/FHIR/R4/documentreference.html
 * @module documentation/documentReferenceBackboneElements
 */

import {
  ICodeableConcept,
  ICoding,
  IPeriod,
  IReference,
} from '../fhir/datatypes';
import { DocumentRelationshipType } from './enumerations';

/**
 * FHIR R4 Attachment datatype
 *
 * For communicating the content of an attachment — the actual data, a URL
 * where the data can be found, or both. Used by DocumentReference.content.attachment.
 *
 * @see https://build.fhir.org/datatypes.html#Attachment
 */
export interface IAttachment {
  /** MIME type of the content (e.g. "application/pdf") */
  contentType?: string;
  /** Human language of the content (BCP-47) */
  language?: string;
  /** Data inline, base64-encoded */
  data?: string;
  /** URI where the data can be found */
  url?: string;
  /** Number of bytes of content (if url provided) */
  size?: number;
  /** Hash of the data (SHA-1, base64-encoded) */
  hash?: string;
  /** Label to display in place of the data */
  title?: string;
  /** Date attachment was first created (dateTime) */
  creation?: string;
}

/**
 * FHIR R4 DocumentReference.content backbone element
 *
 * The document and format referenced. Each content element describes
 * one rendition of the document with its attachment and optional format coding.
 *
 * @see https://www.hl7.org/FHIR/R4/documentreference-definitions.html#DocumentReference.content
 */
export interface DocumentReferenceContent<_TID = string> {
  /** Where to access the document (required) */
  attachment: IAttachment;
  /** Format/content rules for the document */
  format?: ICoding;
}

/**
 * FHIR R4 DocumentReference.context backbone element
 *
 * The clinical context in which the document was prepared — encounter,
 * events, time period, facility, and related references.
 *
 * @see https://www.hl7.org/FHIR/R4/documentreference-definitions.html#DocumentReference.context
 */
export interface DocumentReferenceContext<TID = string> {
  /** Context of the document content (Encounter references) */
  encounter?: IReference<TID>[];
  /** Main clinical acts documented */
  event?: ICodeableConcept[];
  /** Time of service that is being documented */
  period?: IPeriod;
  /** Kind of facility where patient was seen */
  facilityType?: ICodeableConcept;
  /** Additional details about where the content was created (e.g. clinical specialty) */
  practiceSetting?: ICodeableConcept;
  /** Patient demographics from source */
  sourcePatientInfo?: IReference<TID>;
  /** Related identifiers or resources */
  related?: IReference<TID>[];
}

/**
 * FHIR R4 DocumentReference.relatesTo backbone element
 *
 * Relationships that this document has with other document references
 * that already exist. The code indicates the type of relationship
 * (replaces, transforms, signs, appends).
 *
 * @see https://www.hl7.org/FHIR/R4/documentreference-definitions.html#DocumentReference.relatesTo
 */
export interface DocumentReferenceRelatesTo<TID = string> {
  /** replaces | transforms | signs | appends (required) */
  code: DocumentRelationshipType;
  /** Target of the relationship (required) */
  target: IReference<TID>;
}
