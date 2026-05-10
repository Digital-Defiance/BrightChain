/**
 * FHIR R4 AllergyIntolerance Resource with BrightChain Metadata
 *
 * @see https://build.fhir.org/allergyintolerance.html
 * @module clinical/resources/allergyIntolerance
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
import { AllergyIntoleranceReaction } from '../backboneElements';
import { IAge, IAnnotation, IRange } from '../datatypes';
import {
  AllergyIntoleranceCategory,
  AllergyIntoleranceCriticality,
  AllergyIntoleranceType,
} from '../enumerations';

/**
 * FHIR R4 AllergyIntolerance Resource with BrightChain extensions.
 * @see https://build.fhir.org/allergyintolerance.html
 */
export interface IAllergyIntoleranceResource<TID = string> {
  resourceType: 'AllergyIntolerance';
  id?: string;
  meta?: IMeta;
  text?: INarrative;
  extension?: IExtension[];
  brightchainMetadata: IBrightchainMetadata<TID>;
  identifier?: IIdentifier<TID>[];
  clinicalStatus?: ICodeableConcept;
  verificationStatus?: ICodeableConcept;
  type?: AllergyIntoleranceType;
  category?: AllergyIntoleranceCategory[];
  criticality?: AllergyIntoleranceCriticality;
  code?: ICodeableConcept;
  /** Patient reference (required) */
  patient: IReference<TID>;
  encounter?: IReference<TID>;
  onsetDateTime?: string;
  onsetAge?: IAge;
  onsetPeriod?: IPeriod;
  onsetRange?: IRange;
  onsetString?: string;
  recordedDate?: string;
  recorder?: IReference<TID>;
  asserter?: IReference<TID>;
  lastOccurrence?: string;
  note?: IAnnotation<TID>[];
  reaction?: AllergyIntoleranceReaction<TID>[];
}
