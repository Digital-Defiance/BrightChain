/**
 * FHIR R4 Procedure Resource with BrightChain Metadata
 *
 * @see https://build.fhir.org/procedure.html
 * @module clinical/resources/procedure
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
import { ProcedureFocalDevice, ProcedurePerformer } from '../backboneElements';
import { IAge, IAnnotation, IRange } from '../datatypes';
import { ProcedureStatus } from '../enumerations';

/**
 * FHIR R4 Procedure Resource with BrightChain extensions.
 * @see https://build.fhir.org/procedure.html
 */
export interface IProcedureResource<TID = string> {
  resourceType: 'Procedure';
  id?: string;
  meta?: IMeta;
  text?: INarrative;
  extension?: IExtension[];
  brightchainMetadata: IBrightchainMetadata<TID>;
  identifier?: IIdentifier<TID>[];
  status: ProcedureStatus;
  statusReason?: ICodeableConcept;
  category?: ICodeableConcept;
  code?: ICodeableConcept;
  /** Patient reference (required) */
  subject: IReference<TID>;
  encounter?: IReference<TID>;
  performedDateTime?: string;
  performedPeriod?: IPeriod;
  performedString?: string;
  performedAge?: IAge;
  performedRange?: IRange;
  recorder?: IReference<TID>;
  asserter?: IReference<TID>;
  performer?: ProcedurePerformer<TID>[];
  location?: IReference<TID>;
  reasonCode?: ICodeableConcept[];
  reasonReference?: IReference<TID>[];
  bodySite?: ICodeableConcept[];
  outcome?: ICodeableConcept;
  report?: IReference<TID>[];
  complication?: ICodeableConcept[];
  complicationDetail?: IReference<TID>[];
  followUp?: ICodeableConcept[];
  note?: IAnnotation<TID>[];
  focalDevice?: ProcedureFocalDevice<TID>[];
  usedCode?: ICodeableConcept[];
}
