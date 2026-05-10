/**
 * Encounter Serializer Interfaces
 *
 * Serializer interface for encounter resources and a bundle serializer
 * for encounter portability export/import. Follows the IClinicalSerializer
 * pattern from Module 2.
 *
 * @module encounter/serializer/encounterSerializer
 */

import type { IEncounterResource } from '../encounterResource';
import type { IEncounterExportBundle } from '../portability/encounterPortability';

/**
 * Serializer for a single Encounter resource.
 * Guarantees round-trip fidelity: serialize → deserialize → serialize
 * produces byte-identical JSON output.
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
export interface IEncounterSerializer {
  /** Serialize an encounter resource to FHIR R4 JSON */
  serialize(encounter: IEncounterResource): string;
  /** Deserialize FHIR R4 JSON to an encounter resource */
  deserialize(json: string): IEncounterResource;
}

/**
 * Serializer for encounter export/import bundles.
 * Guarantees round-trip fidelity for the entire bundle.
 *
 * @see Requirement 12.5
 */
export interface IEncounterBundleSerializer {
  /** Serialize an encounter export bundle to JSON */
  serialize(bundle: IEncounterExportBundle): string;
  /** Deserialize JSON to an encounter export bundle */
  deserialize(json: string): IEncounterExportBundle;
}
