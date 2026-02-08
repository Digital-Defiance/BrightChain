/**
 * DurabilityLevel determines how many parity blocks are generated for a data block
 * using Reed-Solomon Forward Error Correction (FEC).
 *
 * Higher durability levels provide better data recovery capabilities at the cost
 * of additional storage space for parity blocks.
 */
export enum DurabilityLevel {
  /**
   * No parity blocks are generated.
   * Data cannot be recovered if the block is lost or corrupted.
   * Use for temporary or easily reproducible data.
   */
  Ephemeral = 'ephemeral',

  /**
   * One parity block is generated using Reed-Solomon encoding.
   * Provides basic error correction capability.
   * Suitable for most general-purpose storage needs.
   */
  Standard = 'standard',

  /**
   * Two or more parity blocks are generated using Reed-Solomon encoding.
   * Provides enhanced error correction and recovery capability.
   * Use for critical data that must survive multiple failures.
   */
  HighDurability = 'high_durability',
}

/**
 * Default durability level for new blocks
 */
export const DefaultDurabilityLevel = DurabilityLevel.Standard;

/**
 * Get the number of parity blocks for a given durability level
 * @param level - The durability level
 * @returns The number of parity blocks to generate
 */
export function getParityCountForDurability(level: DurabilityLevel): number {
  switch (level) {
    case DurabilityLevel.Ephemeral:
      return 0;
    case DurabilityLevel.Standard:
      return 1;
    case DurabilityLevel.HighDurability:
      return 2;
    default:
      return 1;
  }
}

/**
 * Durability level mapping
 */
export const DurabilityMap: Record<string, DurabilityLevel> = Object.freeze({
  ephemeral: DurabilityLevel.Ephemeral,
  standard: DurabilityLevel.Standard,
  enhanced: DurabilityLevel.HighDurability,
  maximum: DurabilityLevel.HighDurability,
});

export default DurabilityLevel;
