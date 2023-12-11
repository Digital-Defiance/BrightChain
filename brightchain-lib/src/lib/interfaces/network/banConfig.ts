/**
 * @fileoverview Configuration for the ban mechanism.
 *
 * Cooling periods and supermajority thresholds for BAN_MEMBER
 * and UNBAN_MEMBER proposals.
 *
 * @see Network Trust and Ban Mechanism spec, Requirements 2.1-2.5, 1.4
 */

/** Milliseconds in one hour */
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Configuration for ban/unban proposal cooling periods and vote thresholds.
 */
export interface IBanConfig {
  /**
   * Mandatory waiting period (ms) before a BAN_MEMBER proposal can be executed,
   * even if the vote threshold is reached early.
   * Default: 72 hours. Minimum: 1 hour.
   */
  banCoolingPeriodMs: number;

  /**
   * Mandatory waiting period (ms) before an UNBAN_MEMBER proposal can be executed.
   * Default: 48 hours. Minimum: 1 hour.
   */
  unbanCoolingPeriodMs: number;

  /**
   * Supermajority fraction required for BAN_MEMBER and UNBAN_MEMBER votes.
   * Default: 0.75 (75%). Minimum: 0.67 (67%).
   */
  banSupermajorityThreshold: number;
}

/**
 * Default ban configuration values.
 */
export const DEFAULT_BAN_CONFIG: IBanConfig = {
  banCoolingPeriodMs: 72 * ONE_HOUR_MS, // 72 hours
  unbanCoolingPeriodMs: 48 * ONE_HOUR_MS, // 48 hours
  banSupermajorityThreshold: 0.75,
};

/**
 * Minimum allowed values for ban configuration.
 */
export const MIN_BAN_CONFIG = {
  banCoolingPeriodMs: ONE_HOUR_MS,
  unbanCoolingPeriodMs: ONE_HOUR_MS,
  banSupermajorityThreshold: 0.67,
} as const;

/**
 * Validate and normalize ban configuration, clamping to minimums.
 */
export function normalizeBanConfig(partial?: Partial<IBanConfig>): IBanConfig {
  const config = { ...DEFAULT_BAN_CONFIG, ...partial };
  return {
    banCoolingPeriodMs: Math.max(
      config.banCoolingPeriodMs,
      MIN_BAN_CONFIG.banCoolingPeriodMs,
    ),
    unbanCoolingPeriodMs: Math.max(
      config.unbanCoolingPeriodMs,
      MIN_BAN_CONFIG.unbanCoolingPeriodMs,
    ),
    banSupermajorityThreshold: Math.max(
      config.banSupermajorityThreshold,
      MIN_BAN_CONFIG.banSupermajorityThreshold,
    ),
  };
}
