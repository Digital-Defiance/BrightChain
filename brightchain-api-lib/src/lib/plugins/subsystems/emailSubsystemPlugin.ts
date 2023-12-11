import {
  MemoryMessageMetadataStore,
  type IAppSubsystemPlugin,
  type IGossipService,
  type ISubsystemContext,
  type MessageCBLService,
} from '@brightchain/brightchain-lib';
import { debugLog } from '@digitaldefiance/node-express-suite';
import {
  BrightDbEmailMetadataStore,
  BRIGHTMAIL_EMAILS_COLLECTION,
  BRIGHTMAIL_ATTACHMENTS_COLLECTION,
  BRIGHTMAIL_READ_TRACKING_COLLECTION,
} from '../../services/brightmail/brightDbEmailMetadataStore';
import { MessagePassingService } from '../../services/messagePassingService';

/**
 * Email subsystem plugin.
 *
 * Extracts the Email / MessagePassingService initialization block from
 * App.start() into a self-contained plugin. Creates a MessagePassingService
 * with in-memory stores and a no-op gossip stub, registers services in the
 * container, and wires routes to the ApiRouter.
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class EmailSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'email';
  public readonly isOptional = true;

  public async initialize(context: ISubsystemContext): Promise<void> {
    const messageCBL = {
      createMessage: async () => ({
        messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        contentBlockIds: [] as string[],
        magnetUrl: '',
      }),
      getMessageMetadata: async () => null,
      getMessageContent: async () => null,
    } as unknown as MessageCBLService;

    const messageMetadataStore = new MemoryMessageMetadataStore();
    const emailMetadataStore = new BrightDbEmailMetadataStore(
      context.getModel(BRIGHTMAIL_EMAILS_COLLECTION),
      context.getModel(BRIGHTMAIL_ATTACHMENTS_COLLECTION),
      context.getModel(BRIGHTMAIL_READ_TRACKING_COLLECTION),
    );

    // No-op gossip stub — real gossip is wired externally via setPoolDiscoveryService
    const gossipStubForEmail: IGossipService = {
      announceBlock: async () => {},
      announceRemoval: async () => {},
      announcePoolDeletion: async () => {},
      announceCBLIndexUpdate: async () => {},
      announceCBLIndexDelete: async () => {},
      announceHeadUpdate: async () => {},
      announceACLUpdate: async () => {},
      handleAnnouncement: async () => {},
      onAnnouncement: () => {},
      offAnnouncement: () => {},
      getPendingAnnouncements: () => [],
      flushAnnouncements: async () => {},
      start: () => {},
      stop: async () => {},
      getConfig: () => ({}) as ReturnType<IGossipService['getConfig']>,
      announceMessage: async () => {},
      sendDeliveryAck: async () => {},
      onMessageDelivery: () => {},
      offMessageDelivery: () => {},
      onDeliveryAck: () => {},
      offDeliveryAck: () => {},
      announceBrightTrustProposal: async () => {},
      announceBrightTrustVote: async () => {},
      onBrightTrustProposal: () => {},
      offBrightTrustProposal: () => {},
      onBrightTrustVote: () => {},
      offBrightTrustVote: () => {},
    };

    const mps = new MessagePassingService(
      messageCBL,
      messageMetadataStore as never,
      context.eventSystem,
      gossipStubForEmail,
    );
    mps.configureEmail(emailMetadataStore, {
      canonicalDomain: context.environment.emailDomain,
    });

    // Register with the service container
    context.services.register('messagePassingService', () => mps);
    context.services.register('emailMetadataStore', () => emailMetadataStore);

    // Wire to both the messages controller and the email controller
    if (context.apiRouter) {
      context.apiRouter.setMessagePassingService(mps);
      context.apiRouter.setMessagePassingServiceForEmail(mps);

      // Wire user registry so verify-recipient can resolve local users.
      // Delegates to MemberStore.queryIndex({ email }) which checks both
      // the in-memory index and the DB-backed fallback path.
      context.apiRouter.setEmailUserRegistry({
        hasUser: async (email: string): Promise<boolean> => {
          try {
            // Extract the local part (username) from the email address.
            const username = email.split('@')[0];
            const byName = await context.memberStore.queryIndex({
              name: username,
            });
            if (byName.length > 0) return true;
            const byEmail = await context.memberStore.queryIndex({ email });
            return byEmail.length > 0;
          } catch {
            return false;
          }
        },
      });
      context.apiRouter.setEmailDomain(context.environment.emailDomain);
    }

    debugLog(
      context.environment.debug,
      'log',
      '[ ready ] MessagePassingService initialized (email subsystem active)',
    );
  }
}
