/**
 * FHIR R4 Patient Resource with BrightChain Metadata
 *
 * Defines the `IPatientResource<TID>` interface representing a FHIR R4
 * Patient resource augmented with BrightChain storage metadata.
 *
 * @see https://build.fhir.org/patient.html
 * @module fhir/patientResource
 */

import { BlockEncryptionType } from '@brightchain/brightchain-lib';
import {
  IAddress,
  ICodeableConcept,
  IContactPoint,
  IExtension,
  IHumanName,
  IIdentifier,
  IMeta,
  INarrative,
  IPatientCommunication,
  IPatientContact,
  IPatientLink,
  IReference,
} from './datatypes';
import { AdministrativeGender } from './enumerations';

/**
 * BrightChain storage metadata attached to every Patient resource.
 */
export interface IBrightchainMetadata<TID = string> {
  /** Block ID in BrightChain storage */
  blockId: TID;
  /** Member ID of the creator */
  creatorMemberId: TID;
  /** Timestamp when the record was created */
  createdAt: Date;
  /** Timestamp when the record was last updated */
  updatedAt: Date;
  /** Pool ID for the patient data pool */
  poolId: string;
  /** Encryption type used for the block */
  encryptionType: BlockEncryptionType;
}

/**
 * FHIR R4 Patient Resource with BrightChain extensions.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/patient.html
 */
export interface IPatientResource<TID = string> {
  // --- FHIR Resource fields ---

  /** Fixed value: 'Patient' */
  resourceType: 'Patient';

  /** Logical id of this artifact */
  id?: string;

  /** Metadata about the resource */
  meta?: IMeta;

  /** Text summary of the resource */
  text?: INarrative;

  /** Additional content defined by implementations */
  extension?: IExtension[];

  // --- FHIR R4 Patient fields ---

  /** An identifier for this patient */
  identifier?: IIdentifier<TID>[];

  /** Whether this patient's record is in active use */
  active?: boolean;

  /** A name associated with the patient */
  name?: IHumanName[];

  /** A contact detail for the individual */
  telecom?: IContactPoint[];

  /** male | female | other | unknown */
  gender?: AdministrativeGender;

  /** The date of birth for the individual */
  birthDate?: string;

  /** Indicates if the individual is deceased (boolean) */
  deceasedBoolean?: boolean;

  /** Indicates if the individual is deceased (dateTime) */
  deceasedDateTime?: string;

  /** An address for the individual */
  address?: IAddress[];

  /** Marital (civil) status of a patient */
  maritalStatus?: ICodeableConcept;

  /** Whether patient is part of a multiple birth (boolean) */
  multipleBirthBoolean?: boolean;

  /** Whether patient is part of a multiple birth (integer) */
  multipleBirthInteger?: number;

  /** A contact party for the patient */
  contact?: IPatientContact<TID>[];

  /** A language which may be used to communicate with the patient */
  communication?: IPatientCommunication[];

  /** Patient's nominated primary care provider */
  generalPractitioner?: IReference<TID>[];

  /** Organization that is the custodian of the patient record */
  managingOrganization?: IReference<TID>;

  /** Link to another patient resource that concerns the same actual person */
  link?: IPatientLink<TID>[];

  // --- BrightChain extensions ---

  /** BrightChain storage metadata */
  brightchainMetadata?: IBrightchainMetadata<TID>;
}
