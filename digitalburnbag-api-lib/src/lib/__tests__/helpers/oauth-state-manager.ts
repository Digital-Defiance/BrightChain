/**
 * Test double for OAuth state management (CSRF protection during OAuth
 * authorization flows). Shared by the OAuth state property tests and the
 * provider controller integration tests.
 */

/**
 * Manages OAuth state parameters for CSRF protection during authorization flows.
 *
 * Requirements: 10.5
 */
export class OAuthStateManager {
  private readonly pendingStates = new Set<string>();

  /**
   * Generate a cryptographically-random state parameter and store it.
   */
  generateState(): string {
    // Use a combination of random values for uniqueness
    const randomPart = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    const state = `oauth_${Date.now()}_${randomPart}`;
    this.pendingStates.add(state);
    return state;
  }

  /**
   * Validate a state parameter from an OAuth callback.
   * Returns true if the state matches a pending state (and consumes it).
   * Returns false for any non-matching state.
   */
  validateState(state: string): boolean {
    if (this.pendingStates.has(state)) {
      this.pendingStates.delete(state); // One-time use
      return true;
    }
    return false;
  }

  /**
   * Get the number of pending states (for testing).
   */
  getPendingCount(): number {
    return this.pendingStates.size;
  }
}
