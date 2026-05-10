/**
 * Billing Portability Interfaces
 *
 * Extends the Encounter Export Bundle with billing-specific resource
 * arrays for full-fidelity billing data migration.
 *
 * @see Requirements 19.1, 19.2
 * @module billing/portability/billingPortability
 */

import type { IEncounterExportBundle } from '../../encounter/portability/encounterPortability';
import type { IClaimResource } from '../claimResource';
import type { ICoverageResource } from '../coverageResource';
import type {
  ICoverageEligibilityRequestResource,
  ICoverageEligibilityResponseResource,
} from '../eligibilityResources';
import type { IExplanationOfBenefitResource } from '../eobResource';
import type { IFeeSchedule } from '../feeSchedule/feeScheduleTypes';
import type { ILedgerEntry } from '../ledger/ledgerTypes';
import type { ISuperbill } from '../superbill/superbillTypes';

/**
 * Billing export bundle extending the encounter export bundle
 * with all billing resource types for full-fidelity data migration.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirements 19.1, 19.2
 */
export interface IBillingExportBundle<TID = string>
  extends IEncounterExportBundle<TID> {
  /** Coverage (insurance) resources */
  coverages: ICoverageResource<TID>[];
  /** Claim resources */
  claims: IClaimResource<TID>[];
  /** Explanation of Benefit resources */
  explanationOfBenefits: IExplanationOfBenefitResource<TID>[];
  /** Coverage eligibility request resources */
  eligibilityRequests: ICoverageEligibilityRequestResource<TID>[];
  /** Coverage eligibility response resources */
  eligibilityResponses: ICoverageEligibilityResponseResource<TID>[];
  /** Superbill records */
  superbills: ISuperbill<TID>[];
  /** Fee schedule configurations */
  feeSchedules: IFeeSchedule[];
  /** Patient ledger entries */
  ledgerEntries: ILedgerEntry<TID>[];
}
