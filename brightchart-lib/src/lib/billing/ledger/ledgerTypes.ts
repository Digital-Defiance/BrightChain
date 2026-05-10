/**
 * Patient Ledger Interfaces
 *
 * Defines ledger entries, patient ledger, patient statement, and
 * the ledger service interface for financial tracking.
 *
 * @see Requirements 12.1, 12.2, 12.3
 * @module billing/ledger
 */

import type { IPeriod } from '../../fhir/datatypes';
import type { LedgerEntryType } from '../enumerations';
import type { IMoney } from '../moneyType';

/**
 * A single entry in a patient's financial ledger.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 12.1
 */
export interface ILedgerEntry<TID = string> {
  /** Unique identifier for this ledger entry */
  entryId: string;
  /** Patient this entry belongs to */
  patientId: string;
  /** Date of the ledger entry */
  date: Date;
  /** Type of ledger entry */
  type: LedgerEntryType;
  /** Human-readable description */
  description: string;
  /** Monetary amount of this entry */
  amount: IMoney;
  /** Related claim identifier (if applicable) */
  relatedClaimId?: string;
  /** Related encounter identifier (if applicable) */
  relatedEncounterId?: string;
  /** Member who posted this entry */
  postedBy: TID;
  /** Running balance after this entry */
  balance: IMoney;
}

/**
 * A patient's complete financial ledger with all entries
 * and current balance.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 12.2
 */
export interface IPatientLedger<TID = string> {
  /** Patient this ledger belongs to */
  patientId: string;
  /** All ledger entries in chronological order */
  entries: ILedgerEntry<TID>[];
  /** Current outstanding balance */
  currentBalance: IMoney;
}

/**
 * A patient statement summarizing financial activity over a
 * date range, including opening/closing balances and totals.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 12.3
 */
export interface IPatientStatement<TID = string> {
  /** Patient this statement is for */
  patientId: string;
  /** Date the statement was generated */
  statementDate: Date;
  /** Date range covered by this statement */
  dateRange: IPeriod;
  /** Ledger entries within the date range */
  entries: ILedgerEntry<TID>[];
  /** Balance at the start of the date range */
  openingBalance: IMoney;
  /** Balance at the end of the date range */
  closingBalance: IMoney;
  /** Total charges within the date range */
  totalCharges: IMoney;
  /** Total payments within the date range */
  totalPayments: IMoney;
}

/**
 * Service interface for patient ledger management.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 12.3
 */
export interface ILedgerService<TID = string> {
  /**
   * Retrieve the complete patient ledger.
   * @param patientId - Patient identifier
   * @returns The patient's ledger
   */
  getPatientLedger(patientId: string): Promise<IPatientLedger<TID>>;

  /**
   * Post a charge to the patient ledger.
   * @param patientId - Patient identifier
   * @param entry - Charge entry details
   * @param memberId - Member posting the charge
   * @returns The created ledger entry
   */
  postCharge(
    patientId: string,
    entry: Omit<ILedgerEntry<TID>, 'entryId' | 'balance' | 'type'>,
    memberId: TID,
  ): Promise<ILedgerEntry<TID>>;

  /**
   * Post a payment to the patient ledger.
   * @param patientId - Patient identifier
   * @param entry - Payment entry details
   * @param memberId - Member posting the payment
   * @returns The created ledger entry
   */
  postPayment(
    patientId: string,
    entry: Omit<ILedgerEntry<TID>, 'entryId' | 'balance' | 'type'>,
    memberId: TID,
  ): Promise<ILedgerEntry<TID>>;

  /**
   * Post an adjustment to the patient ledger.
   * @param patientId - Patient identifier
   * @param entry - Adjustment entry details
   * @param memberId - Member posting the adjustment
   * @returns The created ledger entry
   */
  postAdjustment(
    patientId: string,
    entry: Omit<ILedgerEntry<TID>, 'entryId' | 'balance' | 'type'>,
    memberId: TID,
  ): Promise<ILedgerEntry<TID>>;

  /**
   * Generate a patient statement for a date range.
   * @param patientId - Patient identifier
   * @param dateRange - Date range for the statement
   * @returns The patient statement
   */
  getStatement(
    patientId: string,
    dateRange: IPeriod,
  ): Promise<IPatientStatement<TID>>;
}
