/**
 * In-Memory Email Metadata Store
 *
 * Implements IEmailMetadataStore with in-memory storage for email metadata.
 * Provides filtering, sorting, pagination, read tracking, and full-text search.
 *
 * @see Requirement 13.1 - Inbox query for To, Cc, or Bcc recipients
 * @see Requirement 13.2 - Sort by Date header (newest first by default)
 * @see Requirement 13.3 - Filter by read/unread, sender, date range, etc.
 * @see Requirement 13.4 - Full-text search across subject and body
 * @see Requirement 13.6 - Pagination with configurable page size
 * @see Requirement 13.7 - Sort by date, sender, subject, size
 * @see Requirement 13.8 - Track and return unread count
 */

import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import type {
  IEmailMetadataStore,
  IInboxQuery,
  IInboxResult,
} from './emailMessageService';

export class InMemoryEmailMetadataStore implements IEmailMetadataStore {
  private readonly emails = new Map<string, IEmailMetadata>();
  /** Set of "messageId::userId" keys for read tracking */
  private readonly readSet = new Set<string>();
  /** Attachment content keyed by checksum */
  private readonly attachmentContents = new Map<string, Uint8Array>();

  async store(metadata: IEmailMetadata): Promise<void> {
    this.emails.set(metadata.messageId, metadata);
  }

  async get(messageId: string): Promise<IEmailMetadata | null> {
    return this.emails.get(messageId) ?? null;
  }

  async delete(messageId: string): Promise<void> {
    this.emails.delete(messageId);
  }

  async update(
    messageId: string,
    updates: Partial<IEmailMetadata>,
  ): Promise<void> {
    const existing = this.emails.get(messageId);
    if (existing) {
      this.emails.set(messageId, { ...existing, ...updates });
    }
  }

  /**
   * Query emails for a user's inbox.
   *
   * Returns emails where the user (identified by email address) is a
   * To, Cc, or Bcc recipient. Supports filtering, sorting, and pagination.
   *
   * @see Requirement 13.1 - Inbox query for To, Cc, or Bcc recipients
   */
  async queryInbox(userId: string, query: IInboxQuery): Promise<IInboxResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const sortBy = query.sortBy ?? 'date';
    const sortDirection = query.sortDirection ?? 'desc';

    // 1. Filter: only emails where userId is a recipient
    let results = Array.from(this.emails.values()).filter((email) =>
      this.isRecipient(email, userId),
    );

    // 2. Apply filters
    results = this.applyFilters(results, query, userId);

    // Count unread among filtered results
    const unreadCount = results.filter(
      (e) => !this.readSet.has(this.readKey(e.messageId, userId)),
    ).length;

    // 3. Sort
    results = this.sortEmails(results, sortBy, sortDirection);

    // 4. Paginate
    const totalCount = results.length;
    const startIndex = (page - 1) * pageSize;
    const pageEmails = results.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < totalCount;

    return {
      emails: pageEmails,
      totalCount,
      unreadCount,
      page,
      pageSize,
      hasMore,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    let count = 0;
    for (const email of this.emails.values()) {
      if (
        this.isRecipient(email, userId) &&
        !this.readSet.has(this.readKey(email.messageId, userId))
      ) {
        count++;
      }
    }
    return count;
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    this.readSet.add(this.readKey(messageId, userId));
  }

  async getThread(messageId: string): Promise<IEmailMetadata[]> {
    // Collect all emails in the thread by following References
    const startEmail = this.emails.get(messageId);
    if (!startEmail) return [];

    const knownIds = new Set<string>();
    const toVisit: string[] = [startEmail.messageId];
    if (startEmail.references) {
      for (const ref of startEmail.references) toVisit.push(ref);
    }
    if (startEmail.inReplyTo) toVisit.push(startEmail.inReplyTo);

    while (toVisit.length > 0) {
      const id = toVisit.pop()!;
      if (knownIds.has(id)) continue;
      knownIds.add(id);
      const email = this.emails.get(id);
      if (email) {
        if (email.references) {
          for (const ref of email.references) {
            if (!knownIds.has(ref)) toVisit.push(ref);
          }
        }
        if (email.inReplyTo && !knownIds.has(email.inReplyTo)) {
          toVisit.push(email.inReplyTo);
        }
      }
    }

    // Also find emails that reference any of the known IDs
    for (const email of this.emails.values()) {
      if (knownIds.has(email.messageId)) continue;
      if (email.inReplyTo && knownIds.has(email.inReplyTo)) {
        knownIds.add(email.messageId);
      }
      if (email.references?.some((ref) => knownIds.has(ref))) {
        knownIds.add(email.messageId);
      }
    }

    const threadEmails: IEmailMetadata[] = [];
    for (const id of knownIds) {
      const email = this.emails.get(id);
      if (email) threadEmails.push(email);
    }

    // Sort chronologically
    threadEmails.sort((a, b) => a.date.getTime() - b.date.getTime());
    return threadEmails;
  }

