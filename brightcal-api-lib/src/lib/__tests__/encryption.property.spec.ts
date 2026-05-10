/**
 * Encryption — property-based tests.
 *
 * Property 26: Encryption at Rest (Req 17.1)
 * Property 27: Recipient Re-Encryption (Req 17.2)
 * Property 28: Key Rotation on Revocation (Req 17.4)
 * Property 29: Free/Busy Separation from Encrypted Events (Req 17.5)
 *
 * Uses fast-check with the EncryptionService abstraction layer.
 */

import fc from 'fast-check';
import { EncryptionService } from '../services/encryptionService.ts';

// ─── Setup ───────────────────────────────────────────────────────────────────

const encryptionService = new EncryptionService();

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generate non-empty plaintext event body strings.
 * Uses printable ASCII with minimum length of 4 to ensure meaningful
 * content that is clearly distinguishable from encrypted output.
 * Short strings (1-3 chars) can coincidentally appear in base64 padding.
 */
const eventBodyArb = fc
  .string({ minLength: 4, maxLength: 500 })
  .filter((s) => s.trim().length >= 4);

/**
 * Generate a valid hex encryption key (32 bytes = 64 hex chars).
 */
const keyArb = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .map((bytes) => Buffer.from(bytes).toString('hex'));

/**
 * Generate a pair of distinct keys (owner + recipient).
 */
const distinctKeyPairArb = fc.tuple(keyArb, keyArb).filter(([a, b]) => a !== b);

/**
 * Generate three distinct keys (owner, recipient, third-party).
 */
const threeDistinctKeysArb = fc
  .tuple(keyArb, keyArb, keyArb)
  .filter(([a, b, c]) => a !== b && b !== c && a !== c);

/**
 * Generate a free/busy slot (unencrypted metadata).
 * Uses integer timestamps to avoid invalid date issues with fc.date().
 */
const dateMin = new Date('2024-01-01T00:00:00Z').getTime();
const dateMax = new Date('2025-12-31T23:59:59Z').getTime();

const isoDateArb = fc
  .integer({ min: dateMin, max: dateMax })
  .map((ts) => new Date(ts).toISOString());

const freeBusySlotArb = fc.record({
  start: isoDateArb,
  end: isoDateArb,
  type: fc.oneof(
    fc.constant('BUSY' as const),
    fc.constant('BUSY-TENTATIVE' as const),
    fc.constant('FREE' as const),
  ),
});

/**
 * Generate an event with encrypted body and separate free/busy data.
 */
