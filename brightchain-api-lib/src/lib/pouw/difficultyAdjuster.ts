import { DifficultyTier, IPoUWConfig } from '@brightchain/brightchain-lib';

/**
 * Per-client difficulty state tracking.
 */
interface IDifficultyState {
  currentTier: DifficultyTier;
  /** Timestamps of violations within the escalation window */
  violations: number[];
  /** Timestamp of last successful completion */
  lastCompletion?: number;
}

/**
 * Result of reputation-aware difficulty evaluation.
 */
export interface IEffectiveDifficulty {
  /** The difficulty tier to use for the work unit */
  tier: DifficultyTier;
  /** Whether the client is exempt from PoUW challenges (use traditional 429) */
  exempt: boolean;
}

/**
 * Ordered difficulty tiers from lowest to highest.
 * Used for escalation (move right) and de-escalation (move left).
 */
const TIER_ORDER: DifficultyTier[] = [
  DifficultyTier.Low,
  DifficultyTier.Medium,
  DifficultyTier.High,
];

/**
 * Number of violations within the escalation window required
 * to trigger a difficulty escalation.
 */
const ESCALATION_THRESHOLD = 2;

/**
 * Tracks per-client difficulty tiers and adjusts based on
 * violation frequency and cool-down periods.
 *
 * - Escalates difficulty when a client accumulates repeated violations
 *   within a configurable escalation window.
 * - De-escalates difficulty when a client completes work and enough
 *   time has passed since their last completion (cool-down period).
 * - Enforces bounds: difficulty never exceeds maxDifficulty and never
 *   falls below defaultDifficulty.
 * - Supports reputation-aware difficulty via `getEffectiveDifficulty()`.
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class DifficultyAdjuster {
  private readonly defaultDifficulty: DifficultyTier;
  private readonly maxDifficulty: DifficultyTier;
  private readonly escalationWindowMs: number;
  private readonly coolDownMs: number;
  private readonly reputationDifficultyThreshold: number;
  private readonly reputationExemptionThreshold: number;
  private readonly clients = new Map<string, IDifficultyState>();

  constructor(
    config: Pick<
      IPoUWConfig,
      | 'defaultDifficulty'
      | 'maxDifficulty'
      | 'escalationWindowMs'
      | 'coolDownMs'
      | 'reputationDifficultyThreshold'
      | 'reputationExemptionThreshold'
    >,
  ) {
    this.defaultDifficulty = config.defaultDifficulty;
    this.maxDifficulty = config.maxDifficulty;
    this.escalationWindowMs = config.escalationWindowMs;
    this.coolDownMs = config.coolDownMs;
    this.reputationDifficultyThreshold = config.reputationDifficultyThreshold;
    this.reputationExemptionThreshold = config.reputationExemptionThreshold;
  }

  /**
   * Get the current difficulty tier for a client.
   * Returns the default difficulty if the client has no recorded state.
   *
   * @param clientId - The client identifier
   * @returns The current difficulty tier for the client
   */
  getDifficulty(clientId: string): DifficultyTier {
    const state = this.clients.get(clientId);
    if (!state) {
      return this.defaultDifficulty;
    }
    return state.currentTier;
  }

  /**
   * Record a rate limit violation for a client.
   *
   * 1. Get or create the client's difficulty state
   * 2. Filter violations to only those within the escalation window
   * 3. Add the current timestamp as a new violation
   * 4. If the number of violations meets or exceeds the escalation threshold,
   *    escalate the difficulty tier by one level (capped at maxDifficulty)
   *
   * @param clientId - The client identifier
   * @returns The client's difficulty tier after recording the violation
   */
  recordViolation(clientId: string): DifficultyTier {
    const now = Date.now();
    const state = this.getOrCreateState(clientId);

    // Filter violations to only those within the escalation window
    state.violations = state.violations.filter(
      (ts) => now - ts < this.escalationWindowMs,
    );

    // Add current violation
    state.violations.push(now);

    // Escalate if threshold is met
    if (state.violations.length >= ESCALATION_THRESHOLD) {
      state.currentTier = this.escalateTier(state.currentTier);
    }

    return state.currentTier;
  }

  /**
   * Record a successful work completion for a client.
   *
   * If the client has a previous completion and enough time has elapsed
   * (cool-down period), de-escalate the difficulty tier by one level
   * (floored at defaultDifficulty).
   *
   * Always updates lastCompletion to now and clears the violations array.
   *
   * @param clientId - The client identifier
   */
  recordCompletion(clientId: string): void {
    const state = this.clients.get(clientId);
    if (!state) {
      return;
    }

    const now = Date.now();

    // De-escalate if cool-down period has elapsed since last completion
    if (
      state.lastCompletion !== undefined &&
      now - state.lastCompletion >= this.coolDownMs
    ) {
      state.currentTier = this.deescalateTier(state.currentTier);
    }

    state.lastCompletion = now;
    state.violations = [];
  }

  /**
   * Get the effective difficulty for a client, optionally adjusted by reputation.
   *
   * 1. Gets the base difficulty from the existing `getDifficulty(clientId)`.
   * 2. If reputationScore is provided and >= exemptionThreshold: return exempt.
   * 3. If reputationScore is provided and >= difficultyThreshold: reduce tier by one level.
   * 4. Otherwise: return the base tier unchanged.
   *
   * @param clientId - The client identifier
   * @param reputationScore - Optional reputation score (0.0 to 1.0)
   * @returns The effective difficulty tier and exemption status
   */
  getEffectiveDifficulty(
    clientId: string,
    reputationScore?: number,
  ): IEffectiveDifficulty {
    const baseTier = this.getDifficulty(clientId);

    if (reputationScore === undefined) {
      return { tier: baseTier, exempt: false };
    }

    // High-reputation clients are exempt from PoUW challenges
    if (reputationScore >= this.reputationExemptionThreshold) {
      return { tier: baseTier, exempt: true };
    }

    // Clients above the difficulty threshold get a reduced tier
    if (reputationScore >= this.reputationDifficultyThreshold) {
      const reducedTier = this.reduceTier(baseTier);
      return { tier: reducedTier, exempt: false };
    }

    return { tier: baseTier, exempt: false };
  }

  /**
   * Clear all client state. Intended for testing.
   */
  clear(): void {
    this.clients.clear();
  }

  /**
   * Get or create the difficulty state for a client.
   */
  private getOrCreateState(clientId: string): IDifficultyState {
    let state = this.clients.get(clientId);
    if (!state) {
      state = {
        currentTier: this.defaultDifficulty,
        violations: [],
      };
      this.clients.set(clientId, state);
    }
    return state;
  }

  /**
   * Move one tier up in the difficulty order, capped at maxDifficulty.
   */
  private escalateTier(current: DifficultyTier): DifficultyTier {
    const currentIndex = TIER_ORDER.indexOf(current);
    const maxIndex = TIER_ORDER.indexOf(this.maxDifficulty);
    const nextIndex = Math.min(currentIndex + 1, maxIndex);
    return TIER_ORDER[nextIndex];
  }

  /**
   * Move one tier down in the difficulty order, floored at defaultDifficulty.
   */
  private deescalateTier(current: DifficultyTier): DifficultyTier {
    const currentIndex = TIER_ORDER.indexOf(current);
    const defaultIndex = TIER_ORDER.indexOf(this.defaultDifficulty);
    const prevIndex = Math.max(currentIndex - 1, defaultIndex);
    return TIER_ORDER[prevIndex];
  }

  /**
   * Reduce a tier by one level for reputation-based adjustment, floored at Low.
   */
  private reduceTier(current: DifficultyTier): DifficultyTier {
    const currentIndex = TIER_ORDER.indexOf(current);
    const prevIndex = Math.max(currentIndex - 1, 0);
    return TIER_ORDER[prevIndex];
  }
}
