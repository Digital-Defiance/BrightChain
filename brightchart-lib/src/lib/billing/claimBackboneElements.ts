/**
 * FHIR R4 Claim Backbone Elements
 *
 * Exported TypeScript interfaces for backbone elements used by the
 * Claim resource: ClaimItem, ClaimItemDetail, ClaimItemDetailSubDetail,
 * ClaimDiagnosis, ClaimProcedure, ClaimInsurance, ClaimCareTeam,
 * ClaimSupportingInfo, ClaimPayee, ClaimRelated, and ClaimAccident.
 *
 * Interfaces containing IReference fields are generic on `<TID = string>`
 * to support both frontend (string) and backend (Uint8Array) usage.
 *
 * @see https://build.fhir.org/claim.html
 * @module billing/claimBackboneElements
 */

import type { IQuantity } from '../clinical/datatypes';
import type {
  IAddress,
  ICodeableConcept,
  IIdentifier,
  IPeriod,
  IReference,
} from '../fhir/datatypes';
import type { IMoney } from './moneyType';

// ---------------------------------------------------------------------------
// Line-item sub-detail (deepest nesting level)
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.item.detail.subDetail backbone element.
 * Third-tier product/service information for a claim line item.
 * @see https://build.fhir.org/claim-definitions.html#Claim.item.detail.subDetail
 */
export interface ClaimItemDetailSubDetail<TID = string> {
  /** Sub-detail sequence number (required) */
  sequence: number;
  /** Revenue or cost center code */
  revenue?: ICodeableConcept;
  /** Benefit classification */
  category?: ICodeableConcept;
  /** Billing, service, product, or drug code (required) */
  productOrService: ICodeableConcept;
  /** Service/product billing modifiers */
  modifier?: ICodeableConcept[];
  /** Program the product or service is provided under */
  programCode?: ICodeableConcept[];
  /** Count of products or services */
  quantity?: IQuantity;
  /** Fee, charge or cost per item */
  unitPrice?: IMoney;
  /** Price scaling factor */
  factor?: number;
  /** Total item cost (quantity × unitPrice × factor) */
  net?: IMoney;
  /** Unique device identifier references */
  udi?: IReference<TID>[];
}

// ---------------------------------------------------------------------------
// Line-item detail (second nesting level)
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.item.detail backbone element.
 * Second-tier product/service information for a claim line item.
 * @see https://build.fhir.org/claim-definitions.html#Claim.item.detail
 */
export interface ClaimItemDetail<TID = string> {
  /** Detail sequence number (required) */
  sequence: number;
  /** Revenue or cost center code */
  revenue?: ICodeableConcept;
  /** Benefit classification */
  category?: ICodeableConcept;
  /** Billing, service, product, or drug code (required) */
  productOrService: ICodeableConcept;
  /** Service/product billing modifiers */
  modifier?: ICodeableConcept[];
  /** Program the product or service is provided under */
  programCode?: ICodeableConcept[];
  /** Count of products or services */
  quantity?: IQuantity;
  /** Fee, charge or cost per item */
  unitPrice?: IMoney;
  /** Price scaling factor */
  factor?: number;
  /** Total item cost (quantity × unitPrice × factor) */
  net?: IMoney;
  /** Unique device identifier references */
  udi?: IReference<TID>[];
  /** Third-tier product/service information */
  subDetail?: ClaimItemDetailSubDetail<TID>[];
}

// ---------------------------------------------------------------------------
// Line item (top-level)
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.item backbone element.
 * Product or service provided during the encounter.
 * @see https://build.fhir.org/claim-definitions.html#Claim.item
 */
export interface ClaimItem<TID = string> {
  /** Item instance identifier / sequence number (required) */
  sequence: number;
  /** Applicable care team members (positiveInt references into careTeam) */
  careTeamSequence?: number[];
  /** Applicable diagnoses (positiveInt references into diagnosis) */
  diagnosisSequence?: number[];
  /** Applicable procedures (positiveInt references into procedure) */
  procedureSequence?: number[];
  /** Applicable exception and supporting information (positiveInt references into supportingInfo) */
  informationSequence?: number[];
  /** Revenue or cost center code */
  revenue?: ICodeableConcept;
  /** Benefit classification */
  category?: ICodeableConcept;
  /** Billing, service, product, or drug code (required) */
  productOrService: ICodeableConcept;
  /** Service/product billing modifiers */
  modifier?: ICodeableConcept[];
  /** Program the product or service is provided under */
  programCode?: ICodeableConcept[];
  /** Date or dates of service (as FHIR date string) */
  servicedDate?: string;
  /** Date or dates of service (as period) */
  servicedPeriod?: IPeriod;
  /** Place of service or where product was supplied — as CodeableConcept */
  locationCodeableConcept?: ICodeableConcept;
  /** Place of service or where product was supplied — as Address */
  locationAddress?: IAddress;
  /** Place of service or where product was supplied — as Reference */
  locationReference?: IReference<TID>;
  /** Count of products or services */
  quantity?: IQuantity;
  /** Fee, charge or cost per item */
  unitPrice?: IMoney;
  /** Price scaling factor */
  factor?: number;
  /** Total item cost (quantity × unitPrice × factor) */
  net?: IMoney;
  /** Unique device identifier references */
  udi?: IReference<TID>[];
  /** Anatomical location (e.g. tooth number for dental) */
  bodySite?: ICodeableConcept;
  /** Anatomical sub-location (e.g. tooth surface for dental) */
  subSite?: ICodeableConcept[];
  /** Encounters related to this billed item */
  encounter?: IReference<TID>[];
  /** Product or service provided — detail level */
  detail?: ClaimItemDetail<TID>[];
}

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.diagnosis backbone element.
 * Pertinent diagnosis information for the claim.
 * @see https://build.fhir.org/claim-definitions.html#Claim.diagnosis
 */
