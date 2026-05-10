/**
 * FHIR R4 MedicationRequest Resource with BrightChain Metadata
 *
 * Defines the `IMedicationRequestResource<TID>` interface representing a FHIR R4
 * MedicationRequest resource augmented with BrightChain storage metadata.
 * Supports prescriptions and medication orders.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/medicationrequest.html
 * @module orders/medicationRequestResource
 */

import { IAnnotation, IDosage } from '../clinical/datatypes';
import {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IReference,
} from '../fhir/datatypes';
import { IBrightchainMetadata } from '../fhir/patientResource';
import {
  MedicationRequestDispenseRequest,
  MedicationRequestSubstitution,
} from './backboneElements';
import {
  MedicationRequestIntent,
  MedicationRequestStatus,
  RequestPriority,
} from './enumerations';

/**
 * FHIR R4 MedicationRequest Resource with BrightChain extensions.
 *
 * Represents a prescription or medication order for a patient,
 * linked to an encounter and optionally to a prior prescription.
 *
 * @see https://build.fhir.org/medicationrequest.html
 */
export interface IMedicationRequestResource<TID = string> {
  /** Fixed value: 'MedicationRequest' */
  resourceType: 'MedicationRequest';

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

  // --- FHIR R4 MedicationRequest fields ---

  /** Business identifiers assigned to this medication request */
  identifier?: IIdentifier<TID>[];

  /** active | on-hold | cancelled | completed | entered-in-error | stopped | draft | unknown (required) */
  status: MedicationRequestStatus;

  /** Reason for current status */
  statusReason?: ICodeableConcept;

  /** proposal | plan | order | original-order | reflex-order | filler-order | instance-order | option (required) */
  intent: MedicationRequestIntent;

  /** Type of medication usage (e.g. inpatient, outpatient, community) */
  category?: ICodeableConcept[];

  /** routine | urgent | asap | stat */
  priority?: RequestPriority;

  /** True if request is prohibiting action */
  doNotPerform?: boolean;

  /** Reported rather than primary record — boolean */
  reportedBoolean?: boolean;

  /** Reported rather than primary record — Reference */
  reportedReference?: IReference<TID>;

  /** Medication to be taken — CodeableConcept */
  medicationCodeableConcept?: ICodeableConcept;

  /** Medication to be taken — Reference (to Medication resource) */
  medicationReference?: IReference<TID>;

  /** Who or group medication request is for (Patient reference, required) */
  subject: IReference<TID>;

  /** Encounter created as part of encounter/admission/stay */
  encounter?: IReference<TID>;

  /** Additional information to support the medication request */
  supportingInformation?: IReference<TID>[];

  /** When request was initially authored (dateTime) */
  authoredOn?: string;

  /** Who/what requested the medication request (Practitioner, PractitionerRole, Organization, Patient, RelatedPerson, Device) */
  requester?: IReference<TID>;

  /** Intended performer of administration */
  performer?: IReference<TID>;

  /** Desired kind of performer of the medication administration */
  performerType?: ICodeableConcept;

  /** Person who entered the request */
  recorder?: IReference<TID>;

  /** Reason or indication for ordering or not ordering the medication (code) */
  reasonCode?: ICodeableConcept[];

  /** Condition or observation that supports why the medication was ordered (reference) */
  reasonReference?: IReference<TID>[];

  /** Instantiates FHIR protocol or definition (canonical URIs) */
  instantiatesCanonical?: string[];

  /** Instantiates external protocol or definition (URIs) */
  instantiatesUri?: string[];

  /** What request fulfills (references to CarePlan, MedicationRequest, ServiceRequest, ImmunizationRecommendation) */
  basedOn?: IReference<TID>[];

  /** Composite request this is part of (shared group identifier) */
  groupIdentifier?: IIdentifier<TID>;

  /** Overall pattern of medication administration (e.g. continuous, acute, seasonal) */
  courseOfTherapyType?: ICodeableConcept;

  /** Associated insurance coverage */
  insurance?: IReference<TID>[];

  /** Information about the prescription */
  note?: IAnnotation<TID>[];

  /** How the medication should be taken (array of IDosage from clinical module) */
  dosageInstruction?: IDosage[];

  /** Medication supply authorization */
  dispenseRequest?: MedicationRequestDispenseRequest<TID>;

  /** Any restrictions on medication substitution */
  substitution?: MedicationRequestSubstitution<TID>;

  /** An order/prescription that is being replaced */
  priorPrescription?: IReference<TID>;
}