  async getRootMessage(messageId: string): Promise<IEmailMetadata | null> {
    const email = this.emails.get(messageId);
    if (!email) return null;

    if (email.references && email.references.length > 0) {
      const rootId = email.references[0];
      return this.emails.get(rootId) ?? null;
    }

    if (email.inReplyTo) {
      const parent = this.emails.get(email.inReplyTo);
      if (parent) return this.getRootMessage(parent.messageId);
    }

    return email;
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  private readKey(messageId: string, userId: string): string {
    return `${messageId}::${userId}`;
  }

  /**
   * Check if userId (email address) is a To, Cc, or Bcc recipient.
   */
  private isRecipient(email: IEmailMetadata, userId: string): boolean {
    const lower = userId.toLowerCase();
    if (email.to?.some((m) => m.address.toLowerCase() === lower)) return true;
    if (email.cc?.some((m) => m.address.toLowerCase() === lower)) return true;
    if (email.bcc?.some((m) => m.address.toLowerCase() === lower)) return true;
    return false;
  }

  private applyFilters(
    emails: IEmailMetadata[],
    query: IInboxQuery,
    userId: string,
  ): IEmailMetadata[] {
    let results = emails;

    // Read/unread filter
    if (query.readStatus === 'read') {
      results = results.filter((e) =>
        this.readSet.has(this.readKey(e.messageId, userId)),
      );
    } else if (query.readStatus === 'unread') {
      results = results.filter(
        (e) => !this.readSet.has(this.readKey(e.messageId, userId)),
      );
    }

    // Sender filter
    if (query.senderAddress) {
      const senderLower = query.senderAddress.toLowerCase();
      results = results.filter(
        (e) => e.from.address.toLowerCase() === senderLower,
      );
    }

    // Date range filter
    if (query.dateFrom) {
      const from = query.dateFrom.getTime();
      results = results.filter((e) => e.date.getTime() >= from);
    }
    if (query.dateTo) {
      const to = query.dateTo.getTime();
      results = results.filter((e) => e.date.getTime() <= to);
    }

    // Has attachments filter
    if (query.hasAttachments !== undefined) {
      results = results.filter((e) => {
        const has = e.attachments !== undefined && e.attachments.length > 0;
        return query.hasAttachments ? has : !has;
      });
    }

    // Subject contains filter
    if (query.subjectContains) {
      const needle = query.subjectContains.toLowerCase();
      results = results.filter(
        (e) =>
          e.subject !== undefined && e.subject.toLowerCase().includes(needle),
      );
    }

    // Full-text search across subject and body
    if (query.searchText) {
      const needle = query.searchText.toLowerCase();
      results = results.filter((e) => this.matchesSearch(e, needle));
    }

    return results;
  }

  /**
   * Full-text search: checks subject and body content (text parts).
   * @see Requirement 13.4
   */
  private matchesSearch(email: IEmailMetadata, needle: string): boolean {
    // Check subject
    if (email.subject && email.subject.toLowerCase().includes(needle)) {
      return true;
    }

    // Check body parts for text content
    if (email.parts) {
      for (const part of email.parts) {
        if (this.partContainsText(part, needle)) return true;
      }
    }

    return false;
  }

  private partContainsText(
    part: {
      contentType: { type: string };
      body?: Uint8Array;
      parts?: Array<{
        contentType: { type: string };
        body?: Uint8Array;
        parts?: unknown[];
      }>;
    },
    needle: string,
  ): boolean {
    if (part.contentType.type === 'text' && part.body) {
      const text = new TextDecoder().decode(part.body).toLowerCase();
      if (text.includes(needle)) return true;
    }
    if (part.parts) {
      for (const sub of part.parts) {
        if (this.partContainsText(sub as typeof part, needle)) return true;
      }
    }
    return false;
  }

  private sortEmails(
    emails: IEmailMetadata[],
    sortBy: string,
    direction: string,
  ): IEmailMetadata[] {
    const dir = direction === 'asc' ? 1 : -1;
    return [...emails].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return dir * (a.date.getTime() - b.date.getTime());
        case 'sender':
          return dir * a.from.address.localeCompare(b.from.address);
        case 'subject':
          return dir * (a.subject ?? '').localeCompare(b.subject ?? '');
        case 'size':
          return dir * ((a.size ?? 0) - (b.size ?? 0));
        default:
          return dir * (a.date.getTime() - b.date.getTime());
      }
    });
  }

  /** Check if a user has read a specific email */
  isRead(messageId: string, userId: string): boolean {
    return this.readSet.has(this.readKey(messageId, userId));
  }

  /** Get total stored email count (for testing) */
  get count(): number {
    return this.emails.size;
  }

  // ─── Attachment Content Storage ─────────────────────────────────────

  async storeAttachmentContent(
    key: string,
    content: Uint8Array,
  ): Promise<void> {
    this.attachmentContents.set(key, content);
  }

  async getAttachmentContent(key: string): Promise<Uint8Array | null> {
    return this.attachmentContents.get(key) ?? null;
  }
}
