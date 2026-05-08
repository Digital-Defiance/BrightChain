/**
 * InboundProcessor — watches the Mail Drop Directory for new Maildir-format
 * files deposited by Postfix, parses each message via EmailParser, stores
 * content in the Block Store, creates metadata via EmailMessageService, and
 * announces delivery to the recipient via the Gossip Protocol.
 *
 * On success the processed file is deleted from the Mail Drop Directory.
 * On failure the file is moved to a configurable error directory and the
 * failure reason is logged.
 *
 * A Set of processed filenames provides idempotency — the same file will
 * not be processed twice even if the watcher fires duplicate events.
 *
 * @see Requirements 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 * @module inboundProcessor
 */

import * as fs from 'fs';
import * as path from 'path';

import { sha3_512 } from '@noble/hashes/sha3';

import type {
  BlockId,
  IBlockStore,
  IEmailAuthenticationResult,
  IEmailMetadata,
  IGossipService,
  ISpamThresholds,
} from '@brightchain/brightchain-lib';
import {
  asBlockId,
  brightDateToDate,
  EmailEncryptionService,
  EmailMessageService,
  EmailParser,
  MessageEncryptionScheme,
  SpamClassification,
} from '@brightchain/brightchain-lib';

import type {
  IEmailAttachment,
  IEmailAttachmentVaultService,
} from './emailAttachmentVaultService';
import type { IEmailAuthVerifier } from './emailAuthVerifier';
import { EmailAuthVerifier } from './emailAuthVerifier';
import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IRecipientKeyLookup } from './recipientKeyLookup';

// ─── InboundProcessor ───────────────────────────────────────────────────────

/**
 * Watches the Mail Drop Directory for new inbound email files and processes
 * them into the BrightChain internal messaging system.
 *
 * Processing pipeline per file:
 * 1. Read raw file content
 * 2. Parse RFC 5322 message via EmailParser
 * 3. Store content in Block Store
 * 4. Create metadata via EmailMessageService
 * 5. Announce to recipient via Gossip Protocol
 * 6. Delete file on success / move to error directory on failure
 *
 * @see Requirements 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */
export class InboundProcessor {
  private readonly parser: EmailParser;

  /** Authentication verifier for SPF/DKIM/DMARC. Req 6.4, 6.5 */
  private readonly authVerifier: IEmailAuthVerifier;

  /** fs.watch handle — `null` when stopped. */
  private watcher: fs.FSWatcher | null = null;

  /** Whether the processor is currently running. */
  private running = false;

  /** Filenames that have already been processed (idempotency guard). Req 4.7 */
  private readonly processedFiles: Set<string> = new Set();