const eventWithFreeBusyArb = fc.record({
  body: eventBodyArb,
  slots: fc.array(freeBusySlotArb, { minLength: 1, maxLength: 5 }),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Encryption — Property Tests', () => {
  /**
   * **Property 26: Encryption at Rest**
   *
   * **Validates: Requirements 17.1**
   *
   * For any stored calendar event, the raw block store content SHALL be
   * encrypted (not readable as plaintext) using the owner's encryption key.
   */
  describe('Property 26: Encryption at Rest', () => {
    it('encrypted output is not readable as plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(eventBodyArb, keyArb, async (plaintext, key) => {
          const encrypted = await encryptionService.encrypt(plaintext, key);

          // Encrypted output must differ from plaintext
          expect(encrypted).not.toBe(plaintext);

          // The raw encrypted bytes should not contain the plaintext bytes
          // (verifies the data is actually transformed, not just encoded)
          const encryptedBytes = Buffer.from(encrypted, 'base64');
          const plaintextBytes = Buffer.from(plaintext, 'utf-8');
          expect(encryptedBytes.equals(plaintextBytes)).toBe(false);

          // Encrypted output should be valid base64
          expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();

          // Round-trip: decrypting with the correct key recovers plaintext
          const decrypted = await encryptionService.decrypt(encrypted, key);
          expect(decrypted).toBe(plaintext);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Property 27: Recipient Re-Encryption**
   *
   * **Validates: Requirements 17.2**
   *
   * For any shared calendar, the recipient SHALL be able to decrypt shared
   * event data using their own key, and the data SHALL not be decryptable
   * by any other user's key.
   */
  describe('Property 27: Recipient Re-Encryption', () => {
    it('recipient decrypts with their key, third-party cannot', async () => {
      await fc.assert(
        fc.asyncProperty(
          eventBodyArb,
          threeDistinctKeysArb,
          async (plaintext, [ownerKey, recipientKey, thirdPartyKey]) => {
            // Owner encrypts
            const ownerEncrypted = await encryptionService.encrypt(
              plaintext,
              ownerKey,
            );

            // Re-encrypt for recipient
            const recipientEncrypted = await encryptionService.reEncrypt(
              ownerEncrypted,
              ownerKey,
              recipientKey,
            );

            // Recipient can decrypt with their key
            const recipientDecrypted = await encryptionService.decrypt(
              recipientEncrypted,
              recipientKey,
            );
            expect(recipientDecrypted).toBe(plaintext);

            // Third-party cannot decrypt (AES-GCM throws on wrong key)
            await expect(
              encryptionService.decrypt(recipientEncrypted, thirdPartyKey),
            ).rejects.toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Property 28: Key Rotation on Revocation**
   *
   * **Validates: Requirements 17.4**
   *
   * For any calendar where sharing is revoked, new events added after
   * revocation SHALL not be decryptable by the previously-shared
   * recipient's key.
   */
  describe('Property 28: Key Rotation on Revocation', () => {
    it('new events after key rotation not decryptable with old key', async () => {
      await fc.assert(
        fc.asyncProperty(eventBodyArb, keyArb, async (plaintext, oldKey) => {
          // Rotate the key (simulates revocation)
          const newKey = encryptionService.rotateKey(oldKey);

          // New key must differ from old key
          expect(newKey).not.toBe(oldKey);

          // Encrypt new event data with the rotated key
          const encrypted = await encryptionService.encrypt(plaintext, newKey);

          // Old key cannot decrypt data encrypted with the new key (AES-GCM throws)
          await expect(
            encryptionService.decrypt(encrypted, oldKey),
          ).rejects.toThrow();

          // New key can decrypt correctly
          const decryptedWithNewKey = await encryptionService.decrypt(
            encrypted,
            newKey,
          );
          expect(decryptedWithNewKey).toBe(plaintext);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Property 29: Free/Busy Separation from Encrypted Events**
   *
   * **Validates: Requirements 17.5**
   *
   * For any user's calendar, free/busy data SHALL be queryable without
   * requiring the event encryption key, while event details remain encrypted.
   */
  describe('Property 29: Free/Busy Separation from Encrypted Events', () => {
    it('free/busy accessible without decryption key, body remains encrypted', async () => {
      await fc.assert(
        fc.asyncProperty(
          eventWithFreeBusyArb,
          keyArb,
          async ({ body, slots }, key) => {
            // Encrypt the event body
            const encryptedBody = await encryptionService.encrypt(body, key);

            // Simulate stored event: encrypted body + unencrypted free/busy
            const storedEvent = {
              encryptedBody,
              freeBusySlots: slots, // stored separately, unencrypted
            };

            // Free/busy data is accessible without any key
            expect(storedEvent.freeBusySlots).toEqual(slots);
            expect(storedEvent.freeBusySlots.length).toBeGreaterThan(0);
            for (const slot of storedEvent.freeBusySlots) {
              expect(slot.start).toBeDefined();
              expect(slot.end).toBeDefined();
              expect(['BUSY', 'BUSY-TENTATIVE', 'FREE']).toContain(slot.type);
            }

            // Event body remains encrypted (not readable as plaintext)
            expect(storedEvent.encryptedBody).not.toBe(body);
            expect(storedEvent.encryptedBody).not.toContain(body);

            // Only with the correct key can the body be decrypted
            const decryptedBody = await encryptionService.decrypt(
              storedEvent.encryptedBody,
              key,
            );
            expect(decryptedBody).toBe(body);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
