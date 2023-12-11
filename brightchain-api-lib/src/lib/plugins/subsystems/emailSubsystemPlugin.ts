import {
  MemoryMessageMetadataStore,
  type IAppSubsystemPlugin,
  type IGossipService,
  type IMailbox,
  type ISubsystemContext,
  type MessageCBLService,
} from '@brightchain/brightchain-lib';
import {
  debugLog,
  IEmailService,
  isBatchEmailService,
  ServiceKeys,
} from '@digitaldefiance/node-express-suite';
import {
  BrightDbEmailMetadataStore,
  BRIGHTMAIL_ATTACHMENTS_COLLECTION,
  BRIGHTMAIL_EMAILS_COLLECTION,
  BRIGHTMAIL_READ_TRACKING_COLLECTION,
} from '../../services/brightmail/brightDbEmailMetadataStore';
import { MessagePassingService } from '../../services/messagePassingService';

/**
 * Format a mailbox into an RFC 5322 address: `Display Name <local@domain>`
 * when a display name is present, otherwise just `local@domain`.
 */
function formatMailbox(mailbox: IMailbox): string {
  return mailbox.displayName
    ? `${mailbox.displayName} <${mailbox.address}>`
    : mailbox.address;
}

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
      // The gossip delivery path is a no-op stub. All recipients — including
      // those whose domain matches emailDomain — must be relayed through the
      // external SMTP dispatcher (SES / Postfix) so they actually receive mail.
      relayAllRecipientsExternally: true,
    });

    // Wire outbound delivery for all recipients to the configured
    // IEmailService (Fake/Dummy/Postfix/SES). With relayAllRecipientsExternally
    // enabled, @<emailDomain> addresses are also forwarded to the dispatcher.
    let outboundEmailService: IEmailService | undefined;
    try {
      outboundEmailService = context.services.get<IEmailService>(
        ServiceKeys.EMAIL,
      );
    } catch {
      outboundEmailService = undefined;
    }
    if (outboundEmailService) {
      const transport = outboundEmailService;
      const supportsBatch = isBatchEmailService(transport);
      mps.setExternalEmailDispatcher(
        async ({
          messageId,
          from,
          externalTo,
          externalCc,
          externalBcc,
          subject,
          textBody,
          htmlBody,
        }) => {
          const text = textBody ?? '';
          const html = htmlBody ?? text;
          const toAddrs = externalTo.map(formatMailbox);
          const ccAddrs = externalCc.map(formatMailbox);
          const bccAddrs = externalBcc.map(formatMailbox);
          // RFC 5322 mailbox for the SES `Source` (envelope MAIL FROM and
          // `From:` header). The dispatcher always carries an authoritative
          // `from` derived server-side from the authenticated user, so we
          // forward it verbatim. Transports that don't accept a `from`
          // override (legacy IEmailService implementations) will fall back
          // to their configured sender.
          const fromAddr = formatMailbox(from);

          if (supportsBatch) {
            try {
              await transport.sendEmailBatch({
                from: fromAddr,
                to: toAddrs,
                cc: ccAddrs,
                bcc: bccAddrs,
                subject,
                text,
                html,
              } as Parameters<typeof transport.sendEmailBatch>[0]);

              console.log(
                `[email] outbound relay (batch): messageId=${messageId} from=${fromAddr} to=${toAddrs.length} cc=${ccAddrs.length} bcc=${bccAddrs.length} subject="${subject}"`,
              );
            } catch (err) {
              console.error(
                `[email] outbound batch relay failed: messageId=${messageId}:`,
                err,
              );
            }
            return;
          }

          // Legacy IEmailService — single-recipient API. Fan out per address.
          // Privacy note: BCC recipients receive a separate per-recipient
          // send, so they are not exposed to To/CC. To/CC recipients each
          // get their own send too (legacy transports do not preserve
          // visible-recipient grouping).
          const allAddrs = [...toAddrs, ...ccAddrs, ...bccAddrs];
          for (const addr of allAddrs) {
            try {
              // Pass `fromAddr` as the optional 5th arg; transports that
              // don't accept it will simply ignore the extra parameter
              // (TypeScript widens via the cast below for backwards-compat
              // with the upstream IEmailService signature).
              await (
                transport.sendEmail as (
                  to: string,
                  subject: string,
                  text: string,
                  html: string,
                  from?: string,
                ) => Promise<void>
              )(addr, subject, text, html, fromAddr);

              console.log(
                `[email] outbound relay: messageId=${messageId} from=${fromAddr} to=${addr} subject="${subject}"`,
              );
            } catch (err) {
              console.error(
                `[email] outbound relay failed: messageId=${messageId} to=${addr}:`,
                err,
              );
            }
          }
        },
      );
    } else {
      debugLog(
        context.environment.debug,
        'warn',
        '[ warning ] no IEmailService registered; external email recipients will not be delivered',
      );
    }

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