  constructor(
    private readonly config: IEmailGatewayConfig,
    emailParser: EmailParser | null,
    private readonly emailMessageService: EmailMessageService,
    private readonly blockStore: IBlockStore,
    private readonly gossipService: IGossipService,
    authVerifier?: IEmailAuthVerifier,
    private readonly vaultService?: IEmailAttachmentVaultService,
    private readonly recipientKeyLookup?: IRecipientKeyLookup,
    private readonly resolveUserIdByEmail?: (
      email: string,
    ) => Promise<string | null>,
  ) {
    this.parser = emailParser ?? new EmailParser();
    this.authVerifier = authVerifier ?? new EmailAuthVerifier();
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────

  /**
   * Start watching the Mail Drop Directory for new files.
   *
   * Creates the mail drop and error directories if they do not exist,
   * then sets up an `fs.watch` listener that triggers processing for
   * every new or renamed file.
   *
   * @see Requirement 4.5 — watch via inotify / fs.watch
   */
  start(): void {
    if (this.running) {
      console.info(
        '[InboundProcessor] start() called but already running — no-op',
      );
      return;
    }

    console.info(
      `[InboundProcessor] Starting — mailDropDir=${this.config.mailDropDirectory} errorDir=${this.config.errorDirectory}`,
    );

    // Ensure directories exist.
    fs.mkdirSync(this.config.mailDropDirectory, { recursive: true });
    fs.mkdirSync(this.config.errorDirectory, { recursive: true });

    // Process any files already present in the directory.
    this.processExistingFiles();

    // Watch for new files.
    this.watcher = fs.watch(
      this.config.mailDropDirectory,
      (eventType, filename) => {
        if (filename && (eventType === 'rename' || eventType === 'change')) {
          // Skip hidden .tmp.* files — these are partial writes from brightchain-maildrop.
          // The watcher will fire again with the final filename once mv completes.
          if (filename.startsWith('.tmp.')) {
            return;
          }
          console.info(
            `[InboundProcessor] fs.watch event: type=${eventType} file=${filename}`,
          );
          // Small delay to allow the file to be fully written.
          setTimeout(() => {
            void this.processFile(filename);
          }, 100);
        } else {
          console.warn(
            `[InboundProcessor] fs.watch event ignored: type=${eventType} filename=${String(filename)}`,
          );
        }
      },
    );

    this.watcher.on('error', (err: Error) => {
      console.error(
        `[InboundProcessor] fs.watch error on ${this.config.mailDropDirectory}: ${err.message}`,
      );
    });

    this.running = true;
    console.info(
      `[InboundProcessor] Started — watching ${this.config.mailDropDirectory}`,
    );
  }

  /**
   * Stop watching the Mail Drop Directory.
   */
  stop(): void {
    if (!this.running) {
      return;
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.running = false;
    console.info('[InboundProcessor] Stopped');
  }

  /**
   * Whether the processor is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // ─── File Processing ────────────────────────────────────────────────

  /**
   * Process all files already present in the Mail Drop Directory.
   * Called once on startup to handle files deposited while the processor
   * was not running.
   */
  private processExistingFiles(): void {
    let entries: string[];
    try {
      entries = fs.readdirSync(this.config.mailDropDirectory);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(
        `[InboundProcessor] Failed to read mailDropDirectory on startup: ${reason}`,
      );
      return;
    }
    const files = entries.filter((name) => {
      // Skip hidden .tmp.* files — partial writes from brightchain-maildrop.
      if (name.startsWith('.tmp.')) {
        return false;
      }
      try {
        return fs
          .statSync(path.join(this.config.mailDropDirectory, name))
          .isFile();
      } catch {
        return false;
      }
    });
    console.info(
      `[InboundProcessor] processExistingFiles: found ${files.length} file(s) in ${this.config.mailDropDirectory}`,
    );
    for (const filename of files) {
      void this.processFile(filename);
    }
  }

  /**
   * Process a single inbound email file.
   *
   * Idempotency: if the file has already been processed (tracked in
   * `processedFiles`) the call is a no-op. Req 4.7
   *
   * @param filename - The filename (not full path) within the Mail Drop Directory
   *
   * @see Requirement 4.6 — parse, store, create metadata
   * @see Requirement 4.7 — delete on success
   * @see Requirement 4.8 — move to error directory on failure
   * @see Requirement 4.9 — announce via gossip
   */
  async processFile(filename: string): Promise<void> {
    // Idempotency guard (Req 4.7).
    if (this.processedFiles.has(filename)) {
      return;
    }

    const filePath = path.join(this.config.mailDropDirectory, filename);

    // Verify the file still exists (it may have been removed between
    // the watcher event and this handler running).
    if (!fs.existsSync(filePath)) {
      return;
    }

    // Mark as in-progress immediately to prevent duplicate processing
    // from concurrent watcher events.
    this.processedFiles.add(filename);

    console.info(`[InboundProcessor] Discovered file: ${filename}`);

    try {
      // 1. Read raw file content.
      const rawContent = fs.readFileSync(filePath);
      console.info(
        `[InboundProcessor] Read ${rawContent.length} bytes from ${filename}`,
      );

      // 2. Parse RFC 5322 message via EmailParser (Req 4.6).
      const metadata: IEmailMetadata = await this.parser.parse(rawContent);
      const toAddresses = metadata.to.map((m) => m.address).join(', ');
      console.info(
        `[InboundProcessor] Parsed message ${metadata.messageId} ` +
          `from=${metadata.from.address} to=[${toAddresses}] ` +
          `subject="${metadata.subject ?? '(none)'}"`,
      );

      // 2b. Verify SPF/DKIM/DMARC authentication results (Req 6.4).
      const authResult: IEmailAuthenticationResult =
        this.authVerifier.verify(rawContent);
      console.info(
        `[InboundProcessor] Auth results for ${metadata.messageId}: ` +
          `spf=${authResult.spf.status} dkim=${authResult.dkim.status} dmarc=${authResult.dmarc.status}`,
      );

      // 2c. Reject messages failing DMARC with reject policy (Req 6.5).
      if (EmailAuthVerifier.shouldRejectDmarc(authResult)) {
        throw new Error(
          `DMARC verification failed (550 reject): ${authResult.dmarc.details ?? 'policy=reject'}`,
        );
      }

      // 3. Resolve recipient public keys for at-rest encryption (Req 16.1).
      const recipientAddressesForKeys = [
        ...metadata.to.map((m) => m.address),
        ...(metadata.cc ?? []).map((m) => m.address),
      ];
      const recipientPublicKeys = new Map<string, Uint8Array>();
      if (this.recipientKeyLookup) {
        for (const addr of recipientAddressesForKeys) {
          const pubKey =
            await this.recipientKeyLookup.getPublicKeyForEmail(addr);
          if (pubKey) {
            recipientPublicKeys.set(addr, pubKey);
          }
        }
      }

      // Encrypt raw email bytes when at least one recipient key is available.
      let contentToStore: Buffer = rawContent;
      let encryptionParams:
        | {
            encryptionScheme: MessageEncryptionScheme;
            recipientPublicKeys: Map<string, Uint8Array>;
          }
        | undefined;
      if (recipientPublicKeys.size > 0) {
        const encSvc = new EmailEncryptionService();
        const encResult = await encSvc.encryptForRecipients(
          new Uint8Array(rawContent),
          recipientPublicKeys,
        );
        contentToStore = Buffer.from(encResult.encryptedContent);
        encryptionParams = {
          encryptionScheme: MessageEncryptionScheme.RECIPIENT_KEYS,
          recipientPublicKeys,
        };
        console.info(
          `[InboundProcessor] Encrypted message ${metadata.messageId} ` +
            `for ${recipientPublicKeys.size} recipient(s)`,
        );
      }

      // Store content in Block Store (encrypted when keys were available).
      // Derive a content-addressable block ID by SHA3-512 hashing the raw
      // email bytes — the message ID is not a valid hex checksum.
      const blockId: BlockId = asBlockId(
        Buffer.from(sha3_512(rawContent)).toString('hex'),
      );
      await this.blockStore.put(blockId, contentToStore);
      console.info(
        `[InboundProcessor] Stored message ${metadata.messageId} in Block Store (blockId=${String(blockId)})`,
      );

      // 3b. Optionally upload attachments to a Digital Burnbag private vault.
      // This is best-effort: failures are logged but do NOT block email delivery.
      let vaultContainerId: string | undefined;
      const rawAttachments = metadata.attachments?.filter(
        (a) => a.content !== undefined,
      );
      const attachmentInputs: Array<{
        filename: string;
        mimeType: string;
        content: Uint8Array;
        contentId?: string;
        inline?: boolean;
        vaultFileId?: string;
      }> =
        rawAttachments?.map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          content: a.content as Uint8Array,
          contentId: a.contentId,
          inline: a.contentId !== undefined,
        })) ?? [];

      if (this.vaultService && attachmentInputs.length > 0) {
        try {
          const vaultAttachments: IEmailAttachment[] = attachmentInputs.map(
            (a) => ({
              filename: a.filename,
              mimeType: a.mimeType,
              content: a.content,
            }),
          );
          // Vault is owned by the first recipient so only they can access it.
          // Resolve the email address to a platform user ID.
          const recipientEmail =
            metadata.to[0]?.address ?? metadata.from.address;
          let vaultOwnerId: string | null = null;
          if (this.resolveUserIdByEmail) {
            vaultOwnerId = await this.resolveUserIdByEmail(recipientEmail);
          }
          if (!vaultOwnerId) {
            throw new Error(
              `Cannot resolve user ID for vault owner: ${recipientEmail}`,
            );
          }
          const vaultResult = await this.vaultService.createVaultForEmail(
            metadata.messageId,
            metadata.subject,
            brightDateToDate(metadata.date),
            vaultOwnerId,
            vaultAttachments,
          );
          vaultContainerId = vaultResult.vaultContainerId;
          // Map vaultFileId back onto each attachment by filename.
          for (const att of attachmentInputs) {
            const match = vaultResult.files.find(
              (f) => f.filename === att.filename,
            );
            if (match) {
              att.vaultFileId = match.vaultFileId;
            }
          }
          console.info(
            `[InboundProcessor] Created vault ${vaultContainerId} for message ${metadata.messageId} ` +
              `(${vaultResult.files.length} file(s))`,
          );
        } catch (vaultErr) {
          const reason =
            vaultErr instanceof Error ? vaultErr.message : String(vaultErr);
          console.warn(
            `[InboundProcessor] Vault upload failed for ${metadata.messageId}: ${reason}`,
          );
        }
      }

      // 4. Store metadata via EmailMessageService (Req 4.6).
      //    Use receiveEmail() instead of sendEmail() so that the inbound
      //    message is stored in the metadata store WITHOUT triggering the
      //    external-dispatch pipeline (SES). Calling sendEmail() here caused
      //    a relay loop: the stored email was re-delivered to the same
      //    address via SES → Postfix → InboundProcessor → sendEmail() → loop.
      const recipientAddresses = [
        ...metadata.to.map((m) => m.address),
        ...(metadata.cc ?? []).map((m) => m.address),
      ];

      console.info(
        `[InboundProcessor] Registering message ${metadata.messageId} via EmailMessageService ` +
          `(recipients: [${recipientAddresses.join(', ')}])`,
      );
      await this.emailMessageService.receiveEmail({
        from: metadata.from,
        to: metadata.to,
        cc: metadata.cc,
        bcc: metadata.bcc,
        subject: metadata.subject,
        messageId: metadata.messageId,
        date: metadata.date,
        inReplyTo: metadata.inReplyTo,
        references: metadata.references,
        contentType: metadata.contentType,
        parts: metadata.parts,
        textBody: this.extractTextBody(metadata),
        htmlBody: this.extractHtmlBody(metadata),
        customHeaders: this.mergeAuthHeaders(
          metadata.customHeaders,
          authResult,
        ),
        vaultContainerId,
        attachments: attachmentInputs.length > 0 ? attachmentInputs : undefined,
        ...this.extractSpamInfo(
          metadata.customHeaders,
          this.config.spamThresholds,
        ),
        ...(encryptionParams ?? {}),
      });
      console.info(
        `[InboundProcessor] EmailMessageService accepted message ${metadata.messageId}`,
      );

      // 5. Announce to recipients via Gossip Protocol (Req 4.9).
      console.info(
        `[InboundProcessor] Announcing message ${metadata.messageId} to gossip ` +
          `(${recipientAddresses.length} recipient(s))`,
      );
      await this.gossipService.announceMessage(
        metadata.cblBlockIds ?? [blockId],
        {
          messageId: metadata.messageId,
          recipientIds: recipientAddresses,
          priority: 'normal',
          blockIds: metadata.cblBlockIds ?? [blockId],
          cblBlockId: metadata.blockId ?? blockId,
          ackRequired: true,
        },
      );
      console.info(
        `[InboundProcessor] Gossip announcement sent for message ${metadata.messageId}`,
      );

      // 6. Delete processed file on success (Req 4.7).
      fs.unlinkSync(filePath);
      console.info(
        `[InboundProcessor] Successfully processed and deleted ${filename}`,
      );
    } catch (err) {
      // On failure: move to error directory and log reason (Req 4.8).
      const reason = err instanceof Error ? err.message : String(err);

      try {
        const errorPath = path.join(this.config.errorDirectory, filename);
        fs.renameSync(filePath, errorPath);
        console.error(
          `[InboundProcessor] Failed to process ${filename}: ${reason} — moved to error directory`,
        );
      } catch (moveErr) {
        const moveReason =
          moveErr instanceof Error ? moveErr.message : String(moveErr);
        // If we can't move the file, leave it in place — it won't be
        // reprocessed because it's already in processedFiles.
        console.error(
          `[InboundProcessor] Failed to process ${filename}: ${reason} — also failed to move to error directory: ${moveReason}`,
        );
      }

      // Remove from processedFiles so a retry can be attempted if the
      // file is re-deposited.
      this.processedFiles.delete(filename);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  /**
   * Extract spam score, classification, and target folder from
   * SpamAssassin `X-Spam-Score` / `X-Spam-Status` headers.
   *
   * Scores below `probableSpamScore` → Ham + 'inbox'.
   * Scores >= `probableSpamScore`   → ProbableSpam + 'spam'.
   * Scores >= `definiteSpamScore`   → DefiniteSpam + 'spam'.
   * (DefiniteSpam is normally rejected by spamass-milter at SMTP; this
   * handles the rare case a message arrives despite that.)
   */
  private extractSpamInfo(
    customHeaders: Map<string, string[]>,
    thresholds: ISpamThresholds,
  ): {
    spamScore: number;
    spamClassification: SpamClassification;
    folder: string;
  } {
    let spamScore = 0;

    const scoreKey = [...customHeaders.keys()].find(
      (k) => k.toLowerCase() === 'x-spam-score',
    );
    if (scoreKey) {
      spamScore = parseFloat(customHeaders.get(scoreKey)?.[0] ?? '0') || 0;
    } else {
      // Fall back to parsing "X-Spam-Status: Yes, score=6.5 required=5.0 ..."
      const statusKey = [...customHeaders.keys()].find(
        (k) => k.toLowerCase() === 'x-spam-status',
      );
      if (statusKey) {
        const raw = customHeaders.get(statusKey)?.[0] ?? '';
        const match = /score=([0-9.]+)/i.exec(raw);
        if (match) spamScore = parseFloat(match[1]) || 0;
      }
    }

    if (spamScore >= thresholds.definiteSpamScore) {
      return {
        spamScore,
        spamClassification: SpamClassification.DefiniteSpam,
        folder: 'spam',
      };
    }
    if (spamScore >= thresholds.probableSpamScore) {
      return {
        spamScore,
        spamClassification: SpamClassification.ProbableSpam,
        folder: 'spam',
      };
    }
    return {
      spamScore,
      spamClassification: SpamClassification.Ham,
      folder: 'inbox',
    };
  }

  /**
   * Merge authentication results into custom headers as a serialized
   * `X-BrightChain-Auth-Results` header so the auth metadata is
   * preserved alongside the message.
   *
   * @see Requirement 6.4
   */
  private mergeAuthHeaders(
    existing: Map<string, string[]>,
    authResult: IEmailAuthenticationResult,
  ): Map<string, string[]> {
    const merged = new Map(existing);
    const summary = [
      `spf=${authResult.spf.status}`,
      `dkim=${authResult.dkim.status}`,
      `dmarc=${authResult.dmarc.status}`,
    ].join('; ');
    merged.set('X-BrightChain-Auth-Results', [summary]);
    return merged;
  }

  /**
   * Extract plain-text body from parsed email metadata.
   */
  private extractTextBody(metadata: IEmailMetadata): string | undefined {
    if (metadata.parts && metadata.parts.length > 0) {
      for (const part of metadata.parts) {
        if (
          part.contentType?.type === 'text' &&
          part.contentType?.subtype === 'plain' &&
          part.body
        ) {
          return typeof part.body === 'string'
            ? part.body
            : new TextDecoder().decode(part.body);
        }
      }
    }
    return undefined;
  }

  /**
   * Extract HTML body from parsed email metadata.
   */
  private extractHtmlBody(metadata: IEmailMetadata): string | undefined {
    if (metadata.parts && metadata.parts.length > 0) {
      for (const part of metadata.parts) {
        if (
          part.contentType?.type === 'text' &&
          part.contentType?.subtype === 'html' &&
          part.body
        ) {
          return typeof part.body === 'string'
            ? part.body
            : new TextDecoder().decode(part.body);
        }
      }
    }
    return undefined;
  }

  /**
   * Get the set of processed filenames (for testing / inspection).
   */
  getProcessedFiles(): ReadonlySet<string> {
    return this.processedFiles;
  }

  /**
   * Clear the processed files set (for testing).
   */
  clearProcessedFiles(): void {
    this.processedFiles.clear();
  }
}
