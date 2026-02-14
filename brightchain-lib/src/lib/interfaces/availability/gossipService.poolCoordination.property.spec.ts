import fc from 'fast-check';
import {
  BlockAnnouncement,
  DeliveryAckMetadata,
  MessageDeliveryMetadata,
  validateBlockAnnouncement,
} from './gossipService';

/**
 * Property tests for BlockAnnouncement poolId validation
 *
 * **Validates: Requirements 1.6, 2.1**
 *
 * Property 3: Announcement validation rejects invalid poolIds
 * For any BlockAnnouncement where the poolId field is present but does not conform
 * to the Pool_ID format (/^[a-zA-Z0-9_-]{1,64}$/), validateBlockAnnouncement SHALL
 * return false. For announcements of type pool_deleted, a missing or invalid poolId
 * SHALL cause validation to return false. For announcements of type pool_deleted with
 * messageDelivery or deliveryAck metadata, validation SHALL return false.
 */
describe('Feature: cross-node-pool-coordination, Property 3: Announcement validation rejects invalid poolIds', () => {
  // --- Smart Generators ---

  /** Generates a non-empty string suitable for IDs */
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  /** Generates a valid pool ID matching /^[a-zA-Z0-9_-]{1,64}$/ */
  const validPoolIdArb = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

  /**
   * Generates an invalid pool ID — strings that do NOT match /^[a-zA-Z0-9_-]{1,64}$/.
   * Covers: empty strings, strings > 64 chars, strings with invalid characters.
   */
  const invalidPoolIdArb = fc.oneof(
    // Empty string
    fc.constant(''),
    // String with invalid characters (spaces, dots, slashes, etc.)
    fc
      .string({ minLength: 1, maxLength: 30 })
      .filter((s: string) => !/^[a-zA-Z0-9_-]{1,64}$/.test(s)),
    // String longer than 64 characters (all valid chars but too long)
    fc.stringMatching(/^[a-zA-Z0-9]{65,100}$/),
  );

  /** Generates the base fields common to all BlockAnnouncements */
  const baseAnnouncementFieldsArb = fc.record({
    blockId: nonEmptyStringArb,
    nodeId: nonEmptyStringArb,
    timestamp: fc.date(),
    ttl: fc.integer({ min: 1, max: 10 }),
  });

  /** Generates a valid MessageDeliveryMetadata */
  const messageDeliveryArb: fc.Arbitrary<MessageDeliveryMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    priority: fc.constantFrom('normal' as const, 'high' as const),
    blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    cblBlockId: nonEmptyStringArb,
    ackRequired: fc.boolean(),
  });

  /** Generates a valid DeliveryAckMetadata */
  const deliveryAckArb: fc.Arbitrary<DeliveryAckMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientId: nonEmptyStringArb,
    status: fc.constantFrom(
      'delivered' as const,
      'read' as const,
      'failed' as const,
      'bounced' as const,
    ),
    originalSenderNode: nonEmptyStringArb,
  });

  // --- Property Tests ---

  /**
   * Property 3a: Announcements with invalid poolId format are rejected.
   * For any announcement type (add, remove, ack), if poolId is present but
   * does not match /^[a-zA-Z0-9_-]{1,64}$/, validation returns false.
   *
   * **Validates: Requirements 1.6**
   */
  it('Property 3a: announcements with invalid poolId format are rejected', () => {
    const typeArb = fc.constantFrom(
      'add' as const,
      'remove' as const,
      'ack' as const,
    );

    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        typeArb,
        invalidPoolIdArb,
        (base, type, invalidPoolId) => {
          const announcement: BlockAnnouncement = {
            ...base,
            type,
            poolId: invalidPoolId,
          };
          expect(validateBlockAnnouncement(announcement)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3b: pool_deleted announcements with missing poolId are rejected.
   * A pool_deleted announcement without a poolId field must fail validation.
   *
   * **Validates: Requirements 2.1**
   */
  it('Property 3b: pool_deleted announcements with missing poolId are rejected', () => {
    fc.assert(
      fc.property(baseAnnouncementFieldsArb, (base) => {
        const announcement: BlockAnnouncement = {
          ...base,
          type: 'pool_deleted',
          // poolId intentionally omitted
        };
        expect(validateBlockAnnouncement(announcement)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3c: pool_deleted announcements with invalid poolId are rejected.
   * A pool_deleted announcement with a poolId that doesn't match the format must fail.
   *
   * **Validates: Requirements 2.1**
   */
  it('Property 3c: pool_deleted announcements with invalid poolId are rejected', () => {
    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        invalidPoolIdArb,
        (base, invalidPoolId) => {
          const announcement: BlockAnnouncement = {
            ...base,
            type: 'pool_deleted',
            poolId: invalidPoolId,
          };
          expect(validateBlockAnnouncement(announcement)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3d: pool_deleted announcements with messageDelivery are rejected.
   * Even with a valid poolId, pool_deleted must not have messageDelivery metadata.
   *
   * **Validates: Requirements 2.1**
   */
  it('Property 3d: pool_deleted announcements with messageDelivery are rejected', () => {
    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        validPoolIdArb,
        messageDeliveryArb,
        (base, poolId, md) => {
          const announcement: BlockAnnouncement = {
            ...base,
            type: 'pool_deleted',
            poolId,
            messageDelivery: md,
          };
          expect(validateBlockAnnouncement(announcement)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3e: pool_deleted announcements with deliveryAck are rejected.
   * Even with a valid poolId, pool_deleted must not have deliveryAck metadata.
   *
   * **Validates: Requirements 2.1**
   */
  it('Property 3e: pool_deleted announcements with deliveryAck are rejected', () => {
    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        validPoolIdArb,
        deliveryAckArb,
        (base, poolId, ack) => {
          const announcement: BlockAnnouncement = {
            ...base,
            type: 'pool_deleted',
            poolId,
            deliveryAck: ack,
          };
          expect(validateBlockAnnouncement(announcement)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3f: Valid poolIds on add/remove types pass validation.
   * Announcements of type add or remove with a valid poolId must pass validation.
   *
   * **Validates: Requirements 1.6**
   */
  it('Property 3f: valid poolIds on add/remove types pass validation', () => {
    const addRemoveTypeArb = fc.constantFrom('add' as const, 'remove' as const);

    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        addRemoveTypeArb,
        validPoolIdArb,
        (base, type, poolId) => {
          const announcement: BlockAnnouncement = {
            ...base,
            type,
            poolId,
          };
          expect(validateBlockAnnouncement(announcement)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3g: Valid pool_deleted announcements with valid poolId pass validation.
   * pool_deleted with a valid poolId and no messageDelivery/deliveryAck must pass.
   *
   * **Validates: Requirements 2.1**
   */
  it('Property 3g: valid pool_deleted announcements pass validation', () => {
    fc.assert(
      fc.property(baseAnnouncementFieldsArb, validPoolIdArb, (base, poolId) => {
        const announcement: BlockAnnouncement = {
          ...base,
          type: 'pool_deleted',
          poolId,
        };
        expect(validateBlockAnnouncement(announcement)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
