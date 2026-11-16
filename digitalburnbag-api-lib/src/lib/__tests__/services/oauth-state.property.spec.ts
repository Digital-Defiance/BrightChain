/**
 * Property-based tests for OAuth state parameter validation.
 *
 * Feature: canary-provider-system
 */
import * as fc from 'fast-check';
import { OAuthStateManager } from '../helpers/oauth-state-manager';

// ---------------------------------------------------------------------------
// Property 24: OAuth state parameter validation
// Tag: Feature: canary-provider-system, Property 24
// Validates: Requirements 10.5
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 24: OAuth state parameter validation', () => {
  it('accepts matching state and rejects non-matching state', () => {
    /**
     * **Validates: Requirements 10.5**
     *
     * For any generated state parameter, the callback handler accepts
     * matching state and rejects non-matching state.
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (randomSuffix) => {
          const manager = new OAuthStateManager();
          const state = manager.generateState();

          // A non-matching state should be rejected
          const fakeState = `fake_${randomSuffix}_${Date.now()}`;
          // Only test if fakeState is actually different from state
          if (fakeState !== state) {
            const rejectResult = manager.validateState(fakeState);
            if (rejectResult) return false; // Should have been rejected
          }

          // The matching state should be accepted
          const acceptResult = manager.validateState(state);
          if (!acceptResult) return false; // Should have been accepted

          // After consumption, the same state should be rejected (one-time use)
          const replayResult = manager.validateState(state);
          if (replayResult) return false; // Should have been rejected (replay)

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('generated states are unique', () => {
    /**
     * **Validates: Requirements 10.5**
     *
     * For any number of state generations, all states are unique.
     */
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 50 }), (count) => {
        const manager = new OAuthStateManager();
        const states = new Set<string>();

        for (let i = 0; i < count; i++) {
          const state = manager.generateState();
          if (states.has(state)) return false; // Duplicate detected
          states.add(state);
        }

        return states.size === count;
      }),
      { numRuns: 100 },
    );
  });
});
