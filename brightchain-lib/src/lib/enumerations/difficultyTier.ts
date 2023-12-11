/**
 * Difficulty tiers for PoUW work units.
 * Each tier defines the number of hash operations required.
 */
export enum DifficultyTier {
  /** Single leaf hash — ~1-2 seconds of computation */
  Low = 'low',
  /** Subtree of 4-16 nodes — ~3-5 seconds of computation */
  Medium = 'medium',
  /** Subtree of 16-64 nodes — ~5-10 seconds of computation */
  High = 'high',
}

/**
 * Maps difficulty tiers to the number of hash operations (nodes to compute).
 */
export const DifficultyTierNodeCount: Record<
  DifficultyTier,
  { min: number; max: number }
> = {
  [DifficultyTier.Low]: { min: 1, max: 1 },
  [DifficultyTier.Medium]: { min: 4, max: 16 },
  [DifficultyTier.High]: { min: 16, max: 64 },
};
