/**
 * Unit tests for ICBLIndexEntry with BrightDate timestamp fields.
 *
 * ICBLIndexEntry is an interface (not a class), so tests construct plain objects
 * satisfying the interface and assert on their field types and values.
 *
 * Requirements: 2.1, 8.1
 */

import { asBlockId } from '../branded/primitives/blockId';
import { brightDateNow } from '../../utils/brightDateConversions';
import { CBLVisibility, ICBLIndexEntry } from './cblIndex';

/** Minimal valid BlockId (64-char lowercase hex) */
const BLOCK_ID_1 = asBlockId('a'.repeat(64));
const BLOCK_ID_2 = asBlockId('b'.repeat(64));

/** A known BrightDateTimestamp value for deterministic tests */
const KNOWN_BRIGHT_DATE = 9296.9375;

/** Build a minimal valid ICBLIndexEntry with the given overrides */
function makeEntry(
  overrides: Partial<ICBLIndexEntry> = {},
): ICBLIndexEntry {
  return {
    _id: 'test-entry-1',
    magnetUrl: 'magnet:?xt=urn:btih:abc123',
    blockId1: BLOCK_ID_1,
    blockId2: BLOCK_ID_2,
    blockSize: 512,
    createdAt: KNOWN_BRIGHT_DATE,
    visibility: CBLVisibility.Private,
    sequenceNumber: 1,
    ...overrides,
  };
}

describe('ICBLIndexEntry — createdAt as BrightDateTimestamp', () => {
  it('constructs a valid entry with createdAt as a BrightDateTimestamp (number) and holds the correct value', () => {
    const entry = makeEntry({ createdAt: KNOWN_BRIGHT_DATE });

    expect(entry.createdAt).toBe(KNOWN_BRIGHT_DATE);
  });

  it('createdAt is a finite number (not a Date object, not a string)', () => {
    const entry = makeEntry({ createdAt: KNOWN_BRIGHT_DATE });

    expect(typeof entry.createdAt).toBe('number');
    expect(Number.isFinite(entry.createdAt)).toBe(true);
    expect(entry.createdAt).not.toBeInstanceOf(Date);
  });

  it('createdAt produced by brightDateNow() is a finite number', () => {
    const now = brightDateNow();
    const entry = makeEntry({ createdAt: now });

    expect(typeof entry.createdAt).toBe('number');
    expect(Number.isFinite(entry.createdAt)).toBe(true);
    expect(entry.createdAt).toBe(now);
  });
});

describe('ICBLIndexEntry — deletedAt as BrightDateTimestamp', () => {
  it('deletedAt when set is a BrightDateTimestamp (number)', () => {
    const deletedAt = KNOWN_BRIGHT_DATE + 10;
    const entry = makeEntry({ deletedAt });

    expect(typeof entry.deletedAt).toBe('number');
    expect(Number.isFinite(entry.deletedAt)).toBe(true);
    expect(entry.deletedAt).toBe(deletedAt);
  });

  it('deletedAt when undefined is undefined', () => {
    const entry = makeEntry({ deletedAt: undefined });

    expect(entry.deletedAt).toBeUndefined();
  });

  it('deletedAt is absent (not set) by default when not provided', () => {
    const entry = makeEntry();

    // The spread in makeEntry does not include deletedAt, so it should be absent
    expect('deletedAt' in entry).toBe(false);
  });
});

describe('ICBLIndexEntry — JSON round-trip for createdAt', () => {
  it('createdAt round-trips through JSON as a plain number (not wrapped)', () => {
    const entry = makeEntry({ createdAt: KNOWN_BRIGHT_DATE });

    const serialized = JSON.stringify(entry);
    const parsed = JSON.parse(serialized) as ICBLIndexEntry;

    // Must survive JSON round-trip as a plain number
    expect(typeof parsed.createdAt).toBe('number');
    expect(parsed.createdAt).toBe(KNOWN_BRIGHT_DATE);
  });

  it('createdAt is not wrapped in an object after JSON round-trip', () => {
    const entry = makeEntry({ createdAt: KNOWN_BRIGHT_DATE });

    const serialized = JSON.stringify(entry);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;

    // Must not be an object wrapper (e.g., { __bd__: value })
    expect(typeof parsed['createdAt']).toBe('number');
    expect(parsed['createdAt']).not.toBeInstanceOf(Object);
  });

  it('deletedAt when set round-trips through JSON as a plain number', () => {
    const deletedAt = KNOWN_BRIGHT_DATE + 5;
    const entry = makeEntry({ deletedAt });

    const serialized = JSON.stringify(entry);
    const parsed = JSON.parse(serialized) as ICBLIndexEntry;

    expect(typeof parsed.deletedAt).toBe('number');
    expect(parsed.deletedAt).toBe(deletedAt);
  });
});
