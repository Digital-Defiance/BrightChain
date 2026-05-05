/**
 * Email Gateway Subsystem Plugin
 *
 * Starts the inbound email pipeline when GATEWAY_ENABLED=true:
 *
 * 1. **RecipientLookupService** — TCP socketmap server on the configured
 *    port (default 2526) that Postfix queries to validate recipients before
 *    accepting inbound mail.
 *
 * 2. **InboundProcessor** — watches the Maildir drop directory for new
 *    files deposited by Postfix, parses them, stores content in the Block
 *    Store, creates metadata via EmailMessageService, and announces
 *    delivery via the Gossip Protocol.
 *
 * The plugin is gated on the `GATEWAY_ENABLED` env var so that development
 * environments (which don't run Postfix) skip the gateway entirely.
 *
 * @see Requirements 4.4–4.9, 8.1–8.8, 13.1–13.7
 */

import type {
  IAppSubsystemPlugin,
  IGossipService,
  ISubsystemContext,
} from '@brightchain/brightchain-lib';
import { debugLog } from '@digitaldefiance/node-express-suite';
import type { Environment } from '../../environment';
import {
  EmailAttachmentVaultService,
  InboundProcessor,
  loadGatewayConfig,
  RecipientLookupService,
} from '../../services/emailGateway';
import type { IEmailAttachmentVaultService } from '../../services/emailGateway/emailAttachmentVaultService';
import type { IUserRegistry } from '../../services/emailGateway/recipientLookupService';
import type { MessagePassingService } from '../../services/messagePassingService';

/**
 * Email Gateway subsystem plugin.
 *
 * Bridges Postfix (SMTP) with BrightChain's internal messaging by running
 * the RecipientLookupService and InboundProcessor as part of the main
 * server process.
 *
 * @see Requirements 4.4, 4.5, 8.7, 13.1
 */
export class EmailGatewaySubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'email-gateway';
  public readonly isOptional = true;

  private recipientLookupService: RecipientLookupService | null = null;
  private inboundProcessor: InboundProcessor | null = null;

  public async initialize(context: ISubsystemContext): Promise<boolean> {
    const environment = context.environment as Environment;

    // Gate on GATEWAY_ENABLED env var.
    if (!environment.gatewayEnabled) {
      debugLog(
        environment.debug,
        'log',
        '[ skip ] Email Gateway disabled (GATEWAY_ENABLED is not true)',
      );
      return false;
    }

    const gatewayConfig = loadGatewayConfig();

    // ── RecipientLookupService ──────────────────────────────────────

    // Build a user registry that delegates to the member store, matching
    // the pattern used by EmailSubsystemPlugin for verify-recipient.
    const userRegistry: IUserRegistry = {
      hasUser: async (email: string): Promise<boolean> => {
        try {
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
    };

    this.recipientLookupService = new RecipientLookupService(
      gatewayConfig,
      userRegistry,
    );

    try {
      await this.recipientLookupService.start();
      debugLog(
        environment.debug,
        'log',
        `[ ready ] RecipientLookupService listening on 127.0.0.1:${gatewayConfig.recipientLookupPort}`,
      );
    } catch (err) {
      console.error(
        '[ error ] Failed to start RecipientLookupService:',
        err,
      );
      this.recipientLookupService = null;
      // Don't throw — the plugin is optional.
      return false;
    }

    // ── InboundProcessor ────────────────────────────────────────────

    // Retrieve the MessagePassingService registered by EmailSubsystemPlugin.
    let mps: MessagePassingService | undefined;
    try {
      mps = context.services.get<MessagePassingService>(
        'messagePassingService',
      );
    } catch {
      mps = undefined;
    }

    if (!mps) {
      console.warn(
        '[ warning ] MessagePassingService not available — InboundProcessor will not start. ' +
          'Ensure EmailSubsystemPlugin is registered before EmailGatewaySubsystemPlugin.',
      );
      return false;
    }

    // Build a no-op gossip stub for inbound processing (same pattern as
    // EmailSubsystemPlugin). Real gossip delivery is wired externally.
    const gossipStub: IGossipService = {
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

    this.inboundProcessor = new InboundProcessor(
      gatewayConfig,
      null, // use default EmailParser
      mps.getEmailService(),
      context.blockStore,
      gossipStub,
    );

    // ── Digital Burnbag vault service (optional) ─────────────────────
    // If the burnbag subsystem is loaded, wire up the attachment vault
    // service so that inbound email attachments are automatically stored
    // in a private per-email Digital Burnbag vault.
    let attachmentVaultService: IEmailAttachmentVaultService | undefined;
    try {
      const vaultContainerService = context.services.has(
        'burnbagVaultContainerService',
      )
        ? context.services.get('burnbagVaultContainerService')
        : undefined;
      const uploadService = context.services.has('burnbagUploadService')
        ? context.services.get('burnbagUploadService')
        : undefined;
      const parseId = context.services.has('burnbagParseId')
        ? context.services.get<(id: string) => unknown>('burnbagParseId')
        : undefined;

      if (vaultContainerService && uploadService && parseId) {
        attachmentVaultService = new EmailAttachmentVaultService(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          vaultContainerService as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          uploadService as any,
          parseId as (id: string) => never,
          (id: unknown) => String(id),
        );
        debugLog(
          environment.debug,
          'log',
          '[ ready ] EmailAttachmentVaultService wired for inbound email attachments',
        );
      } else {
        debugLog(
          environment.debug,
          'log',
          '[ skip ] Burnbag services not available — attachment vault disabled',
        );
      }
    } catch (vaultWireErr) {
      console.warn(
        '[ warning ] Failed to wire attachment vault service:',
        vaultWireErr,
      );
    }

    this.inboundProcessor = new InboundProcessor(
      gatewayConfig,
      null, // use default EmailParser
      mps.getEmailService(),
      context.blockStore,
      gossipStub,
      undefined, // authVerifier — use default
      attachmentVaultService,
      undefined, // recipientKeyLookup
      // Resolve email address → platform user ID for vault ownership.
      async (email: string): Promise<string | null> => {
        try {
          const byEmail = await context.memberStore.queryIndex({ email });
          if (byEmail.length > 0) {
            return String(byEmail[0].id);
          }
          // Fallback: try by username (local part)
          const username = email.split('@')[0];
          const byName = await context.memberStore.queryIndex({
            name: username,
          });
          if (byName.length > 0) {
            return String(byName[0].id);
          }
          return null;
        } catch {
          return null;
        }
      },
    );

    this.inboundProcessor.start();

    debugLog(
      environment.debug,
      'log',
      `[ ready ] InboundProcessor watching ${gatewayConfig.mailDropDirectory}`,
    );

    return true;
  }

  public async stop(): Promise<void> {
    if (this.inboundProcessor) {
      this.inboundProcessor.stop();
      this.inboundProcessor = null;
    }

    if (this.recipientLookupService) {
      await this.recipientLookupService.stop();
      this.recipientLookupService = null;
    }
  }
}
