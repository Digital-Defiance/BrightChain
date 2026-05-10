/**
 * Clinical Serializer Interfaces
 *
 * Generic serializer interface for clinical resources and a bundle
 * serializer for portability export/import.
 *
 * @module clinical/serializer/clinicalSerializer
 */

import type { IClinicalExportBundle } from '../portability/clinicalPortability';
import type { ClinicalResource } from '../resources/index';

/**
 * Generic serializer for a single clinical resource type.
 * Guarantees round-trip fidelity: serialize → deserialize → serialize
 * produces byte-identical JSON output.
 */
export interface IClinicalSerializer<TResource extends ClinicalResource> {
  /** Serialize a clinical resource to FHIR R4 JSON */
  serialize(resource: TResource): string;
  /** Deserialize FHIR R4 JSON to a clinical resource */
  deserialize(json: string): TResource;
}

/**
 * Serializer for clinical export/import bundles.
 * Guarantees round-trip fidelity for the entire bundle.
 */
export interface IClinicalBundleSerializer {
  /** Serialize a clinical export bundle to JSON */
  serialize(bundle: IClinicalExportBundle): string;
  /** Deserialize JSON to a clinical export bundle */
  deserialize(json: string): IClinicalExportBundle;
}
