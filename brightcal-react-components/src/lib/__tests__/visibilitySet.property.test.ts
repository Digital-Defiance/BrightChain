import * as fc from 'fast-check';
import {
  loadVisibilitySet,
  saveVisibilitySet,
  toggleVisibility,
} from '../utils/visibilitySet';

/**
 * Feature: multi-calendar-management
 * Property 2: Visibility Set toggle correctness
 * Validates: Requirements 1.3
 *
 * For any Visibility Set and any calendar ID, toggling that ID SHALL produce
 * a new set where: if the ID was present, it is now absent; if the ID was
 * absent, it is now present. All other IDs in the set SHALL remain unchanged.
 */
describe('Property 2: Visibility Set toggle correctness', () => {
  it('toggling an ID flips its membership; all other IDs unchanged', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 0, maxLength: 20 }),
        fc.uuid(),
        (ids, targetId) => {
          const original = new Set(ids);
          const wasMember = original.has(targetId);
          const toggled = toggleVisibility(original, targetId);

          // The target ID membership is flipped
          if (wasMember) {
            expect(toggled.has(targetId)).toBe(false);
          } else {
            expect(toggled.has(targetId)).toBe(true);
          }

          // All other IDs remain unchanged
          for (const id of original) {
            if (id !== targetId) {
              expect(toggled.has(id)).toBe(true);
            }
          }

          // No extra IDs were introduced (besides possibly the target)
          for (const id of toggled) {
            if (id !== targetId) {
              expect(original.has(id)).toBe(true);
            }
          }

          // Size check: should differ by exactly 1
          if (wasMember) {
            expect(toggled.size).toBe(original.size - 1);
          } else {
            expect(toggled.size).toBe(original.size + 1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: multi-calendar-management
 * Property 3: Visibility Set serialization round-trip
 * Validates: Requirements 1.5
 *
 * For any set of calendar ID strings, serializing the Visibility Set to the
 * localStorage JSON format and then deserializing it back SHALL produce a set
 * with identical membership to the original.
 */
describe('Property 3: Visibility Set serialization round-trip', () => {
  // Mock localStorage for these tests
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation((key: string) => store[key] ?? null);
    jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation((key: string, value: string) => {
        store[key] = value;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serialize then deserialize produces identical set membership', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 0, maxLength: 30 }),
        (ids) => {
          const original = new Set(ids);

          saveVisibilitySet(original);
          const restored = loadVisibilitySet();

          expect(restored).not.toBeNull();
          expect(restored!.size).toBe(original.size);

          // Every ID in the original is in the restored set
          for (const id of original) {
            expect(restored!.has(id)).toBe(true);
          }

          // Every ID in the restored set is in the original
          for (const id of restored!) {
            expect(original.has(id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
