import { Checksum } from '../types/checksum';

/**
 * Energy account for tracking member's Joule balance
 * Follows existing Member/Document patterns
 */
export interface IEnergyAccount {
  /** Member ID (checksum) */
  readonly memberId: Checksum;

  /** Current energy credits in Joules */
  balance: number;

  /** Total Joules earned (providing resources) */
  earned: number;

  /** Total Joules spent (consuming resources) */
  spent: number;

  /** Joules reserved for ongoing operations */
  reserved: number;

  /** Reputation score (0.0 to 1.0) */
  reputation: number;

  /** Account creation date */
  readonly createdAt: Date;

  /** Last balance update */
  lastUpdated: Date;
}

/**
 * DTO for energy account serialization
 */
export interface IEnergyAccountDto {
  memberId: string;
  balance: number;
  earned: number;
  spent: number;
  reserved: number;
  reputation: number;
  createdAt: string;
  lastUpdated: string;
}
