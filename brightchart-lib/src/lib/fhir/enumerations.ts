/**
 * FHIR R4 Code Enumerations
 *
 * Defines TypeScript enums for FHIR R4 required value sets used
 * throughout the BrightChart patient identity module.
 *
 * @see https://build.fhir.org/valueset-administrative-gender.html
 * @see https://build.fhir.org/valueset-name-use.html
 * @see https://build.fhir.org/valueset-address-use.html
 * @see https://build.fhir.org/valueset-address-type.html
 * @see https://build.fhir.org/valueset-contact-point-system.html
 * @see https://build.fhir.org/valueset-contact-point-use.html
 * @see https://build.fhir.org/valueset-narrative-status.html
 * @see https://build.fhir.org/valueset-link-type.html
 * @see https://build.fhir.org/valueset-identifier-use.html
 * @module fhir/enumerations
 */

/**
 * Administrative Gender
 * @see https://build.fhir.org/valueset-administrative-gender.html
 */
export enum AdministrativeGender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
  Unknown = 'unknown',
}

/**
 * Name Use
 * @see https://build.fhir.org/valueset-name-use.html
 */
export enum NameUse {
  Usual = 'usual',
  Official = 'official',
  Temp = 'temp',
  Nickname = 'nickname',
  Anonymous = 'anonymous',
  Old = 'old',
  Maiden = 'maiden',
}

/**
 * Address Use
 * @see https://build.fhir.org/valueset-address-use.html
 */
export enum AddressUse {
  Home = 'home',
  Work = 'work',
  Temp = 'temp',
  Old = 'old',
  Billing = 'billing',
}

/**
 * Address Type
 * @see https://build.fhir.org/valueset-address-type.html
 */
export enum AddressType {
  Postal = 'postal',
  Physical = 'physical',
  Both = 'both',
}

/**
 * Contact Point System
 * @see https://build.fhir.org/valueset-contact-point-system.html
 */
export enum ContactPointSystem {
  Phone = 'phone',
  Fax = 'fax',
  Email = 'email',
  Pager = 'pager',
  Url = 'url',
  Sms = 'sms',
  Other = 'other',
}

/**
 * Contact Point Use
 * @see https://build.fhir.org/valueset-contact-point-use.html
 */
export enum ContactPointUse {
  Home = 'home',
  Work = 'work',
  Temp = 'temp',
  Old = 'old',
  Mobile = 'mobile',
}

/**
 * Narrative Status
 * @see https://build.fhir.org/valueset-narrative-status.html
 */
export enum NarrativeStatus {
  Generated = 'generated',
  Extensions = 'extensions',
  Additional = 'additional',
  Empty = 'empty',
}

/**
 * Link Type (Patient.link.type)
 * @see https://build.fhir.org/valueset-link-type.html
 */
export enum LinkType {
  ReplacedBy = 'replaced-by',
  Replaces = 'replaces',
  Refer = 'refer',
  SeeAlso = 'seealso',
}

/**
 * Identifier Use
 * @see https://build.fhir.org/valueset-identifier-use.html
 */
export enum IdentifierUse {
  Usual = 'usual',
  Official = 'official',
  Temp = 'temp',
  Secondary = 'secondary',
  Old = 'old',
}
