/**
 * FHIR R4 Coverage Resource with BrightChain Metadata
 *
 * Defines the `ICoverageResource<TID>` interface representing a FHIR R4
 * Coverage resource augmented with BrightChain storage metadata.
 * Stores patient insurance card-level information including plan,
 * subscriber, beneficiary, period, class, and cost-to-beneficiary.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/coverage.html
 * @module billing/coverageResource
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
  CoverageClass,
  CoverageCostToBeneficiary,
} from './coverageBackboneElements';
import type { CoverageStatus } from './enumerations';

/**
 * FHIR R4 Coverage Resource with BrightChain extensions.
 *
 * Represents a patient's insurance plan information including
 * subscriber, beneficiary, payor, class (group/plan), period,
 * and cost-to-beneficiary details.
 *
 * @see https://build.fhir.org/coverage.html
 */
export interface ICoverageResource<TID = string> {
  /** Fixed value: 'Coverage' */
  resourceType: 'Coverage';

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

  // --- FHIR R4 Coverage fields ---

  /** Business identifiers for this coverage */
  identifier?: IIdentifier<TID>[];

  /** active | cancelled | draft | entered-in-error (required) */
  status: CoverageStatus;

  /** Coverage category such as medical, dental, vision */
  type?: ICodeableConcept;

  /** Owner of the policy */
  policyHolder?: IReference<TID>;

  /** Subscriber to the policy */
  subscriber?: IReference<TID>;

  /** ID assigned to the subscriber */
  subscriberId?: string;

  /** Plan beneficiary — reference to Patient (required) */
  beneficiary: IReference<TID>;

  /** Dependent number */
  dependent?: string;

  /** Beneficiary relationship to the subscriber */
  relationship?: ICodeableConcept;

  /** Coverage start and end dates */
  period?: IPeriod;

  /** Issuer of the policy (required) */
  payor: IReference<TID>[];

  /** Additional coverage classifications (group, plan, subplan, class, subclass) */
  class?: CoverageClass<TID>[];

  /** Relative order of the coverage */
  order?: number;

  /** Insurer network */
  network?: string;

  /** Patient payments for services/products */
  costToBeneficiary?: CoverageCostToBeneficiary<TID>[];

  /** Reimbursement to insurer */
  subrogation?: boolean;

  /** Contract details */
  contract?: IReference<TID>[];
}
