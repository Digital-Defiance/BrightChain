/**
 * FHIR R4 MedicationStatement Resource with BrightChain Metadata
 *
 * @see https://build.fhir.org/medicationstatement.html
 * @module clinical/resources/medicationStatement
 */

import {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IPeriod,
  IReference,
} from '../../fhir/datatypes';
import { IBrightchainMetadata } from '../../fhir/patientResource';
import { IAnnotation, IDosage } from '../datatypes';
import { MedicationStatementStatus } from '../enumerations';

/**
 * FHIR R4 MedicationStatement Resource with BrightChain extensions.
 * @see https://build.fhir.org/medicationstatement.html
 */
export interface IMedicationStatementResource<TID = string> {
  resourceType: 'MedicationStatement';
  id?: string;
  meta?: IMeta;
  text?: INarrative;
  extension?: IExtension[];
  brightchainMetadata: IBrightchainMetadata<TID>;
  identifier?: IIdentifier<TID>[];
  status: MedicationStatementStatus;
  statusReason?: ICodeableConcept[];
  category?: ICodeableConcept;
  medicationCodeableConcept?: ICodeableConcept;
  medicationReference?: IReference<TID>;
  /** Patient reference (required) */
  subject: IReference<TID>;
  /** Encounter reference (forward-compatible) */
  context?: IReference<TID>;
  effectiveDateTime?: string;
  effectivePeriod?: IPeriod;
  dateAsserted?: string;
  informationSource?: IReference<TID>;
  reasonCode?: ICodeableConcept[];
  reasonReference?: IReference<TID>[];
  note?: IAnnotation<TID>[];
  dosage?: IDosage[];
}
