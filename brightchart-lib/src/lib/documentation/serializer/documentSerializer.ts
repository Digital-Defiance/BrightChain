/**
 * Document Serializer Interfaces
 *
 * Serializer interfaces for Composition, DocumentReference, and document
 * export bundles. Guarantees round-trip fidelity: serialize → deserialize
 * → serialize produces byte-identical JSON output.
 *
 * @module documentation/serializer/documentSerializer
 */

import type { ICompositionResource } from '../compositionResource';
import type { IDocumentReferenceResource } from '../documentReferenceResource';
import type { IDocumentExportBundle } from '../portability/documentPortability';

/**
 * Serializer for Composition resources.
 * Guarantees round-trip fidelity for FHIR R4 JSON.
 */
export interface ICompositionSerializer {
  /** Serialize a Composition resource to FHIR R4 JSON */
  serialize(resource: ICompositionResource): string;
  /** Deserialize FHIR R4 JSON to a Composition resource */
  deserialize(json: string): ICompositionResource;
}

/**
 * Serializer for DocumentReference resources.
 * Guarantees round-trip fidelity for FHIR R4 JSON.
 */
export interface IDocumentReferenceSerializer {
  /** Serialize a DocumentReference resource to FHIR R4 JSON */
  serialize(resource: IDocumentReferenceResource): string;
  /** Deserialize FHIR R4 JSON to a DocumentReference resource */
  deserialize(json: string): IDocumentReferenceResource;
}

/**
 * Serializer for document export/import bundles.
 * Guarantees round-trip fidelity for the entire bundle.
 */
export interface IDocumentBundleSerializer {
  /** Serialize a document export bundle to JSON */
  serialize(bundle: IDocumentExportBundle): string;
  /** Deserialize JSON to a document export bundle */
  deserialize(json: string): IDocumentExportBundle;
}
