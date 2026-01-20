/**
 * Energy economy constants for BrightChain
 * All energy measured in Joules (J)
 */

export interface IEnergyConsts {
  // Trial credits for new users
  TRIAL_CREDITS: number;

  // Computation costs (J per operation)
  HASH_SHA3_512_PER_KB: number;
  ENCRYPT_AES_256_PER_KB: number;
  SIGN_ECDSA_PER_OP: number;
  VERIFY_ECDSA_PER_OP: number;
  XOR_OPERATION_PER_KB: number;

  // Storage costs (J per GB per day)
  STORAGE_PER_GB_PER_DAY: number;
  STORAGE_HOT_MULTIPLIER: number;
  STORAGE_COLD_MULTIPLIER: number;

  // Network costs (J per MB)
  BANDWIDTH_PER_MB: number;

  // Redundancy costs
  REDUNDANCY_BASE_MULTIPLIER: number;
  REDUNDANCY_PER_COPY: number;

  // Proof of Work
  POW_MIN_DIFFICULTY: number;
  POW_MAX_DIFFICULTY: number;
  POW_JOULES_PER_BIT: number;
}

export const ENERGY: IEnergyConsts = {
  // New users get 1000 Joules to start
  TRIAL_CREDITS: 1000,

  // Computation costs
  HASH_SHA3_512_PER_KB: 0.001,
  ENCRYPT_AES_256_PER_KB: 0.002,
  SIGN_ECDSA_PER_OP: 0.005,
  VERIFY_ECDSA_PER_OP: 0.003,
  XOR_OPERATION_PER_KB: 0.0001,

  // Storage costs
  STORAGE_PER_GB_PER_DAY: 0.5,
  STORAGE_HOT_MULTIPLIER: 2.0,
  STORAGE_COLD_MULTIPLIER: 0.5,

  // Network costs
  BANDWIDTH_PER_MB: 0.01,

  // Redundancy
  REDUNDANCY_BASE_MULTIPLIER: 1.0,
  REDUNDANCY_PER_COPY: 0.8,

  // Proof of Work
  POW_MIN_DIFFICULTY: 8,
  POW_MAX_DIFFICULTY: 24,
  POW_JOULES_PER_BIT: 0.1,
} as const;
