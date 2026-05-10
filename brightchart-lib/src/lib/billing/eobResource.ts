/**
 * FHIR R4 ExplanationOfBenefit Resource with BrightChain Metadata
 *
 * Defines the `IExplanationOfBenefitResource<TID>` interface representing
 * a FHIR R4 ExplanationOfBenefit resource augmented with BrightChain
 * storage metadata. Combines claim details with adjudication results
 * including outcome, per-item adjudication, totals, and payment.
 *
 * Also defines EOB-specific backbone elements: `EOBItem`, `EOBAdjudication`,
 * `EOBTotal`, and `EOBPayment`.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/explanationofbenefit.html
 * @module billing/eobResource
 */

import type {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IPeriod,
  IReference,
} from '../fhir/datatypes';
import type { IBrightchainMetadata } from '../fhir/patientResource';
import type {
  ClaimAccident,
  ClaimCareTeam,
  ClaimDiagnosis,
  ClaimInsurance,
  ClaimPayee,
  ClaimProcedure,
  ClaimRelated,
  ClaimSupportingInfo,
} from './claimBackboneElements';
import type { ClaimUse, EOBStatus, RemittanceOutcome } from './enumerations';
import type { IMoney } from './moneyType';

// ---------------------------------------------------------------------------
// EOB Backbone Elements
// ---------------------------------------------------------------------------

/**
 * FHIR R4 ExplanationOfBenefit.item.adjudication backbone element.
 * Adjudication details for a claim line item or overall claim.
 * @see https://build.fhir.org/explanationofbenefit-definitions.html#ExplanationOfBenefit.item.adjudication
 */
export interface EOBAdjudication {
  /** Type of adjudication information (required) — e.g. submitted, eligible, benefit, deductible, copay */
  category: ICodeableConcept;
  /** Explanation of adjudication outcome */
  reason?: ICodeableConcept;
  /** Monetary amount associated with the category */
  amount?: IMoney;
  /** Non-monetary value */
  value?: number;
}

/**
 * FHIR R4 ExplanationOfBenefit.item backbone element.
 * Adjudication for claim line items.
 * @see https://build.fhir.org/explanationofbenefit-definitions.html#ExplanationOfBenefit.item
 */
export interface EOBItem<_TID = string> {
  /** Claim item instance identifier / sequence number (required) */
  itemSequence: number;
  /** Adjudication details */
  adjudication?: EOBAdjudication[];
  /** Additional items — second-tier service detail */
  detail?: {
    /** Detail sequence number */
    detailSequence: number;
    /** Detail level adjudication details */
    adjudication?: EOBAdjudication[];
    /** Sub-detail adjudication */
    subDetail?: {
      /** Sub-detail sequence number */
      subDetailSequence: number;
      /** Sub-detail level adjudication details */
      adjudication?: EOBAdjudication[];
    }[];
  }[];
}

/**
 * FHIR R4 ExplanationOfBenefit.total backbone element.
 * Categorized monetary totals for the adjudication.
 * @see https://build.fhir.org/explanationofbenefit-definitions.html#ExplanationOfBenefit.total
 */
export interface EOBTotal {
  /** Type of adjudication total (required) — e.g. submitted, benefit */
  category: ICodeableConcept;
  /** Financial total for the category (required) */
  amount: IMoney;
}

/**
 * FHIR R4 ExplanationOfBenefit.payment backbone element.
 * Payment details for the adjudication.
 * @see https://build.fhir.org/explanationofbenefit-definitions.html#ExplanationOfBenefit.payment
 */
export interface EOBPayment {
  /** Partial or complete payment */
  type?: ICodeableConcept;
  /** Payment adjustment for non-claim issues */
  adjustment?: IMoney;
  /** Explanation for the adjustment */
  adjustmentReason?: ICodeableConcept;
  /** Expected date of payment */
  date?: string;
  /** Payable amount after adjustment */
  amount?: IMoney;
  /** Business identifier for the payment */
  identifier?: IIdentifier;
}

// ---------------------------------------------------------------------------
// ExplanationOfBenefit Resource
// ---------------------------------------------------------------------------

/**
 * FHIR R4 ExplanationOfBenefit Resource with BrightChain extensions.
 *
 * Combines claim details with adjudication results: outcome,
 * per-item adjudication, totals, and payment information.
 *
 * @see https://build.fhir.org/explanationofbenefit.html
 */
export interface IExplanationOfBenefitResource<TID = string> {
  /** Fixed value: 'ExplanationOfBenefit' */
  resourceType: 'ExplanationOfBenefit';

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

