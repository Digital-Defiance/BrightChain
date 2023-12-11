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

import type {
  BlockId,
  IBlockStore,
  IEmailAuthenticationResult,
  IEmailMetadata,
  IGossipService,
} from '@brightchain/brightchain-lib';
import { EmailMessageService, EmailParser } from '@brightchain/brightchain-lib';

import type { IEmailAuthVerifier } from './emailAuthVerifier';
import { EmailAuthVerifier } from './emailAuthVerifier';
import type { IEmailGatewayConfig } from './emailGatewayConfig';

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
      return;
    }

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
          // Small delay to allow the file to be fully written.
          setTimeout(() => {
            void this.processFile(filename);
          }, 100);
        }
      },
    );

    this.running = true;
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
    } catch {
      return;
    }
    for (const filename of entries) {
      const fullPath = path.join(this.config.mailDropDirectory, filename);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          void this.processFile(filename);
        }
      } catch {
        // Skip entries we cannot stat.
      }
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

    try {
      // 1. Read raw file content.
      const rawContent = fs.readFileSync(filePath);

      // 2. Parse RFC 5322 message via EmailParser (Req 4.6).
      const metadata: IEmailMetadata = await this.parser.parse(rawContent);

      // 2b. Verify SPF/DKIM/DMARC authentication results (Req 6.4).
      const authResult: IEmailAuthenticationResult =
        this.authVerifier.verify(rawContent);

      // 2c. Reject messages failing DMARC with reject policy (Req 6.5).
      if (EmailAuthVerifier.shouldRejectDmarc(authResult)) {
        throw new Error(
          `DMARC verification failed (550 reject): ${authResult.dmarc.details ?? 'policy=reject'}`,
        );
      }

      // 3. Store content in Block Store.
      const blockId = metadata.messageId as unknown as BlockId;
      await this.blockStore.put(blockId, rawContent);

      // 4. Create metadata via EmailMessageService (Req 4.6).
      //    We use sendEmail with the parsed metadata to go through the
      //    standard storage and delivery pipeline.
      const recipientAddresses = [
        ...metadata.to.map((m) => m.address),
        ...(metadata.cc ?? []).map((m) => m.address),
      ];

      await this.emailMessageService.sendEmail({
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
      });

      // 5. Announce to recipients via Gossip Protocol (Req 4.9).
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

      // 6. Delete processed file on success (Req 4.7).
      fs.unlinkSync(filePath);
    } catch (err) {
      // On failure: move to error directory and log reason (Req 4.8).
      const reason = err instanceof Error ? err.message : String(err);

      try {
        const errorPath = path.join(this.config.errorDirectory, filename);
        fs.renameSync(filePath, errorPath);
      } catch {
        // If we can't move the file, leave it in place — it won't be
        // reprocessed because it's already in processedFiles.
      }

      // Log the failure reason.
      console.error(
        `[InboundProcessor] Failed to process ${filename}: ${reason}`,
      );

      // Remove from processedFiles so a retry can be attempted if the
      // file is re-deposited.
      this.processedFiles.delete(filename);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

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
