import {
  ChannelService,
  ConversationService,
  GroupService,
  MemberStore,
  MissingPublicKeyError,
  PermissionService,
  ServerService,
  ServiceProvider,
  type IAppSubsystemPlugin,
  type IGossipService,
  type ISubsystemContext,
  type MessageCBLService,
} from '@brightchain/brightchain-lib';
import { debugLog } from '@digitaldefiance/node-express-suite';
import { BlockContentStoreAdapter } from '../../services/brightchat/blockContentStoreAdapter';
import { createChatStorageProvider } from '../../services/brightchat/chatStorageAdapter';

/**
 * BrightChat communication services subsystem plugin.
 *
 * Extracts the BrightChat communication services initialization block from
 * App.start() into a self-contained plugin. Creates ECIES key encryption
 * handler, member public key cache, block content store adapter, and all
 * chat services (ConversationService, GroupService, ChannelService,
 * ServerService, PermissionService). Registers services in the container
 * and wires routes to the ApiRouter.
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
export class BrightChatSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'brightchat';

  public async initialize(context: ISubsystemContext): Promise<void> {
    if (!context.apiRouter) {
      // BrightChat services require the ApiRouter to wire controllers.
      // When running without an ApiRouter (e.g. worker processes), skip.
      return;
    }

    const permissionService = new PermissionService();

    // Create a BrightDb-backed storage provider for BrightChat services.
    // Uses the same getModel pattern as BrightHub services so all data
    // flows through the single BrightDb instance.
    const chatStorageProvider = createChatStorageProvider(
      (name) => context.getModel(name),
    );

    // ── ECIES-backed key encryption handler ──────────────────────
    // Creates a sync handler that wraps symmetric keys using ECDH key
    // agreement with the member's public key. Uses the ECIES core
    // primitives (all synchronous) for real cryptographic key wrapping.
    //
    // The handler:
    // 1. Generates an ephemeral key pair (sync via eciesService.core)
    // 2. Computes ECDH shared secret with the member's public key
    // 3. Derives a 32-byte wrapping key via HKDF
    // 4. XORs the symmetric key with the derived key
    // 5. Returns ephemeralPubKey || wrappedKey as hex string
    //
    // Public keys are cached after first async lookup so subsequent
    // calls within the same session are synchronous.
    const serviceProvider = ServiceProvider.getInstance();
    const eciesService = serviceProvider.eciesService;
    const memberPublicKeyCache = new Map<string, Uint8Array>();

    const eciesKeyEncryptionHandler = (
      memberId: string,
      symmetricKey: Uint8Array,
    ): string => {
      // Look up cached public key (populated by ensureMemberPublicKey)
      const publicKey = memberPublicKeyCache.get(memberId);
      if (!publicKey) {
        throw new MissingPublicKeyError(memberId);
      }

      // Generate ephemeral key pair for this wrapping operation
      const ephemeralPrivateKey = eciesService.core.generatePrivateKey();
      const ephemeralPublicKey =
        eciesService.core.getPublicKey(ephemeralPrivateKey);

      // ECDH shared secret + HKDF key derivation (both sync)
      const sharedSecret = eciesService.core.computeSharedSecret(
        ephemeralPrivateKey,
        publicKey,
      );
      const wrappingKey = eciesService.core.deriveSharedKey(sharedSecret);

      // XOR the symmetric key with the derived wrapping key
      const wrapped = new Uint8Array(symmetricKey.length);
      for (let i = 0; i < symmetricKey.length; i++) {
        wrapped[i] = symmetricKey[i] ^ wrappingKey[i % wrappingKey.length];
      }

      // Encode as hex: ephemeralPubKey || wrapped
      const ephHex = Buffer.from(ephemeralPublicKey).toString('hex');
      const wrappedHex = Buffer.from(wrapped).toString('hex');
      return `ecies:${ephHex}:${wrappedHex}`;
    };

    // Helper to pre-populate the public key cache for a member.
    // Called before any key wrapping operation that needs the member's key.
    const ensureMemberPublicKey = async (
      memberId: string,
    ): Promise<void> => {
      if (memberPublicKeyCache.has(memberId)) return;
      // Validate the ID format first — parseSafe returns undefined for
      // malformed IDs instead of throwing.
      if (serviceProvider.idProvider.parseSafe(memberId) === undefined) {
        console.warn(
          `[ensureMemberPublicKey] parseSafe returned undefined for memberId="${memberId}"`,
        );
        throw new MissingPublicKeyError(memberId);
      }
      // Convert string memberId to Uint8Array for MemberStore lookup.
      const memberIdBytes = serviceProvider.idProvider.deserialize(memberId);
      const hexKey =
        await (context.memberStore as MemberStore).getMemberPublicKeyHex(memberIdBytes);
      if (!hexKey) {
        console.warn(
          `[ensureMemberPublicKey] getMemberPublicKeyHex returned null for memberId="${memberId}"`,
        );
        throw new MissingPublicKeyError(memberId);
      }
      memberPublicKeyCache.set(memberId, Buffer.from(hexKey, 'hex'));
    };

    // Expose the cache populator on the service container so that
    // controllers / middleware can pre-warm the cache before service
    // calls that wrap keys.
    context.services.register(
      'ensureMemberPublicKey',
      () => ensureMemberPublicKey,
    );

    // ── Block content store adapter for BrightChat ──────────────────
    // Creates a BlockContentStoreAdapter using a MessageCBLService stub
    // and a no-op gossip stub.
    const chatContentStore = new Map<string, Uint8Array>();
    const chatMessageCBL = {
      createMessage: async (
        content: Uint8Array,
        _sender: unknown,
        metadata: Record<string, unknown>,
      ) => {
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const magnetUrl = `magnet:?xt=urn:brightchain:${messageId}`;
        chatContentStore.set(magnetUrl, new Uint8Array(content));
        return {
          messageId,
          contentBlockIds: [] as string[],
          magnetUrl,
        };
      },
      getMessageMetadata: async () => null,
      getMessageContent: async (messageId: string): Promise<Uint8Array | null> => {
        return chatContentStore.get(messageId) ?? null;
      },
    } as unknown as MessageCBLService;

    const gossipStubForChat: IGossipService = {
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

    const blockContentStoreAdapter = new BlockContentStoreAdapter(
      chatMessageCBL,
      gossipStubForChat,
    );

    const conversationService = new ConversationService(
      null,
      undefined,
      chatStorageProvider,
      eciesKeyEncryptionHandler,
      undefined,
      blockContentStoreAdapter,
    );
    const groupService = new GroupService(
      permissionService,
      eciesKeyEncryptionHandler,
      undefined,
      undefined,
      undefined,
      chatStorageProvider,
      blockContentStoreAdapter,
    );
    const channelService = new ChannelService(
      permissionService,
      eciesKeyEncryptionHandler,
      undefined,
      undefined,
      undefined,
      chatStorageProvider,
      blockContentStoreAdapter,
    );

    // Wire group promotion handler so conversations can be promoted to groups
    conversationService.setGroupPromotionHandler(
      (conversationId, participants, newMemberIds, messages, requesterId) =>
        groupService.createGroupFromConversation(
          conversationId,
          participants,
          newMemberIds,
          messages,
          requesterId,
        ),
    );

    const serverService = new ServerService({
      channelService,
      storageProvider: chatStorageProvider,
    });

    context.services.register('permissionService', () => permissionService);
    context.services.register('blockContentStore', () => blockContentStoreAdapter);
    context.services.register('conversationService', () => conversationService);
    context.services.register('groupService', () => groupService);
    context.services.register('channelService', () => channelService);
    context.services.register('serverService', () => serverService);

    context.apiRouter.setConversationService(conversationService);
    context.apiRouter.setGroupService(groupService);
    context.apiRouter.setChannelService(channelService);
    context.apiRouter.setPermissionService(permissionService);
    context.apiRouter.setServerService(serverService);

    debugLog(
      context.environment.debug,
      'log',
      '[ ready ] BrightChat communication services initialized',
    );
  }
}