  // --- FHIR R4 ExplanationOfBenefit fields ---

  /** Business identifiers */
  identifier?: IIdentifier<TID>[];

  /** active | cancelled | draft | entered-in-error (required) */
  status: EOBStatus;

  /** Category or discipline (required) */
  type: ICodeableConcept;

  /** More granular claim type */
  subType?: ICodeableConcept;

  /** claim | preauthorization | predetermination (required) */
  use: ClaimUse;

  /** The recipient of the products and services (required) */
  patient: IReference<TID>;

  /** Relevant time frame for the claim */
  billablePeriod?: IPeriod;

  /** Response creation date (required) */
  created: string;

  /** Author of the claim */
  enterer?: IReference<TID>;

  /** Party responsible for reimbursement (required) */
  insurer: IReference<TID>;

  /** Party responsible for the claim (required) */
  provider: IReference<TID>;

  /** Desired processing urgency */
  priority?: ICodeableConcept;

  /** For whom to reserve funds (requested) */
  fundsReserveRequested?: ICodeableConcept;

  /** For whom to reserve funds (actual) */
  fundsReserve?: ICodeableConcept;

  /** Prior or corollary claims */
  related?: ClaimRelated<TID>[];

  /** Prescription authorizing services or products */
  prescription?: IReference<TID>;

  /** Original prescription if superseded by fulfiller */
  originalPrescription?: IReference<TID>;

  /** Recipient of benefits payable */
  payee?: ClaimPayee<TID>;

  /** Treatment referral */
  referral?: IReference<TID>;

  /** Servicing facility */
  facility?: IReference<TID>;

  /** Claim reference */
  claim?: IReference<TID>;

  /** Claim response reference */
  claimResponse?: IReference<TID>;

  /** queued | complete | error | partial (required) */
  outcome: RemittanceOutcome;

  /** Disposition message */
  disposition?: string;

  /** Preauthorization reference */
  preAuthRef?: string[];

  /** Preauthorization in-effect period */
  preAuthRefPeriod?: IPeriod[];

  /** Care team members */
  careTeam?: ClaimCareTeam<TID>[];

  /** Supporting information */
  supportingInfo?: ClaimSupportingInfo<TID>[];

  /** Pertinent diagnosis information */
  diagnosis?: ClaimDiagnosis<TID>[];

  /** Clinical procedures performed */
  procedure?: ClaimProcedure<TID>[];

  /** Precedence (Tier) */
  precedence?: number;

  /** Patient insurance information (required) */
  insurance: ClaimInsurance<TID>[];

  /** Details of the event causing the claim */
  accident?: ClaimAccident<TID>;

  /** Adjudication for claim line items */
  item?: EOBItem<TID>[];

  /** Insurer added line items */
  addItem?: EOBItem<TID>[];

  /** Header-level adjudication */
  adjudication?: EOBAdjudication[];

  /** Adjudication totals */
  total?: EOBTotal[];

  /** Payment details */
  payment?: EOBPayment;

  /** Printed form identifier */
  formCode?: ICodeableConcept;

  /** Printed reference or actual form */
  form?: Record<string, unknown>;

  /** Note concerning adjudication */
  processNote?: {
    /** Sequence number */
    number?: number;
    /** display | print | printoper */
    type?: ICodeableConcept;
    /** Note explanatory text */
    text?: string;
    /** Language of the text */
    language?: ICodeableConcept;
  }[];

  /** When the benefits are applicable */
  benefitPeriod?: IPeriod;

  /** Balance by benefit category */
  benefitBalance?: {
    /** Benefit classification */
    category: ICodeableConcept;
    /** Excluded from the plan */
    excluded?: boolean;
    /** Short name for the benefit */
    name?: string;
    /** Description of the benefit or services covered */
    description?: string;
    /** In or out of network */
    network?: ICodeableConcept;
    /** Individual or family */
    unit?: ICodeableConcept;
    /** Annual or lifetime */
    term?: ICodeableConcept;
    /** Benefit summary */
    financial?: {
      /** Benefit classification */
      type: ICodeableConcept;
      /** Benefits allowed — as unsigned int */
      allowedUnsignedInt?: number;
      /** Benefits allowed — as string */
      allowedString?: string;
      /** Benefits allowed — as Money */
      allowedMoney?: IMoney;
      /** Benefits used — as unsigned int */
      usedUnsignedInt?: number;
      /** Benefits used — as Money */
      usedMoney?: IMoney;
    }[];
  }[];
}
