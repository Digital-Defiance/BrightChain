/**
 * Fee Schedule System Interfaces
 *
 * Defines fee schedule entries, fee schedules, and the fee schedule
 * service interface for mapping procedure/service codes to charges.
 *
 * @see Requirements 8.1, 8.2, 8.3
 * @module billing/feeSchedule
 */

import type { IMoney } from '../moneyType';

/**
 * A modifier entry within a fee schedule entry, representing a
 * charge adjustment when a specific modifier code is applied.
 */
export interface IFeeScheduleModifier {
  /** Modifier code (e.g. "-25", "-59") */
  code: string;
  /** Charge adjustment when this modifier is applied */
  chargeAdjustment: IMoney;
}

/**
 * A single entry in a fee schedule mapping a procedure/service code
 * to its default charge amount.
 *
 * @see Requirement 8.1
 */
export interface IFeeScheduleEntry {
  /** Procedure/service code (CPT, CDT, HCPCS) */
  code: string;
  /** Code system URI (e.g. "http://www.ama-assn.org/go/cpt") */
  codeSystem: string;
  /** Human-readable description of the procedure/service */
  description: string;
  /** Default charge amount for this code */
  defaultCharge: IMoney;
  /** Date this entry becomes effective */
  effectiveDate: Date;
  /** Date this entry expires (if applicable) */
  expirationDate?: Date;
  /** Optional modifier codes with charge adjustments */
  modifiers?: IFeeScheduleModifier[];
}

/**
 * A fee schedule containing a collection of fee schedule entries
 * for a given specialty.
 *
 * @see Requirement 8.2
 */
export interface IFeeSchedule {
  /** Unique identifier for this fee schedule */
  scheduleId: string;
  /** Human-readable name for this fee schedule */
  name: string;
  /** Specialty code this schedule applies to */
  specialtyCode: string;
  /** Date this schedule becomes effective */
  effectiveDate: Date;
  /** Fee schedule entries */
  entries: IFeeScheduleEntry[];
}

/**
 * Service interface for fee schedule lookups and management.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 8.3
 */
export interface IFeeScheduleService<_TID = string> {
  /**
   * Get the charge for a procedure code, optionally adjusted by modifiers.
   * @param code - Procedure/service code
   * @param modifiers - Optional modifier codes
   * @returns The calculated charge amount
   */
  getCharge(code: string, modifiers?: string[]): IMoney;

  /**
   * Retrieve a fee schedule by its identifier.
   * @param scheduleId - Fee schedule identifier
   * @returns The fee schedule
   */
  getFeeSchedule(scheduleId: string): IFeeSchedule;

  /**
   * Retrieve the currently active fee schedule for a specialty.
   * @param specialtyCode - Specialty code
   * @returns The active fee schedule for the specialty
   */
  getActiveFeeSchedule(specialtyCode: string): IFeeSchedule;
}
