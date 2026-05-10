/**
 * FHIR R4 CoverageEligibilityRequest / CoverageEligibilityResponse
 * Resources with BrightChain Metadata
 *
 * Defines the `ICoverageEligibilityRequestResource<TID>` and
 * `ICoverageEligibilityResponseResource<TID>` interfaces for real-time
 * insurance eligibility verification.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/coverageeligibilityrequest.html
 * @see https://build.fhir.org/coverageeligibilityresponse.html
 * @module billing/eligibilityResources
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
  EligibilityRequestPurpose,
  RemittanceOutcome,
} from './enumerations';
import type { IMoney } from './moneyType';

// ---------------------------------------------------------------------------
// CoverageEligibilityRequest
// ---------------------------------------------------------------------------

/**
 * FHIR R4 CoverageEligibilityRequest Resource with BrightChain extensions.
 *
 * A request to an insurer to verify coverage eligibility and/or
 * benefit details for a patient.
 *
 * @see https://build.fhir.org/coverageeligibilityrequest.html
 */
export interface ICoverageEligibilityRequestResource<TID = string> {
  /** Fixed value: 'CoverageEligibilityRequest' */
  resourceType: 'CoverageEligibilityRequest';

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

  // --- FHIR R4 CoverageEligibilityRequest fields ---

  /** Business identifiers */
  identifier?: IIdentifier<TID>[];

  /** active | cancelled | draft | entered-in-error (required) */
  status: string;

  /** auth-requirements | benefits | discovery | validation (required) */
  purpose: EligibilityRequestPurpose[];

  /** Intended recipient of products and services (required) */
  patient: IReference<TID>;

  /** Estimated date or dates of service — as date string */
  servicedDate?: string;

  /** Estimated date or dates of service — as period */
  servicedPeriod?: IPeriod;

  /** Creation date (required) */
  created: string;

  /** Author of the request */
  enterer?: IReference<TID>;

  /** Party responsible for the request */
  provider?: IReference<TID>;

  /** Coverage issuer (required) */
  insurer: IReference<TID>;

  /** Servicing facility */
  facility?: IReference<TID>;

  /** Supporting information */
  supportingInfo?: {
    /** Information instance identifier / sequence number (required) */
    sequence: number;
    /** Data to be provided */
    information: IReference<TID>;
    /** Applies to all items */
    appliesToAll?: boolean;
  }[];

  /** Patient insurance information */
  insurance?: {
    /** Applicable coverage (required) */
    focal?: boolean;
    /** Insurance information (required) */
    coverage: IReference<TID>;
    /** Additional provider contract number */
    businessArrangement?: string;
  }[];
}

// ---------------------------------------------------------------------------
// CoverageEligibilityResponse
// ---------------------------------------------------------------------------

/**
 * FHIR R4 CoverageEligibilityResponse Resource with BrightChain extensions.
 *
 * The insurer's response to an eligibility request, containing
 * coverage status, benefit details, and authorization requirements.
 *
 * @see https://build.fhir.org/coverageeligibilityresponse.html
 */
export interface ICoverageEligibilityResponseResource<TID = string> {
  /** Fixed value: 'CoverageEligibilityResponse' */
  resourceType: 'CoverageEligibilityResponse';

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

  // --- FHIR R4 CoverageEligibilityResponse fields ---

  /** Business identifiers */
  identifier?: IIdentifier<TID>[];

  /** active | cancelled | draft | entered-in-error (required) */
  status: string;

  /** auth-requirements | benefits | discovery | validation (required) */
  purpose: EligibilityRequestPurpose[];

  /** Intended recipient of products and services (required) */
  patient: IReference<TID>;

  /** Estimated date or dates of service — as date string */
  servicedDate?: string;

  /** Estimated date or dates of service — as period */
  servicedPeriod?: IPeriod;

  /** Response creation date (required) */
  created: string;

  /** Party performing eligibility determination */
  requestor?: IReference<TID>;

  /** Eligibility request reference (required) */
  request: IReference<TID>;

  /** queued | complete | error | partial (required) */
  outcome: RemittanceOutcome;

  /** Disposition message */
  disposition?: string;

  /** Coverage issuer (required) */
  insurer: IReference<TID>;

  /** Insurance plan details, preauthorization requirements, and benefit details */
  insurance?: {
    /** Insurance information (required) */
    coverage: IReference<TID>;
    /** Coverage inforce indicator */
    inforce?: boolean;
    /** When the benefits are applicable */
    benefitPeriod?: IPeriod;
    /** Benefits and authorization details */
    item?: {
      /** Benefit classification */
      category?: ICodeableConcept;
      /** Billing, service, product, or drug code */
      productOrService?: ICodeableConcept;
      /** Product or service billing modifiers */
      modifier?: ICodeableConcept[];
      /** Performing practitioner */
      provider?: IReference<TID>;
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
      benefit?: {
        /** Benefit classification (required) */
        type: ICodeableConcept;
        /** Benefits allowed — as Money */
        allowedMoney?: IMoney;
        /** Benefits allowed — as unsigned int */
        allowedUnsignedInt?: number;
        /** Benefits allowed — as string */
        allowedString?: string;
        /** Benefits used — as Money */
        usedMoney?: IMoney;
        /** Benefits used — as unsigned int */
        usedUnsignedInt?: number;
      }[];
      /** Authorization required flag */
      authorizationRequired?: boolean;
      /** Type of required supporting materials */
      authorizationSupporting?: ICodeableConcept[];
      /** Preauthorization requirements endpoint */
      authorizationUrl?: string;
    }[];
  }[];

  /** Preauthorization reference */
  preAuthRef?: string;

  /** Printed form identifier */
  form?: ICodeableConcept;

  /** Processing errors */
  error?: {
    /** Error code detailing processing issues (required) */
    code: ICodeableConcept;
  }[];
}
