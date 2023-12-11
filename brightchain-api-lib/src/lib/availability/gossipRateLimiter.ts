/**
 * @fileoverview Gossip Rate Limiter
 *
 * Per-peer sliding window rate limiter for gossip announcements.
 * Prevents a single peer from flooding the network with announcements.
 *
 * @see .kiro/specs/member-pool-security/follow-up-hardening.md — Item 3
 */

/**
 * Configuration for the gossip rate limiter.
 */
export interface IGossipRateLimiterConfig {
  /** Maximum announcements per peer within the window (default: 100) */
  maxPerWindow: number;
  /** Window duration in milliseconds (default: 10000 = 10 seconds) */
  windowMs: number;
  /** Temporary block duration for persistent offenders in ms (default: 300000 = 5 minutes) */
  blockDurationMs: number;
  /** Number of window violations before temporary block (default: 3) */
  blockAfterViolations: number;
}

const DEFAULT_CONFIG: IGossipRateLimiterConfig = {
  maxPerWindow: 100,
  windowMs: 10_000,
  blockDurationMs: 300_000,
  blockAfterViolations: 3,
};

interface PeerState {
  /** Timestamps of announcements within the current window */
  timestamps: number[];
  /** Number of times this peer has exceeded the rate limit */
  violations: number;
  /** If blocked, when the block expires */
  blockedUntil: number | null;
}

/**
 * Per-peer sliding window rate limiter for gossip announcements.
 */
export class GossipRateLimiter {
  private readonly peers = new Map<string, PeerState>();
  private readonly config: IGossipRateLimiterConfig;

  constructor(config?: Partial<IGossipRateLimiterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if an announcement from a peer should be allowed.
   * Returns true if allowed, false if rate-limited or blocked.
   */
  shouldAllow(peerId: string): boolean {
    const now = Date.now();
    let state = this.peers.get(peerId);

    if (!state) {
      state = { timestamps: [], violations: 0, blockedUntil: null };
      this.peers.set(peerId, state);
    }

    // Check if peer is temporarily blocked
    if (state.blockedUntil !== null) {
      if (now < state.blockedUntil) {
        return false; // Still blocked
      }
      // Block expired — reset
      state.blockedUntil = null;
      state.violations = 0;
      state.timestamps = [];
    }

    // Prune timestamps outside the window
    const windowStart = now - this.config.windowMs;
    state.timestamps = state.timestamps.filter((t) => t > windowStart);

    // Check rate limit
    if (state.timestamps.length >= this.config.maxPerWindow) {
      state.violations++;

      // Block persistent offenders
      if (state.violations >= this.config.blockAfterViolations) {
        state.blockedUntil = now + this.config.blockDurationMs;
      }

      return false;
    }

    // Allow and record
    state.timestamps.push(now);
    return true;
  }

  /**
   * Check if a peer is currently blocked.
   */
  isBlocked(peerId: string): boolean {
    const state = this.peers.get(peerId);
    if (!state?.blockedUntil) return false;
    return Date.now() < state.blockedUntil;
  }

  /**
   * Get the number of violations for a peer.
   */
  getViolations(peerId: string): number {
    return this.peers.get(peerId)?.violations ?? 0;
  }

  /**
   * Reset state for a peer (e.g., after they've been banned via other means).
   */
  reset(peerId: string): void {
    this.peers.delete(peerId);
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.peers.clear();
  }
}
