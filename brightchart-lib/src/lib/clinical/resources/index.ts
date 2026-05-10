/**
 * Clinical Resources Barrel Export
 *
 * Defines and exports the ClinicalResource union type, ClinicalResourceType
 * literal union, and re-exports all individual resource interfaces.
 *
 * @module clinical/resources
 */

export { IAllergyIntoleranceResource } from './allergyIntolerance';
export { IConditionResource } from './condition';
export { IMedicationResource } from './medication';
export { IMedicationStatementResource } from './medicationStatement';
export { IObservationResource } from './observation';
export { IProcedureResource } from './procedure';

import type { IAllergyIntoleranceResource } from './allergyIntolerance';
import type { IConditionResource } from './condition';
import type { IMedicationResource } from './medication';
import type { IMedicationStatementResource } from './medicationStatement';
import type { IObservationResource } from './observation';
import type { IProcedureResource } from './procedure';

/** Union type of all six FHIR R4 clinical resource interfaces */
export type ClinicalResource<TID = string> =
  | IObservationResource<TID>
  | IConditionResource<TID>
  | IAllergyIntoleranceResource<TID>
  | IMedicationResource<TID>
  | IMedicationStatementResource<TID>
  | IProcedureResource<TID>;

/** String literal union of all clinical resource type names */
export type ClinicalResourceType =
  | 'Observation'
  | 'Condition'
  | 'AllergyIntolerance'
  | 'Medication'
  | 'MedicationStatement'
  | 'Procedure';
