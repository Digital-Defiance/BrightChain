/**
 * Billing Store Interface
 *
 * Defines the billing data store with CRUD operations, version history,
 * and pool management for all billing resource types.
 *
 * @see Requirements 13.1, 13.2, 13.3, 13.4
 * @module billing/store
 */

import type { IClaimResource } from '../claimResource';
import type { ICoverageResource } from '../coverageResource';
import type {
  ICoverageEligibilityRequestResource,
  ICoverageEligibilityResponseResource,
} from '../eligibilityResources';
import type { IExplanationOfBenefitResource } from '../eobResource';
import type { ILedgerEntry } from '../ledger/ledgerTypes';
import type { ISuperbill } from '../superbill/superbillTypes';

/**
 * Billing data store interface with CRUD operations for all billing
 * resource types. Uses a dedicated BrightChain pool for encrypted
 * billing data storage.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 13.1
 */
export interface IBillingStore<TID = string> {
  // --- Coverage ---

  /** Store a new Coverage resource */
  storeCoverage(
    resource: ICoverageResource<TID>,
    memberId: TID,
  ): Promise<ICoverageResource<TID>>;
  /** Retrieve a Coverage resource by ID */
  retrieveCoverage(id: string, memberId: TID): Promise<ICoverageResource<TID>>;
  /** Update an existing Coverage resource */
  updateCoverage(
    resource: ICoverageResource<TID>,
    memberId: TID,
  ): Promise<ICoverageResource<TID>>;
  /** Delete a Coverage resource by ID */
  deleteCoverage(id: string, memberId: TID): Promise<void>;
  /** Get version history for a Coverage resource */
  getCoverageVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<ICoverageResource<TID>[]>;

  // --- Claim ---

  /** Store a new Claim resource */
  storeClaim(
    resource: IClaimResource<TID>,
    memberId: TID,
  ): Promise<IClaimResource<TID>>;
  /** Retrieve a Claim resource by ID */
  retrieveClaim(id: string, memberId: TID): Promise<IClaimResource<TID>>;
  /** Update an existing Claim resource */
  updateClaim(
    resource: IClaimResource<TID>,
    memberId: TID,
  ): Promise<IClaimResource<TID>>;
  /** Delete a Claim resource by ID */
  deleteClaim(id: string, memberId: TID): Promise<void>;
  /** Get version history for a Claim resource */
  getClaimVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<IClaimResource<TID>[]>;

  // --- ExplanationOfBenefit ---

  /** Store a new EOB resource */
  storeEOB(
    resource: IExplanationOfBenefitResource<TID>,
    memberId: TID,
  ): Promise<IExplanationOfBenefitResource<TID>>;
  /** Retrieve an EOB resource by ID */
  retrieveEOB(
    id: string,
    memberId: TID,
  ): Promise<IExplanationOfBenefitResource<TID>>;
  /** Update an existing EOB resource */
  updateEOB(
    resource: IExplanationOfBenefitResource<TID>,
    memberId: TID,
  ): Promise<IExplanationOfBenefitResource<TID>>;
  /** Delete an EOB resource by ID */
  deleteEOB(id: string, memberId: TID): Promise<void>;
  /** Get version history for an EOB resource */
  getEOBVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<IExplanationOfBenefitResource<TID>[]>;

  // --- CoverageEligibilityRequest ---

  /** Store a new CoverageEligibilityRequest resource */
  storeEligibilityRequest(
    resource: ICoverageEligibilityRequestResource<TID>,
    memberId: TID,
  ): Promise<ICoverageEligibilityRequestResource<TID>>;
  /** Retrieve a CoverageEligibilityRequest resource by ID */
  retrieveEligibilityRequest(
    id: string,
    memberId: TID,
  ): Promise<ICoverageEligibilityRequestResource<TID>>;
  /** Update an existing CoverageEligibilityRequest resource */
  updateEligibilityRequest(
    resource: ICoverageEligibilityRequestResource<TID>,
    memberId: TID,
  ): Promise<ICoverageEligibilityRequestResource<TID>>;
  /** Delete a CoverageEligibilityRequest resource by ID */
  deleteEligibilityRequest(id: string, memberId: TID): Promise<void>;
  /** Get version history for a CoverageEligibilityRequest resource */
  getEligibilityRequestVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<ICoverageEligibilityRequestResource<TID>[]>;

  // --- CoverageEligibilityResponse ---

  /** Store a new CoverageEligibilityResponse resource */
  storeEligibilityResponse(
    resource: ICoverageEligibilityResponseResource<TID>,
    memberId: TID,
  ): Promise<ICoverageEligibilityResponseResource<TID>>;
  /** Retrieve a CoverageEligibilityResponse resource by ID */
  retrieveEligibilityResponse(
    id: string,
    memberId: TID,
  ): Promise<ICoverageEligibilityResponseResource<TID>>;
  /** Update an existing CoverageEligibilityResponse resource */
  updateEligibilityResponse(
    resource: ICoverageEligibilityResponseResource<TID>,
    memberId: TID,
  ): Promise<ICoverageEligibilityResponseResource<TID>>;
  /** Delete a CoverageEligibilityResponse resource by ID */
  deleteEligibilityResponse(id: string, memberId: TID): Promise<void>;
  /** Get version history for a CoverageEligibilityResponse resource */
  getEligibilityResponseVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<ICoverageEligibilityResponseResource<TID>[]>;

  // --- Superbill ---

  /** Store a new Superbill */
  storeSuperbill(
    resource: ISuperbill<TID>,
    memberId: TID,
  ): Promise<ISuperbill<TID>>;
  /** Retrieve a Superbill by ID */
  retrieveSuperbill(id: string, memberId: TID): Promise<ISuperbill<TID>>;
  /** Update an existing Superbill */
  updateSuperbill(
    resource: ISuperbill<TID>,
    memberId: TID,
  ): Promise<ISuperbill<TID>>;
  /** Delete a Superbill by ID */
  deleteSuperbill(id: string, memberId: TID): Promise<void>;
  /** Get version history for a Superbill */
  getSuperbillVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<ISuperbill<TID>[]>;

  // --- LedgerEntry ---

  /** Store a new LedgerEntry */
  storeLedgerEntry(
    resource: ILedgerEntry<TID>,
    memberId: TID,
  ): Promise<ILedgerEntry<TID>>;
  /** Retrieve a LedgerEntry by ID */
  retrieveLedgerEntry(id: string, memberId: TID): Promise<ILedgerEntry<TID>>;
  /** Update an existing LedgerEntry */
  updateLedgerEntry(
    resource: ILedgerEntry<TID>,
    memberId: TID,
  ): Promise<ILedgerEntry<TID>>;
  /** Delete a LedgerEntry by ID */
  deleteLedgerEntry(id: string, memberId: TID): Promise<void>;
  /** Get version history for a LedgerEntry */
  getLedgerEntryVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<ILedgerEntry<TID>[]>;

  // --- Pool ---

  /**
   * Get the BrightChain pool identifier for billing data.
   * @returns The pool identifier
   */
  getPoolId(): TID;
}
