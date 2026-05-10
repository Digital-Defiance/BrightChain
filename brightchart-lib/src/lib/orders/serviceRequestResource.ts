/**
 * FHIR R4 ServiceRequest Resource with BrightChain Metadata
 *
 * Defines the `IServiceRequestResource<TID>` interface representing a FHIR R4
 * ServiceRequest resource augmented with BrightChain storage metadata.
 * Supports lab orders, imaging orders, referrals, and procedure requests.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/servicerequest.html
 * @module orders/serviceRequestResource
 */

import {
  IAnnotation,
  IQuantity,
  IRange,
  IRatio,
  ITiming,
} from '../clinical/datatypes';
import {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IPeriod,
  IReference,
} from '../fhir/datatypes';
import { IBrightchainMetadata } from '../fhir/patientResource';
import {
  RequestPriority,
  ServiceRequestIntent,
  ServiceRequestStatus,
} from './enumerations';

/**
 * FHIR R4 ServiceRequest Resource with BrightChain extensions.
 *
 * Represents an order for a diagnostic test, procedure, referral, or other
 * service linked to a patient and optionally to an encounter.
 *
 * @see https://build.fhir.org/servicerequest.html
 */
export interface IServiceRequestResource<TID = string> {
  /** Fixed value: 'ServiceRequest' */
  resourceType: 'ServiceRequest';

  // --- FHIR metadata fields ---

  /** Logical id of this artifact */
  id?: string;

  /** Metadata about the resource */
  meta?: IMeta;

  /** Text summary of the resource */
  text?: INarrative;

  /** Additional content defined by implementations */
  extension?: IExtension[];

  // --- BrightChain metadata ---

  /** BrightChain storage metadata */
  brightchainMetadata: IBrightchainMetadata<TID>;

  // --- FHIR R4 ServiceRequest fields ---

  /** Business identifiers assigned to this service request */
  identifier?: IIdentifier<TID>[];

  /** Instantiates FHIR protocol or definition (canonical URIs) */
  instantiatesCanonical?: string[];

  /** Instantiates external protocol or definition (URIs) */
  instantiatesUri?: string[];

  /** What request fulfills (references to ServiceRequest, CarePlan, MedicationRequest) */
  basedOn?: IReference<TID>[];

  /** What request replaces */
  replaces?: IReference<TID>[];

  /** Composite request this is part of (shared requisition identifier) */
  requisition?: IIdentifier<TID>;

  /** draft | active | on-hold | revoked | completed | entered-in-error | unknown (required) */
  status: ServiceRequestStatus;

  /** proposal | plan | directive | order | original-order | reflex-order | filler-order | instance-order | option (required) */
  intent: ServiceRequestIntent;

  /** Classification of service (e.g. laboratory, imaging, counselling) */
  category?: ICodeableConcept[];

  /** routine | urgent | asap | stat */
  priority?: RequestPriority;

  /** True if service/procedure should NOT be performed */
  doNotPerform?: boolean;

  /** What is being requested/ordered (procedure code) */
  code?: ICodeableConcept;

  /** Additional order information */
  orderDetail?: ICodeableConcept[];

  /** Service amount — Quantity */
  quantityQuantity?: IQuantity;

  /** Service amount — Ratio */
  quantityRatio?: IRatio;

  /** Service amount — Range */
  quantityRange?: IRange;

  /** Individual or Entity the service is ordered for (Patient reference, required) */
  subject: IReference<TID>;

  /** Encounter in which the request was created */
  encounter?: IReference<TID>;

  /** When service should occur — dateTime */
  occurrenceDateTime?: string;

  /** When service should occur — Period */
  occurrencePeriod?: IPeriod;

  /** When service should occur — Timing */
  occurrenceTiming?: ITiming;

  /** Preconditions for service — boolean (true if as-needed) */
  asNeededBoolean?: boolean;

  /** Preconditions for service — CodeableConcept */
  asNeededCodeableConcept?: ICodeableConcept;

  /** Date request signed (dateTime) */
  authoredOn?: string;

  /** Who/what is requesting service (Practitioner, PractitionerRole, Organization, Patient, RelatedPerson, Device) */
  requester?: IReference<TID>;

  /** Performer role */
  performerType?: ICodeableConcept;

  /** Requested performer(s) */
  performer?: IReference<TID>[];

  /** Requested location (code) */
  locationCode?: ICodeableConcept[];

  /** Requested location (reference) */
  locationReference?: IReference<TID>[];

  /** Explanation/justification for procedure or service (code) */
  reasonCode?: ICodeableConcept[];

  /** Explanation/justification for procedure or service (reference) */
  reasonReference?: IReference<TID>[];

  /** Associated insurance coverage */
  insurance?: IReference<TID>[];

  /** Additional clinical information */
  supportingInfo?: IReference<TID>[];

  /** Procedure samples */
  specimen?: IReference<TID>[];

  /** Location on body */
  bodySite?: ICodeableConcept[];

  /** Comments */
  note?: IAnnotation<TID>[];

  /** Patient or consumer-oriented instructions */
  patientInstruction?: string;

  /** Request provenance */
  relevantHistory?: IReference<TID>[];
}
