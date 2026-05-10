/**
 * Clinical Portability Interfaces
 *
 * Extends the Module 1 IBrightChartExportBundle with clinical resource
 * arrays and specialty profile for full-fidelity clinical data migration.
 *
 * @module clinical/portability/clinicalPortability
 */

import type { IOperationOutcome } from '../../fhir/operationOutcome';
import type { IBrightChartExportBundle } from '../../portability/portabilityTypes';
import type { IAllergyIntoleranceResource } from '../resources/allergyIntolerance';
import type { IConditionResource } from '../resources/condition';
import type { ClinicalResource } from '../resources/index';
import type { IMedicationResource } from '../resources/medication';
import type { IMedicationStatementResource } from '../resources/medicationStatement';
import type { IObservationResource } from '../resources/observation';
import type { IProcedureResource } from '../resources/procedure';
import type { ISpecialtyProfile } from '../specialty/specialtyTypes';

/**
 * Clinical export bundle extending the patient export bundle
 * with all six clinical resource types and the source specialty profile.
 */
export interface IClinicalExportBundle<TID = string>
  extends IBrightChartExportBundle<TID> {
  observations: IObservationResource<TID>[];
  conditions: IConditionResource<TID>[];
  allergies: IAllergyIntoleranceResource<TID>[];
  medications: IMedicationResource<TID>[];
  medicationStatements: IMedicationStatementResource<TID>[];
  procedures: IProcedureResource<TID>[];
  specialtyProfile: ISpecialtyProfile;
}

/**
 * Result of importing a clinical export bundle.
 */
export interface IClinicalImportResult<TID = string> {
  success: boolean;
  importedResources: ClinicalResource<TID>[];
  errors?: IOperationOutcome[];
}
