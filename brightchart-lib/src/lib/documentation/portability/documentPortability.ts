/**
 * Documentation Portability Interfaces
 *
 * Extends the clinical export bundle with Composition, DocumentReference,
 * and note template arrays for full-fidelity document data migration.
 *
 * @module documentation/portability/documentPortability
 */

import type { IClinicalExportBundle } from '../../clinical/portability/clinicalPortability';
import type { ICompositionResource } from '../compositionResource';
import type { IDocumentReferenceResource } from '../documentReferenceResource';
import type { INoteTemplate } from '../templates/noteTemplateTypes';

/**
 * Document export bundle extending the clinical export bundle
 * with Composition resources, DocumentReference resources, and
 * note templates for complete document portability.
 */
export interface IDocumentExportBundle<TID = string>
  extends IClinicalExportBundle<TID> {
  /** Composition resources (clinical notes) */
  compositions: ICompositionResource<TID>[];
  /** DocumentReference resources (document metadata) */
  documentReferences: IDocumentReferenceResource<TID>[];
  /** Note templates used in this export */
  noteTemplates: INoteTemplate[];
}