export interface ClaimDiagnosis<TID = string> {
  /** Diagnosis instance identifier / sequence number (required) */
  sequence: number;
  /** Nature of illness or problem — as CodeableConcept */
  diagnosisCodeableConcept?: ICodeableConcept;
  /** Nature of illness or problem — as Reference */
  diagnosisReference?: IReference<TID>;
  /** Timing or nature of the diagnosis */
  type?: ICodeableConcept[];
  /** Present on admission */
  onAdmission?: ICodeableConcept;
  /** Package billing code */
  packageCode?: ICodeableConcept;
}

// ---------------------------------------------------------------------------
// Procedure
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.procedure backbone element.
 * Clinical procedures performed during the encounter.
 * @see https://build.fhir.org/claim-definitions.html#Claim.procedure
 */
export interface ClaimProcedure<TID = string> {
  /** Procedure instance identifier / sequence number (required) */
  sequence: number;
  /** Category of procedure */
  type?: ICodeableConcept[];
  /** When the procedure was performed */
  date?: string;
  /** Specific clinical procedure — as CodeableConcept */
  procedureCodeableConcept?: ICodeableConcept;
  /** Specific clinical procedure — as Reference */
  procedureReference?: IReference<TID>;
  /** Unique device identifier */
  udi?: IReference<TID>[];
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.insurance backbone element.
 * Patient insurance information for adjudication.
 * @see https://build.fhir.org/claim-definitions.html#Claim.insurance
 */
export interface ClaimInsurance<TID = string> {
  /** Insurance instance identifier / sequence number (required) */
  sequence: number;
  /** Coverage to be used for adjudication (required) */
  focal: boolean;
  /** Pre-assigned claim number */
  identifier?: IIdentifier<TID>;
  /** Insurance information (required) */
  coverage: IReference<TID>;
  /** Additional provider contract number */
  businessArrangement?: string;
  /** Prior authorization reference number */
  preAuthRef?: string[];
  /** Adjudication results */
  claimResponse?: IReference<TID>;
}

// ---------------------------------------------------------------------------
// Care Team
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.careTeam backbone element.
 * Members of the care team involved in the encounter.
 * @see https://build.fhir.org/claim-definitions.html#Claim.careTeam
 */
export interface ClaimCareTeam<TID = string> {
  /** Care team instance identifier / sequence number (required) */
  sequence: number;
  /** Practitioner or organization (required) */
  provider: IReference<TID>;
  /** Indicator of the lead practitioner */
  responsible?: boolean;
  /** Function within the team (e.g. rendering, supervising) */
  role?: ICodeableConcept;
  /** Practitioner credential or specialization */
  qualification?: ICodeableConcept;
}

// ---------------------------------------------------------------------------
// Supporting Information
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.supportingInfo backbone element.
 * Additional information codes and values for processing.
 * @see https://build.fhir.org/claim-definitions.html#Claim.supportingInfo
 */
export interface ClaimSupportingInfo<TID = string> {
  /** Information instance identifier / sequence number (required) */
  sequence: number;
  /** Classification of the supplied information (required) */
  category: ICodeableConcept;
  /** Type of information */
  code?: ICodeableConcept;
  /** When it occurred — as date string */
  timingDate?: string;
  /** When it occurred — as period */
  timingPeriod?: IPeriod;
  /** Data to be provided — as boolean */
  valueBoolean?: boolean;
  /** Data to be provided — as string */
  valueString?: string;
  /** Data to be provided — as Quantity */
  valueQuantity?: IQuantity;
  /** Data to be provided — as Attachment (simplified) */
  valueAttachment?: Record<string, unknown>;
  /** Data to be provided — as Reference */
  valueReference?: IReference<TID>;
  /** Explanation for the information */
  reason?: ICodeableConcept;
}

// ---------------------------------------------------------------------------
// Payee
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.payee backbone element.
 * Recipient of benefits payable.
 * @see https://build.fhir.org/claim-definitions.html#Claim.payee
 */
export interface ClaimPayee<TID = string> {
  /** Category of recipient (required) */
  type: ICodeableConcept;
  /** Recipient reference */
  party?: IReference<TID>;
}

// ---------------------------------------------------------------------------
// Related Claim
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.related backbone element.
 * Prior or corollary claims.
 * @see https://build.fhir.org/claim-definitions.html#Claim.related
 */
export interface ClaimRelated<TID = string> {
  /** Reference to the related claim */
  claim?: IReference<TID>;
  /** How the reference claim is related */
  relationship?: ICodeableConcept;
  /** File or case reference */
  reference?: IIdentifier<TID>;
}

// ---------------------------------------------------------------------------
// Accident
// ---------------------------------------------------------------------------

/**
 * FHIR R4 Claim.accident backbone element.
 * Details of the event that caused the injury or illness.
 * @see https://build.fhir.org/claim-definitions.html#Claim.accident
 */
export interface ClaimAccident<TID = string> {
  /** When the incident occurred (required, FHIR date string) */
  date: string;
  /** The nature of the accident */
  type?: ICodeableConcept;
  /** Where the event occurred — as Address */
  locationAddress?: IAddress;
  /** Where the event occurred — as Reference */
  locationReference?: IReference<TID>;
}
