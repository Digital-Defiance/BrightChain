import 'reflect-metadata';

import type { IGossipService } from '../../interfaces/availability/gossipService';
import { createMailbox } from '../../interfaces/messaging/emailAddress';
import {
  EmailMessageService,
  type ExternalEmailDispatcher,
  type IEmailInput,
  type IEmailMetadataStore,
} from './emailMessageService';
import type { MessageCBLService } from './messageCBLService';

/**
 * Tests for the external-recipient routing path:
 *   partitionRecipients() — pure split on canonical domain
 *   dispatchExternalRecipients() — exercised via sendEmail()
 *
 * Verifies that mailboxes whose domain matches `canonicalDomain` (or a
 * subdomain thereof) are treated as internal and excluded from the
 * dispatcher, while external mailboxes are forwarded to it preserving
 * the To/CC/BCC partition.
 */
describe('EmailMessageService external recipient routing', () => {
  const CANONICAL = 'example.com';

  function buildService(): EmailMessageService {
    const metadataStore: IEmailMetadataStore = {
      store: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      queryInbox: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      getThread: jest.fn(),
      getRootMessage: jest.fn(),
    };
    const gossip = {
      announceBlock: jest.fn(),
      announceRemoval: jest.fn(),
      handleAnnouncement: jest.fn(),
      onAnnouncement: jest.fn(),
      offAnnouncement: jest.fn(),
      getPendingAnnouncements: jest.fn().mockReturnValue([]),
      flushAnnouncements: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      getConfig: jest.fn(),
      announceMessage: jest.fn().mockResolvedValue(undefined),
      sendDeliveryAck: jest.fn(),
      onMessageDelivery: jest.fn(),
      offMessageDelivery: jest.fn(),
      onDeliveryAck: jest.fn(),
      offDeliveryAck: jest.fn(),
    } as unknown as IGossipService;
    return new EmailMessageService(
      {} as MessageCBLService,
      metadataStore,
      gossip,
      { nodeId: 'test-node.brightchain.org', canonicalDomain: CANONICAL },
    );
  }

  describe('partitionRecipients()', () => {
    it('splits canonical-domain mailboxes from non-canonical ones', () => {
      const service = buildService();
      const inside = createMailbox('alice', CANONICAL);
      const outside = createMailbox('bob', 'other.example');
      const result = service.partitionRecipients([inside, outside]);
      expect(result.internal).toEqual([inside]);
      expect(result.external).toEqual([outside]);
    });

    it('treats subdomains of the canonical domain as internal', () => {
      const service = buildService();
      const sub = createMailbox('alice', `mail.${CANONICAL}`);
      const result = service.partitionRecipients([sub]);
      expect(result.internal).toEqual([sub]);
      expect(result.external).toEqual([]);
    });

    it('is case-insensitive on domain comparison', () => {
      const service = buildService();
      const upper = createMailbox('alice', CANONICAL.toUpperCase());
      const result = service.partitionRecipients([upper]);
      expect(result.internal).toEqual([upper]);
      expect(result.external).toEqual([]);
    });

    it('returns empty arrays for empty input', () => {
      const service = buildService();
      const result = service.partitionRecipients([]);
      expect(result.internal).toEqual([]);
      expect(result.external).toEqual([]);
    });
  });

  describe('dispatchExternalRecipients() via sendEmail()', () => {
    it('forwards externals only, partitioned across To/CC/BCC', async () => {
      const service = buildService();
      const dispatcher: jest.MockedFunction<ExternalEmailDispatcher> = jest
        .fn()
        .mockResolvedValue(undefined);
      service.setExternalDispatcher(dispatcher);

      const internalTo = createMailbox('alice', CANONICAL);
      const externalTo = createMailbox('bob', 'partner.example');
      const internalCc = createMailbox('carol', CANONICAL);
      const externalCc = createMailbox('dan', 'partner.example');
      const externalBcc1 = createMailbox('eve', 'other.example');
      const externalBcc2 = createMailbox('frank', 'partner.example');

      const input: IEmailInput = {
        from: createMailbox('sender', CANONICAL),
        to: [internalTo, externalTo],
        cc: [internalCc, externalCc],
        bcc: [externalBcc1, externalBcc2],
        subject: 'Hello',
        textBody: 'Body',
      };

      await service.sendEmail(input);

      expect(dispatcher).toHaveBeenCalledTimes(1);
      const call = dispatcher.mock.calls[0][0];
      expect(call.externalTo).toEqual([externalTo]);
      expect(call.externalCc).toEqual([externalCc]);
      expect(call.externalBcc).toEqual([externalBcc1, externalBcc2]);
      expect(call.from).toEqual(input.from);
      expect(call.subject).toBe('Hello');
      expect(call.textBody).toBe('Body');
      expect(typeof call.messageId).toBe('string');
      expect(call.messageId.length).toBeGreaterThan(0);
    });

    it('does not invoke the dispatcher when every recipient is internal', async () => {
      const service = buildService();
      const dispatcher = jest.fn().mockResolvedValue(undefined);
      service.setExternalDispatcher(dispatcher);

      await service.sendEmail({
        from: createMailbox('sender', CANONICAL),
        to: [createMailbox('alice', CANONICAL)],
        cc: [createMailbox('carol', `mail.${CANONICAL}`)],
        subject: 'Internal-only',
        textBody: 'no externals here',
      });

      expect(dispatcher).not.toHaveBeenCalled();
    });

    it('swallows dispatcher errors so the BrightMail send still succeeds', async () => {
      const service = buildService();
      const dispatcher = jest.fn().mockRejectedValue(new Error('SES exploded'));
      service.setExternalDispatcher(dispatcher);

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        /* silence */
      });

      const result = await service.sendEmail({
        from: createMailbox('sender', CANONICAL),
        to: [createMailbox('bob', 'partner.example')],
        subject: 'Boom',
        textBody: 'will be dispatched',
      });

      expect(dispatcher).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      errorSpy.mockRestore();
    });

    it('is a no-op when no dispatcher has been registered', async () => {
      const service = buildService();
      // No setExternalDispatcher call.
      const result = await service.sendEmail({
        from: createMailbox('sender', CANONICAL),
        to: [createMailbox('bob', 'partner.example')],
        subject: 'Lone external',
        textBody: 'no transport configured',
      });
      // No transport, no throw, send is still recorded as successful.
      expect(result.success).toBe(true);
    });
  });

  // ─── receiveEmail() — inbound storage without external dispatch ───────────

  describe('receiveEmail()', () => {
    it('stores metadata and returns success without calling the dispatcher', async () => {
      const service = buildService();
      const dispatcher = jest.fn().mockResolvedValue(undefined);
      service.setExternalDispatcher(dispatcher);

      const result = await service.receiveEmail({
        from: createMailbox('sender', 'external.example'),
        to: [createMailbox('alice', CANONICAL)],
        subject: 'Inbound from outside',
        textBody: 'Hello local user',
      });

      expect(result.success).toBe(true);
      expect(typeof result.messageId).toBe('string');
      expect(dispatcher).not.toHaveBeenCalled();
    });

    it('stores metadata even when relayAllRecipientsExternally would be true', async () => {
      // Build a service that would relay everything externally if sendEmail() were called
      const metadataStore: IEmailMetadataStore = {
        store: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        queryInbox: jest.fn(),
        getUnreadCount: jest.fn(),
        markAsRead: jest.fn(),
        getThread: jest.fn(),
        getRootMessage: jest.fn(),
      };
      const gossip = {
        announceBlock: jest.fn(),
        announceRemoval: jest.fn(),
        handleAnnouncement: jest.fn(),
        onAnnouncement: jest.fn(),
        offAnnouncement: jest.fn(),
        getPendingAnnouncements: jest.fn().mockReturnValue([]),
        flushAnnouncements: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        getConfig: jest.fn(),
        announceMessage: jest.fn().mockResolvedValue(undefined),
        sendDeliveryAck: jest.fn(),
        onMessageDelivery: jest.fn(),
        offMessageDelivery: jest.fn(),
        onDeliveryAck: jest.fn(),
        offDeliveryAck: jest.fn(),
      } as unknown as IGossipService;

      const service = new EmailMessageService(
        {} as MessageCBLService,
        metadataStore,
        gossip,
        {
          nodeId: 'test-node.brightchain.org',
          canonicalDomain: CANONICAL,
          relayAllRecipientsExternally: true,
        },
      );
      const dispatcher = jest.fn().mockResolvedValue(undefined);
      service.setExternalDispatcher(dispatcher);

      const result = await service.receiveEmail({
        from: createMailbox('outside', 'external.example'),
        to: [createMailbox('alice', CANONICAL)],
        subject: 'Inbound relay-all mode',
        textBody: 'Should never be re-dispatched',
      });

      expect(result.success).toBe(true);
      // The dispatcher must NOT fire — this is the core anti-loop guarantee
      expect(dispatcher).not.toHaveBeenCalled();
      // Metadata was stored
      expect(metadataStore.store).toHaveBeenCalledTimes(1);
    });

    it('returns success=false and does not throw when metadata storage fails', async () => {
      const metadataStore: IEmailMetadataStore = {
        store: jest.fn().mockRejectedValue(new Error('DB full')),
        get: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        queryInbox: jest.fn(),
        getUnreadCount: jest.fn(),
        markAsRead: jest.fn(),
        getThread: jest.fn(),
        getRootMessage: jest.fn(),
      };
      const gossip = {
        announceMessage: jest.fn().mockResolvedValue(undefined),
      } as unknown as IGossipService;

      const service = new EmailMessageService(
        {} as MessageCBLService,
        metadataStore,
        gossip,
        { nodeId: 'test-node', canonicalDomain: CANONICAL },
      );

      const result = await service.receiveEmail({
        from: createMailbox('outside', 'external.example'),
        to: [createMailbox('alice', CANONICAL)],
        subject: 'Storage fail test',
        textBody: 'content',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Failed to store inbound email metadata/);
    });

    it('preserves messageId from the input when provided', async () => {
      const service = buildService();
      const customMessageId = '<test-preserve@example.com>';

      const result = await service.receiveEmail({
        from: createMailbox('outside', 'external.example'),
        to: [createMailbox('alice', CANONICAL)],
        subject: 'Preserve messageId',
        messageId: customMessageId,
        textBody: 'content',
      });

      expect(result.messageId).toBe(customMessageId);
    });

    it('auto-generates messageId when not provided', async () => {
      const service = buildService();

      const result = await service.receiveEmail({
        from: createMailbox('outside', 'external.example'),
        to: [createMailbox('alice', CANONICAL)],
        subject: 'Auto messageId',
        textBody: 'content',
      });

      expect(result.messageId).toBeTruthy();
      expect(typeof result.messageId).toBe('string');
    });
  });
});
