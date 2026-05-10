/**
 * FHIR R4 Claim Resource with BrightChain Metadata
 *
 * Defines the `IClaimResource<TID>` interface representing a FHIR R4
 * Claim resource augmented with BrightChain storage metadata.
 * Represents a request for payment or preauthorization submitted
 * to an insurer, containing line items with procedure/service codes,
 * diagnoses, and charges.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/claim.html
 * @module billing/claimResource
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
  ClaimItem,
  ClaimPayee,
  ClaimProcedure,
  ClaimRelated,
  ClaimSupportingInfo,
} from './claimBackboneElements';
import type { ClaimStatus, ClaimUse } from './enumerations';
import type { IMoney } from './moneyType';

/**
 * FHIR R4 Claim Resource with BrightChain extensions.
 *
 * Represents a request for payment or preauthorization containing
 * patient, provider, insurer, diagnoses, procedures, and line items.
 *
 * @see https://build.fhir.org/claim.html
 */
export interface IClaimResource<TID = string> {
  /** Fixed value: 'Claim' */
  resourceType: 'Claim';

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

  // --- FHIR R4 Claim fields ---

  /** Business identifiers for this claim */
  identifier?: IIdentifier<TID>[];

  /** active | cancelled | draft | entered-in-error (required) */
  status: ClaimStatus;

  /** Category or discipline — oral, pharmacy, vision, professional, institutional (required) */
  type: ICodeableConcept;

  /** More granular claim type */
  subType?: ICodeableConcept;

  /** claim | preauthorization | predetermination (required) */
  use: ClaimUse;

  /** The recipient of the products and services (required) */
  patient: IReference<TID>;

  /** Relevant time frame for the claim */
  billablePeriod?: IPeriod;

  /** Resource creation date (required) */
  created: string;

  /** Author of the claim */
  enterer?: IReference<TID>;

  /** Target insurer */
  insurer?: IReference<TID>;

  /** Party responsible for the claim (required) */
  provider: IReference<TID>;

  /** Desired processing urgency (required) */
  priority: ICodeableConcept;

  /** For whom to reserve funds */
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

  /** Members of the care team */
  careTeam?: ClaimCareTeam<TID>[];

  /** Supporting information */
  supportingInfo?: ClaimSupportingInfo<TID>[];

  /** Pertinent diagnosis information */
  diagnosis?: ClaimDiagnosis<TID>[];

  /** Clinical procedures performed */
  procedure?: ClaimProcedure<TID>[];

  /** Patient insurance information (required) */
  insurance: ClaimInsurance<TID>[];

  /** Details of the event causing the claim */
  accident?: ClaimAccident<TID>;

  /** Product or service provided */
  item?: ClaimItem<TID>[];

  /** Total claim cost */
  total?: IMoney;
}
