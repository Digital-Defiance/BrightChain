/**
 * FHIR R4 Medication Resource with BrightChain Metadata
 *
 * @see https://build.fhir.org/medication.html
 * @module clinical/resources/medication
 */

import {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IReference,
} from '../../fhir/datatypes';
import { IBrightchainMetadata } from '../../fhir/patientResource';
import { MedicationBatch, MedicationIngredient } from '../backboneElements';
import { IRatio } from '../datatypes';
import { MedicationStatus } from '../enumerations';

/**
 * FHIR R4 Medication Resource with BrightChain extensions.
 * @see https://build.fhir.org/medication.html
 */
export interface IMedicationResource<TID = string> {
  resourceType: 'Medication';
  id?: string;
  meta?: IMeta;
  text?: INarrative;
  extension?: IExtension[];
  brightchainMetadata: IBrightchainMetadata<TID>;
  identifier?: IIdentifier<TID>[];
  code?: ICodeableConcept;
  status?: MedicationStatus;
  manufacturer?: IReference<TID>;
  form?: ICodeableConcept;
  amount?: IRatio;
  ingredient?: MedicationIngredient<TID>[];
  batch?: MedicationBatch;
}
