/**
 * Configuration for tuple generation
 *
 * @remarks
 * Tuples in BrightChain contain a mix of data blocks and random blocks
 * for obfuscation. This interface defines the range of random blocks
 * that can be included in a tuple.
 *
 * @example
 * ```typescript
 * const config: ITupleConfig = {
 *   minRandomBlocks: 2,
 *   maxRandomBlocks: 5
 * };
 * ```
 */
export interface ITupleConfig {
  /** Minimum number of random blocks to include in a tuple */
  minRandomBlocks: number;

  /** Maximum number of random blocks to include in a tuple */
  maxRandomBlocks: number;
}
