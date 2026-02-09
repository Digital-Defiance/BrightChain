import fc from 'fast-check';
import {
  BlockAnnouncement,
  DeliveryAckMetadata,
  MessageDeliveryMetadata,
  validateBlockAnnouncement,
} from '../../interfaces/availability/gossipService';

/**
 * Property tests for BlockAnnouncement field validation
 *
 * **Validates: Requirements 1.5, 1.6**
 *
 * Property 1: Announcement Field Validation
 * For any BlockAnnouncement, if messageDelivery is present then type must be 'add',
 * and if deliveryAck is present then type must be 'ack'. Announcements violating
 * these rules must be rejected by validation.
 */
describe('Feature: unified-gossip-delivery, Property 1: Announcement field validation', () => {
  // --- Smart Generators ---

  /** Generates a non-empty string suitable for IDs */
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

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

  /** Generates the base fields common to all BlockAnnouncements */
  const baseAnnouncementFieldsArb = fc.record({
    blockId: nonEmptyStringArb,
    nodeId: nonEmptyStringArb,
    timestamp: fc.date(),
    ttl: fc.integer({ min: 1, max: 10 }),
  });

  /** Generates a valid 'add' type announcement with messageDelivery */
  const addWithMessageDeliveryArb: fc.Arbitrary<BlockAnnouncement> = fc
    .tuple(baseAnnouncementFieldsArb, messageDeliveryArb)
    .map(([base, md]) => ({
      ...base,
      type: 'add' as const,
      messageDelivery: md,
    }));

  /** Generates a valid 'ack' type announcement with deliveryAck */
  const ackWithDeliveryAckArb: fc.Arbitrary<BlockAnnouncement> = fc
    .tuple(baseAnnouncementFieldsArb, deliveryAckArb)
    .map(([base, ack]) => ({
      ...base,
      type: 'ack' as const,
      deliveryAck: ack,
    }));

  /** Generates a valid 'add' type announcement without messageDelivery */
  const addPlainArb: fc.Arbitrary<BlockAnnouncement> =
    baseAnnouncementFieldsArb.map((base) => ({
      ...base,
      type: 'add' as const,
    }));

  /** Generates a valid 'remove' type announcement (no optional fields) */
  const removePlainArb: fc.Arbitrary<BlockAnnouncement> =
    baseAnnouncementFieldsArb.map((base) => ({
      ...base,
      type: 'remove' as const,
    }));

  /** Types that are NOT 'add' — used to test messageDelivery on wrong type */
  const nonAddTypeArb = fc.constantFrom('remove' as const, 'ack' as const);

  /** Types that are NOT 'ack' — used to test deliveryAck on wrong type */
  const nonAckTypeArb = fc.constantFrom('add' as const, 'remove' as const);

  // --- Property Tests ---

  /**
   * Property 1a: Announcements with messageDelivery on 'add' type are accepted.
   * If messageDelivery is present and type is 'add', validation must pass.
   *
   * **Validates: Requirements 1.5**
   */
  it('Property 1a: messageDelivery on add type is accepted', () => {
    fc.assert(
      fc.property(addWithMessageDeliveryArb, (announcement) => {
        expect(validateBlockAnnouncement(announcement)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1b: Announcements with deliveryAck on 'ack' type are accepted.
   * If deliveryAck is present and type is 'ack', validation must pass.
   *
   * **Validates: Requirements 1.6**
   */
  it('Property 1b: deliveryAck on ack type is accepted', () => {
    fc.assert(
      fc.property(ackWithDeliveryAckArb, (announcement) => {
        expect(validateBlockAnnouncement(announcement)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1c: Announcements with messageDelivery on non-'add' types are rejected.
   * If messageDelivery is present but type is NOT 'add', validation must fail.
   *
   * **Validates: Requirements 1.5**
   */
  it('Property 1c: messageDelivery on non-add type is rejected', () => {
    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        nonAddTypeArb,
        messageDeliveryArb,
        (base, type, md) => {
          const announcement: BlockAnnouncement = {
            ...base,
            type,
            messageDelivery: md,
          };
          expect(validateBlockAnnouncement(announcement)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1d: Announcements with deliveryAck on non-'ack' types are rejected.
   * If deliveryAck is present but type is NOT 'ack', validation must fail.
   *
   * **Validates: Requirements 1.6**
   */
  it('Property 1d: deliveryAck on non-ack type is rejected', () => {
    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        nonAckTypeArb,
        deliveryAckArb,
        (base, type, ack) => {
          const announcement: BlockAnnouncement = {
            ...base,
            type,
            deliveryAck: ack,
          };
          expect(validateBlockAnnouncement(announcement)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1e: Plain announcements without optional metadata are accepted.
   * Announcements of type 'add' or 'remove' without messageDelivery or deliveryAck
   * must pass validation.
   *
   * **Validates: Requirements 1.5, 1.6**
   */
  it('Property 1e: plain announcements without optional metadata are accepted', () => {
    const plainAnnouncementArb = fc.oneof(addPlainArb, removePlainArb);

    fc.assert(
      fc.property(plainAnnouncementArb, (announcement) => {
        expect(validateBlockAnnouncement(announcement)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property tests for BlockAnnouncement metadata completeness
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * Property 2: Announcement Metadata Completeness
 * For any BlockAnnouncement, the type field must be one of 'add', 'remove', or 'ack'.
 * If messageDelivery is present, it must contain non-empty messageId, recipientIds,
 * priority, blockIds, cblBlockId, and a boolean ackRequired.
 * If deliveryAck is present, it must contain non-empty messageId, recipientId,
 * status, and originalSenderNode.
 */
describe('Feature: unified-gossip-delivery, Property 2: Announcement metadata completeness', () => {
  // --- Smart Generators ---

  /** Generates a non-empty string suitable for IDs */
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

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

  /** Generates the base fields common to all BlockAnnouncements */
  const baseAnnouncementFieldsArb = fc.record({
    blockId: nonEmptyStringArb,
    nodeId: nonEmptyStringArb,
    timestamp: fc.date(),
    ttl: fc.integer({ min: 1, max: 10 }),
  });

  /** Generates a valid announcement type */
  const validTypeArb = fc.constantFrom(
    'add' as const,
    'remove' as const,
    'ack' as const,
  );

  // --- Property Tests ---

  /**
   * Property 2a: The type field of any valid BlockAnnouncement must be one of 'add', 'remove', or 'ack'.
   * For any valid announcement that passes validation, the type is always in the allowed set.
   *
   * **Validates: Requirements 1.1**
   */
  it('Property 2a: valid announcements have type in {add, remove, ack}', () => {
    // Generate valid announcements of all three types
    const validAnnouncementArb: fc.Arbitrary<BlockAnnouncement> = fc.oneof(
      // 'add' without messageDelivery
      fc
        .tuple(
          baseAnnouncementFieldsArb,
          validTypeArb.filter((t) => t === 'add'),
        )
        .map(([base, type]) => ({
          ...base,
          type,
        })),
      // 'add' with messageDelivery
      fc
        .tuple(baseAnnouncementFieldsArb, messageDeliveryArb)
        .map(([base, md]) => ({
          ...base,
          type: 'add' as const,
          messageDelivery: md,
        })),
      // 'remove' plain
      fc
        .tuple(
          baseAnnouncementFieldsArb,
          validTypeArb.filter((t) => t === 'remove'),
        )
        .map(([base, type]) => ({
          ...base,
          type,
        })),
      // 'ack' with deliveryAck
      fc
        .tuple(baseAnnouncementFieldsArb, deliveryAckArb)
        .map(([base, ack]) => ({
          ...base,
          type: 'ack' as const,
          deliveryAck: ack,
        })),
    );

    fc.assert(
      fc.property(validAnnouncementArb, (announcement) => {
        expect(validateBlockAnnouncement(announcement)).toBe(true);
        expect(['add', 'remove', 'ack']).toContain(announcement.type);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2b: Announcements with an invalid type are rejected by validation.
   *
   * **Validates: Requirements 1.1**
   */
  it('Property 2b: announcements with invalid type are rejected', () => {
    const invalidTypeArb = fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => !['add', 'remove', 'ack'].includes(s));

    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        invalidTypeArb,
        (base, invalidType) => {
          const announcement = {
            ...base,
            type: invalidType,
          } as unknown as BlockAnnouncement;
          expect(validateBlockAnnouncement(announcement)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2c: When messageDelivery is present on a valid 'add' announcement,
   * it must contain non-empty messageId, non-empty recipientIds array, valid priority,
   * non-empty blockIds array, non-empty cblBlockId, and a boolean ackRequired.
   *
   * **Validates: Requirements 1.2**
   */
  it('Property 2c: valid messageDelivery has all required non-empty fields', () => {
    const addWithMdArb: fc.Arbitrary<BlockAnnouncement> = fc
      .tuple(baseAnnouncementFieldsArb, messageDeliveryArb)
      .map(([base, md]) => ({
        ...base,
        type: 'add' as const,
        messageDelivery: md,
      }));

    fc.assert(
      fc.property(addWithMdArb, (announcement) => {
        expect(validateBlockAnnouncement(announcement)).toBe(true);

        const md = announcement.messageDelivery!;

        // messageId is a non-empty string
        expect(typeof md.messageId).toBe('string');
        expect(md.messageId.length).toBeGreaterThan(0);

        // recipientIds is a non-empty array of non-empty strings
        expect(Array.isArray(md.recipientIds)).toBe(true);
        expect(md.recipientIds.length).toBeGreaterThan(0);
        md.recipientIds.forEach((id) => {
          expect(typeof id).toBe('string');
          expect(id.length).toBeGreaterThan(0);
        });

        // priority is 'normal' or 'high'
        expect(['normal', 'high']).toContain(md.priority);

        // blockIds is a non-empty array of non-empty strings
        expect(Array.isArray(md.blockIds)).toBe(true);
        expect(md.blockIds.length).toBeGreaterThan(0);
        md.blockIds.forEach((id) => {
          expect(typeof id).toBe('string');
          expect(id.length).toBeGreaterThan(0);
        });

        // cblBlockId is a non-empty string
        expect(typeof md.cblBlockId).toBe('string');
        expect(md.cblBlockId.length).toBeGreaterThan(0);

        // ackRequired is a boolean
        expect(typeof md.ackRequired).toBe('boolean');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2d: When deliveryAck is present on a valid 'ack' announcement,
   * it must contain non-empty messageId, non-empty recipientId, valid status,
   * and non-empty originalSenderNode.
   *
   * **Validates: Requirements 1.3**
   */
  it('Property 2d: valid deliveryAck has all required non-empty fields', () => {
    const ackWithAckArb: fc.Arbitrary<BlockAnnouncement> = fc
      .tuple(baseAnnouncementFieldsArb, deliveryAckArb)
      .map(([base, ack]) => ({
        ...base,
        type: 'ack' as const,
        deliveryAck: ack,
      }));

    fc.assert(
      fc.property(ackWithAckArb, (announcement) => {
        expect(validateBlockAnnouncement(announcement)).toBe(true);

        const ack = announcement.deliveryAck!;

        // messageId is a non-empty string
        expect(typeof ack.messageId).toBe('string');
        expect(ack.messageId.length).toBeGreaterThan(0);

        // recipientId is a non-empty string
        expect(typeof ack.recipientId).toBe('string');
        expect(ack.recipientId.length).toBeGreaterThan(0);

        // status is one of the valid ack statuses
        expect(['delivered', 'read', 'failed', 'bounced']).toContain(
          ack.status,
        );

        // originalSenderNode is a non-empty string
        expect(typeof ack.originalSenderNode).toBe('string');
        expect(ack.originalSenderNode.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2e: Announcements with incomplete messageDelivery metadata are rejected.
   * If any required field in messageDelivery is empty or missing, validation must fail.
   *
   * **Validates: Requirements 1.2**
   */
  it('Property 2e: incomplete messageDelivery metadata is rejected', () => {
    // Generate a valid messageDelivery then corrupt one field at a time
    const corruptionStrategyArb = fc.constantFrom(
      'emptyMessageId',
      'emptyRecipientIds',
      'emptyBlockIds',
      'emptyCblBlockId',
      'invalidPriority',
      'nonBooleanAckRequired',
    );

    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        messageDeliveryArb,
        corruptionStrategyArb,
        (base, md, strategy) => {
          let corrupted: Record<string, unknown> = { ...md };

          switch (strategy) {
            case 'emptyMessageId':
              corrupted = { ...md, messageId: '' };
              break;
            case 'emptyRecipientIds':
              corrupted = { ...md, recipientIds: [] };
              break;
            case 'emptyBlockIds':
              corrupted = { ...md, blockIds: [] };
              break;
            case 'emptyCblBlockId':
              corrupted = { ...md, cblBlockId: '' };
              break;
            case 'invalidPriority':
              corrupted = { ...md, priority: 'urgent' };
              break;
            case 'nonBooleanAckRequired':
              corrupted = { ...md, ackRequired: 'yes' };
              break;
          }

          const announcement = {
            ...base,
            type: 'add' as const,
            messageDelivery: corrupted as unknown as MessageDeliveryMetadata,
          };

          expect(validateBlockAnnouncement(announcement)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2f: Announcements with incomplete deliveryAck metadata are rejected.
   * If any required field in deliveryAck is empty or missing, validation must fail.
   *
   * **Validates: Requirements 1.3**
   */
  it('Property 2f: incomplete deliveryAck metadata is rejected', () => {
    // Generate a valid deliveryAck then corrupt one field at a time
    const corruptionStrategyArb = fc.constantFrom(
      'emptyMessageId',
      'emptyRecipientId',
      'invalidStatus',
      'emptyOriginalSenderNode',
    );

    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        deliveryAckArb,
        corruptionStrategyArb,
        (base, ack, strategy) => {
          let corrupted: Record<string, unknown> = { ...ack };

          switch (strategy) {
            case 'emptyMessageId':
              corrupted = { ...ack, messageId: '' };
              break;
            case 'emptyRecipientId':
              corrupted = { ...ack, recipientId: '' };
              break;
            case 'invalidStatus':
              corrupted = { ...ack, status: 'unknown' };
              break;
            case 'emptyOriginalSenderNode':
              corrupted = { ...ack, originalSenderNode: '' };
              break;
          }

          const announcement = {
            ...base,
            type: 'ack' as const,
            deliveryAck: corrupted as unknown as DeliveryAckMetadata,
          };

          expect(validateBlockAnnouncement(announcement)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
