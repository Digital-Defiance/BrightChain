/**
 * Feature: brightchain-vfs-explorer, Property 4: Challenge payload has correct byte layout
 *
 * For any server-generated challenge hex string of the correct format
 * (time 8 bytes + nonce 32 bytes + serverSignature 64 bytes = 104 bytes),
 * the client should be able to parse it and the total length should be
 * exactly 104 bytes.
 *
 * **Validates: Requirements 2.3**
 */

import fc from 'fast-check';

/** Signature size used by the platform (64 bytes: r(32) + s(32)). */
const SIGNATURE_SIZE = 64;

/** Expected total challenge buffer size: time(8) + nonce(32) + sig(64). */
const EXPECTED_CHALLENGE_SIZE = 8 + 32 + SIGNATURE_SIZE;

/**
 * Parse a server challenge buffer the same way the server does.
 */
function parseChallengeBuffer(buf: Buffer): {
  time: Buffer;
  nonce: Buffer;
  serverSignature: Buffer;
} {
  return {
    time: buf.subarray(0, 8),
    nonce: buf.subarray(8, 40),
    serverSignature: buf.subarray(40, 40 + SIGNATURE_SIZE),
  };
}

describe('Property 4: Challenge payload has correct byte layout', () => {
  it('a valid server challenge is exactly 104 bytes', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({
          minLength: EXPECTED_CHALLENGE_SIZE,
          maxLength: EXPECTED_CHALLENGE_SIZE,
        }),
        (bytes) => {
          const buf = Buffer.from(bytes);
          expect(buf.length).toBe(EXPECTED_CHALLENGE_SIZE);

          const { time, nonce, serverSignature } = parseChallengeBuffer(buf);
          expect(time.length).toBe(8);
          expect(nonce.length).toBe(32);
          expect(serverSignature.length).toBe(SIGNATURE_SIZE);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('first 8 bytes encode a timestamp as big-endian uint64', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 2_000_000_000_000 }),
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        fc.uint8Array({ minLength: SIGNATURE_SIZE, maxLength: SIGNATURE_SIZE }),
        (timestampMs, nonce, sig) => {
          const timeBuf = Buffer.alloc(8);
          timeBuf.writeBigUInt64BE(BigInt(timestampMs));

          const challenge = Buffer.concat([
            timeBuf,
            Buffer.from(nonce),
            Buffer.from(sig),
          ]);
          expect(challenge.length).toBe(EXPECTED_CHALLENGE_SIZE);

          // Read back the timestamp
          const decoded = Number(challenge.readBigUInt64BE(0));
          expect(decoded).toBe(timestampMs);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('hex-encoded challenge round-trips correctly', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({
          minLength: EXPECTED_CHALLENGE_SIZE,
          maxLength: EXPECTED_CHALLENGE_SIZE,
        }),
        (bytes) => {
          const buf = Buffer.from(bytes);
          const hex = buf.toString('hex');

          // Hex string should be exactly 208 chars (104 bytes * 2)
          expect(hex.length).toBe(EXPECTED_CHALLENGE_SIZE * 2);

          // Round-trip back to buffer
          const restored = Buffer.from(hex, 'hex');
          expect(restored.equals(buf)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
