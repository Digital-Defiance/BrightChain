/**
 * FHIR R4 Complex Datatypes
 *
 * Exported TypeScript interfaces for FHIR R4 complex datatypes used
 * throughout the BrightChart patient identity module.
 *
 * All interfaces that contain ID-typed fields are generic on `<TID = string>`
 * to support both frontend (string) and backend (Uint8Array) usage.
 *
 * @see https://build.fhir.org/datatypes.html
 * @module fhir/datatypes
 */

import {
  AddressType,
  AddressUse,
  AdministrativeGender,
  ContactPointSystem,
  ContactPointUse,
  IdentifierUse,
  LinkType,
  NameUse,
  NarrativeStatus,
} from './enumerations';

/**
 * FHIR R4 Period datatype
 * @see https://build.fhir.org/datatypes.html#Period
 */
export interface IPeriod {
  /** Starting time with inclusive boundary */
  start?: string;
  /** End time with inclusive boundary, if not ongoing */
  end?: string;
}

/**
 * FHIR R4 Coding datatype
 * @see https://build.fhir.org/datatypes.html#Coding
 */
export interface ICoding {
  /** Identity of the terminology system */
  system?: string;
  /** Version of the system */
  version?: string;
  /** Symbol in syntax defined by the system */
  code?: string;
  /** Representation defined by the system */
  display?: string;
  /** If this coding was chosen directly by the user */
  userSelected?: boolean;
}

/**
 * FHIR R4 CodeableConcept datatype
 * @see https://build.fhir.org/datatypes.html#CodeableConcept
 */
export interface ICodeableConcept {
  /** Code defined by a terminology system */
  coding?: ICoding[];
  /** Plain text representation of the concept */
  text?: string;
}

/**
 * FHIR R4 Extension datatype
 * @see https://build.fhir.org/extensibility.html#Extension
 */
export interface IExtension {
  /** Identifies the meaning of the extension */
  url: string;
  /** Value of extension - can be any FHIR datatype */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * FHIR R4 Identifier datatype
 * @see https://build.fhir.org/datatypes.html#Identifier
 */
export interface IIdentifier<TID = string> {
  /** usual | official | temp | secondary | old */
  use?: IdentifierUse;
  /** Description of identifier */
  type?: ICodeableConcept;
  /** The namespace for the identifier value */
  system?: string;
  /** The value that is unique */
  value?: string;
  /** Time period when id is/was valid for use */
  period?: IPeriod;
  /** Organization that issued id */
  assigner?: IReference<TID>;
}

/**
 * FHIR R4 Reference datatype
 * @see https://build.fhir.org/references.html#Reference
 */
export interface IReference<TID = string> {
  /** Literal reference, Relative, internal or absolute URL */
  reference?: string;
  /** Type the reference refers to (e.g. "Patient") */
  type?: string;
  /** Logical reference, when literal reference is not known */
  identifier?: IIdentifier<TID>;
  /** Text alternative for the resource */
  display?: string;
}

/**
 * FHIR R4 HumanName datatype
 * @see https://build.fhir.org/datatypes.html#HumanName
 */
export interface IHumanName {
  /** usual | official | temp | nickname | anonymous | old | maiden */
  use?: NameUse;
  /** Text representation of the full name */
  text?: string;
  /** Family name (often called 'Surname') */
  family?: string;
  /** Given names (not always 'first'). Includes middle names */
  given?: string[];
  /** Parts that come before the name */
  prefix?: string[];
  /** Parts that come after the name */
  suffix?: string[];
  /** Time period when name was/is in use */
  period?: IPeriod;
}

/**
 * FHIR R4 Address datatype
 * @see https://build.fhir.org/datatypes.html#Address
 */
export interface IAddress {
  /** home | work | temp | old | billing */
  use?: AddressUse;
  /** postal | physical | both */
  type?: AddressType;
  /** Text representation of the address */
  text?: string;
  /** Street name, number, direction & P.O. Box etc. */
  line?: string[];
  /** Name of city, town etc. */
  city?: string;
  /** District name (aka county) */
  district?: string;
  /** Sub-unit of country (abbreviations ok) */
  state?: string;
  /** Postal code for area */
  postalCode?: string;
  /** Country (e.g. may be ISO 3166 2 or 3 letter code) */
  country?: string;
  /** Time period when address was/is in use */
  period?: IPeriod;
}

/**
 * FHIR R4 ContactPoint datatype
 * @see https://build.fhir.org/datatypes.html#ContactPoint
 */
export interface IContactPoint {
  /** phone | fax | email | pager | url | sms | other */
  system?: ContactPointSystem;
  /** The actual contact point details */
  value?: string;
  /** home | work | temp | old | mobile */
  use?: ContactPointUse;
  /** Specify preferred order of use (1 = highest) */
  rank?: number;
  /** Time period when the contact point was/is in use */
  period?: IPeriod;
}

/**
 * FHIR R4 Narrative datatype
 * @see https://build.fhir.org/narrative.html#Narrative
 */
export interface INarrative {
  /** generated | extensions | additional | empty */
  status: NarrativeStatus;
  /** Limited xhtml content */
  div: string;
}

/**
 * FHIR R4 Meta datatype
 * @see https://build.fhir.org/resource.html#Meta
 */
export interface IMeta {
  /** Version specific identifier */
  versionId?: string;
  /** When the resource version last changed */
  lastUpdated?: string;
  /** Identifies where the resource comes from */
  source?: string;
  /** Profiles this resource claims to conform to */
  profile?: string[];
  /** Security Labels applied to this resource */
  security?: ICoding[];
  /** Tags applied to this resource */
  tag?: ICoding[];
}

/**
 * FHIR R4 Patient.contact backbone element
 * @see https://build.fhir.org/patient-definitions.html#Patient.contact
 */
export interface IPatientContact<TID = string> {
  /** The kind of relationship */
  relationship?: ICodeableConcept[];
  /** A name associated with the contact person */
  name?: IHumanName;
  /** A contact detail for the person */
  telecom?: IContactPoint[];
  /** Address for the contact person */
  address?: IAddress;
  /** male | female | other | unknown */
  gender?: AdministrativeGender;
  /** Organization that is associated with the contact */
  organization?: IReference<TID>;
  /** The period during which this contact person is valid */
  period?: IPeriod;
}

/**
 * FHIR R4 Patient.communication backbone element
 * @see https://build.fhir.org/patient-definitions.html#Patient.communication
 */
export interface IPatientCommunication {
  /** The language which can be used to communicate with the patient */
  language: ICodeableConcept;
  /** Language preference indicator */
  preferred?: boolean;
}

/**
 * FHIR R4 Patient.link backbone element
 * @see https://build.fhir.org/patient-definitions.html#Patient.link
 */
export interface IPatientLink<TID = string> {
  /** The other patient or related person resource that the link refers to */
  other: IReference<TID>;
  /** replaced-by | replaces | refer | seealso */
  type: LinkType;
}
