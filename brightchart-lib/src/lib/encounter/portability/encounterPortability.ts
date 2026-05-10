/**
 * Encounter Portability Interfaces
 *
 * Extends the Clinical Portability standard from Module 2 with
 * encounter-specific data for full-fidelity encounter data migration.
 * The IEncounterExportBundle adds encounter resources and their
 * clinical resource links to the clinical export bundle.
 *
 * @module encounter/portability/encounterPortability
 */

import type { IClinicalExportBundle } from '../../clinical/portability/clinicalPortability';
import type { IOperationOutcome } from '../../fhir/operationOutcome';
import type { IEncounterResource } from '../encounterResource';
import type { IEncounterClinicalLink } from '../linking/encounterClinicalLink';

/**
 * Encounter export bundle extending the clinical export bundle
 * with encounter resources and encounter-to-clinical-resource links.
 *
 * Preserves all encounter-to-patient references and encounter-to-clinical-resource
 * links so that imported data maintains referential integrity.
 *
 * @see Requirements 12.1, 12.2, 12.3, 12.4
 */
export interface IEncounterExportBundle<TID = string>
  extends IClinicalExportBundle<TID> {
  /** All encounter resources in the export bundle */
  encounters: IEncounterResource<TID>[];
  /** Encounter-to-clinical-resource link records */
  encounterClinicalLinks: IEncounterClinicalLink<TID>[];
}

/**
 * Result of importing an encounter export bundle.
 *
 * @see Requirements 12.3, 12.4
 */
export interface IEncounterImportResult<TID = string> {
  /** Whether the import completed successfully */
  success: boolean;
  /** The encounter resources that were successfully imported */
  importedEncounters: IEncounterResource<TID>[];
  /** Errors encountered during import (e.g. unresolved patient references) */
  errors: IOperationOutcome[];
}
