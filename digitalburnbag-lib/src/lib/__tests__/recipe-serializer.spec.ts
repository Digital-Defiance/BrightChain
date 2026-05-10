import fc from 'fast-check';
import { DeserializationError } from '../errors';
import type { IRecipe } from '../interfaces';
import { RecipeSerializer } from '../serialization/recipe-serializer';

const arbRecipe = (): fc.Arbitrary<IRecipe> =>
  fc
    .record({
      blockIdCount: fc.integer({ min: 1, max: 20 }),
      totalBlockCount: fc.integer({ min: 1, max: 1000 }),
      hasEC: fc.boolean(),
    })
    .chain(({ blockIdCount, totalBlockCount, hasEC }) =>
      fc
        .record({
          blockIds: fc.array(fc.uint8Array({ minLength: 32, maxLength: 32 }), {
            minLength: blockIdCount,
            maxLength: blockIdCount,
          }),
          totalBlockCount: fc.constant(totalBlockCount),
          erasureCoding: hasEC
            ? fc.record({
                dataShards: fc.integer({ min: 1, max: 100 }),
                parityShards: fc.integer({ min: 1, max: 100 }),
                shardSize: fc.integer({ min: 1, max: 65536 }),
              })
            : fc.constant(undefined),
        })
        .map((r) => ({
          blockIds: r.blockIds,
          totalBlockCount: r.totalBlockCount,
          erasureCoding: r.erasureCoding,
        })),
    );

describe('RecipeSerializer', () => {
  // Feature: digital-burn-bag, Property 12: Recipe serialization round-trip
  // Validates: Requirements 9.1, 9.2, 9.3, 9.5
  it('Property 12: serialize then deserialize produces equivalent recipe', () => {
    fc.assert(
      fc.property(arbRecipe(), (recipe) => {
        const serialized = RecipeSerializer.serialize(recipe);
        const parsed = RecipeSerializer.deserialize(serialized);
        expect(parsed.totalBlockCount).toBe(recipe.totalBlockCount);
        expect(parsed.blockIds.length).toBe(recipe.blockIds.length);
        for (let i = 0; i < recipe.blockIds.length; i++) {
          expect(
            Buffer.from(parsed.blockIds[i]).equals(
              Buffer.from(recipe.blockIds[i]),
            ),
          ).toBe(true);
        }
        if (recipe.erasureCoding) {
          expect(parsed.erasureCoding).toEqual(recipe.erasureCoding);
        } else {
          expect(parsed.erasureCoding).toBeUndefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it('Property 12: corrupted byte causes CRC mismatch', () => {
    const recipe: IRecipe = {
      blockIds: [new Uint8Array(32).fill(0xab)],
      totalBlockCount: 1,
    };
    const serialized = RecipeSerializer.serialize(recipe);
    // Corrupt a data byte (not the CRC itself)
    serialized[5] ^= 0xff;
    expect(() => RecipeSerializer.deserialize(serialized)).toThrow(
      DeserializationError,
    );
  });

  it('rejects truncated data', () => {
    expect(() => RecipeSerializer.deserialize(new Uint8Array(5))).toThrow(
      DeserializationError,
    );
  });
});
