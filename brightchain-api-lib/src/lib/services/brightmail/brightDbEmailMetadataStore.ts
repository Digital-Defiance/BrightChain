/**
 * BrightDb-backed Email Metadata Store
 *
 * Implements IEmailMetadataStore by delegating to a BrightDb DocumentCollection.
 * This replaces InMemoryEmailMetadataStore so that email metadata is persisted
 * through the single BrightDb instance and visible to admin controllers.
 *
 * Collection name: `brightmail_emails`
 * Attachment collection name: `brightmail_attachments`
 *
 * Follows the same adapter pattern as ChatCollectionAdapter in
 * brightchain-api-lib/src/lib/services/brightchat/chatStorageAdapter.ts
 *
 * @see Requirement 2.12 - Email metadata backed by BrightDb
 * @see Requirement 3.11 - IEmailMetadataStore contract preserved
 */

import type { IEmailMetadata } from '@brightchain/brightchain-lib';
import type {
  IEmailMetadataStore,
  IInboxQuery,
  IInboxResult,
} from '@brightchain/brightchain-lib';
import type {
  DocumentCollection,
  DocumentRecord,
} from '../../datastore/document-store';

/** Collection name for email metadata in BrightDb. */
export const BRIGHTMAIL_EMAILS_COLLECTION = 'brightmail_emails';

/** Collection name for attachment binary content in BrightDb. */
export const BRIGHTMAIL_ATTACHMENTS_COLLECTION = 'brightmail_attachments';

/** Collection name for read-tracking in BrightDb. */
export const BRIGHTMAIL_READ_TRACKING_COLLECTION = 'brightmail_read_tracking';

/**
 * Shape of an email document as stored in BrightDb.
 *
 * Maps and Sets from IEmailMetadata are serialized to plain objects/arrays
 * for storage, then reconstituted on read.
 */
interface EmailDocument extends DocumentRecord {
  messageId: string;
  [key: string]: unknown;
}

/** Shape of an attachment document in BrightDb. */
interface AttachmentDocument extends DocumentRecord {
  key: string;
  content: string; // base64-encoded binary
}

/** Shape of a read-tracking document in BrightDb. */
interface ReadTrackingDocument extends DocumentRecord {
  readKey: string; // "messageId::userId"
  messageId: string;
  userId: string;
}


/**
 * Serialize an IEmailMetadata object for BrightDb storage.
 * Converts Maps/Sets to plain objects/arrays and Dates to ISO strings.
 */
function serializeEmail(metadata: IEmailMetadata): EmailDocument {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: Record<string, any> = { ...metadata };

  // Convert Maps to plain objects for storage
  if (metadata.customHeaders instanceof Map) {
    const headers: Record<string, string[]> = {};
    for (const [k, v] of metadata.customHeaders) {
      headers[k] = v;
    }
    doc['customHeaders'] = headers;
  }

  if (metadata.deliveryReceipts instanceof Map) {
    const receipts: Record<string, unknown> = {};
    for (const [k, v] of metadata.deliveryReceipts) {
      receipts[String(k)] = v;
    }
    doc['deliveryReceipts'] = receipts;
  }

  if (metadata.readReceipts instanceof Map) {
    const receipts: Record<string, string> = {};
    for (const [k, v] of metadata.readReceipts) {
      receipts[String(k)] = v instanceof Date ? v.toISOString() : String(v);
    }
    doc['readReceipts'] = receipts;
  }

  if (metadata.encryptedKeys instanceof Map) {
    const keys: Record<string, string> = {};
    for (const [k, v] of metadata.encryptedKeys) {
      keys[k] = Buffer.from(v).toString('base64');
    }
    doc['encryptedKeys'] = keys;
  }

  // Convert Date to ISO string
  if (metadata.date instanceof Date) {
    doc['date'] = metadata.date.toISOString();
  }

  // Convert Uint8Array fields to base64
  if (metadata.encryptionIv) {
    doc['encryptionIv'] = Buffer.from(metadata.encryptionIv).toString('base64');
  }
  if (metadata.encryptionAuthTag) {
    doc['encryptionAuthTag'] = Buffer.from(metadata.encryptionAuthTag).toString('base64');
  }
  if (metadata.contentSignature) {
    doc['contentSignature'] = Buffer.from(metadata.contentSignature).toString('base64');
  }
  if (metadata.signerPublicKey) {
    doc['signerPublicKey'] = Buffer.from(metadata.signerPublicKey).toString('base64');
  }

  return doc as EmailDocument;
}

/**
 * Deserialize a BrightDb document back to IEmailMetadata.
 * Reconstitutes Maps/Sets and Dates from their serialized forms.
 */
function deserializeEmail(doc: EmailDocument): IEmailMetadata {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = { ...doc };

  // Reconstitute customHeaders Map
  if (result.customHeaders && !(result.customHeaders instanceof Map)) {
    const map = new Map<string, string[]>();
    for (const [k, v] of Object.entries(result.customHeaders as Record<string, string[]>)) {
      map.set(k, v);
    }
    result.customHeaders = map;
  }

  // Reconstitute deliveryReceipts Map
  if (result.deliveryReceipts && !(result.deliveryReceipts instanceof Map)) {
    const map = new Map<string, unknown>();
    for (const [k, v] of Object.entries(result.deliveryReceipts as Record<string, unknown>)) {
      map.set(k, v);
    }
    result.deliveryReceipts = map;
  }

  // Reconstitute readReceipts Map
  if (result.readReceipts && !(result.readReceipts instanceof Map)) {
    const map = new Map<string, Date>();
    for (const [k, v] of Object.entries(result.readReceipts as Record<string, string>)) {
      map.set(k, new Date(v));
    }
    result.readReceipts = map;
  }

  // Reconstitute encryptedKeys Map
  if (result.encryptedKeys && !(result.encryptedKeys instanceof Map)) {
    const map = new Map<string, Uint8Array>();
    for (const [k, v] of Object.entries(result.encryptedKeys as Record<string, string>)) {
      map.set(k, Buffer.from(v, 'base64'));
    }
    result.encryptedKeys = map;
  }

  // Reconstitute Date
  if (result.date && !(result.date instanceof Date)) {
    result.date = new Date(result.date as string);
  }

  // Reconstitute Uint8Array fields
  if (typeof result.encryptionIv === 'string') {
    result.encryptionIv = Buffer.from(result.encryptionIv, 'base64');
  }
  if (typeof result.encryptionAuthTag === 'string') {
    result.encryptionAuthTag = Buffer.from(result.encryptionAuthTag, 'base64');
  }
  if (typeof result.contentSignature === 'string') {
    result.contentSignature = Buffer.from(result.contentSignature, 'base64');
  }
  if (typeof result.signerPublicKey === 'string') {
    result.signerPublicKey = Buffer.from(result.signerPublicKey, 'base64');
  }

  // Remove BrightDb internal fields
  delete result._id;

  return result as IEmailMetadata;
}


export class BrightDbEmailMetadataStore implements IEmailMetadataStore {
  private readonly userEmailMap = new Map<string, string>();

  constructor(
    private readonly emailCollection: DocumentCollection<EmailDocument>,
    private readonly attachmentCollection: DocumentCollection<AttachmentDocument>,
    private readonly readTrackingCollection: DocumentCollection<ReadTrackingDocument>,
  ) {}

  /**
   * Register a mapping from userId (memberId GUID) to email address.
   * Mirrors InMemoryEmailMetadataStore.registerUserEmail().
   */
  registerUserEmail(userId: string, email: string): void {
    this.userEmailMap.set(userId.toLowerCase(), email.toLowerCase());
  }

  private resolveUserEmail(userId: string): string {
    if (userId.includes('@')) return userId.toLowerCase();
    return this.userEmailMap.get(userId.toLowerCase()) ?? userId.toLowerCase();
  }

  // ─── IEmailMetadataStore Contract ───────────────────────────────────

  async store(metadata: IEmailMetadata): Promise<void> {
    const doc = serializeEmail(metadata);
    await this.emailCollection.create(doc);
  }

  async get(messageId: string): Promise<IEmailMetadata | null> {
    const doc = await this.emailCollection
      .findOne({ messageId } as Partial<EmailDocument>)
      .exec();
    return doc ? deserializeEmail(doc) : null;
  }

  async delete(messageId: string): Promise<void> {
    await this.emailCollection.deleteOne({ messageId } as Partial<EmailDocument>);
  }

  async update(
    messageId: string,
    updates: Partial<IEmailMetadata>,
  ): Promise<void> {
    // Serialize only the update fields
    const serialized = serializeEmail(updates as IEmailMetadata);
    // Remove undefined/null fields from the serialized update
    const cleanUpdate: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(serialized)) {
      if (v !== undefined) {
        cleanUpdate[k] = v;
      }
    }
    await this.emailCollection.updateOne(
      { messageId } as Partial<EmailDocument>,
      cleanUpdate as Partial<EmailDocument>,
    );
  }

  async queryInbox(userId: string, query: IInboxQuery): Promise<IInboxResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const sortBy = query.sortBy ?? 'date';
    const sortDirection = query.sortDirection ?? 'desc';

    const resolvedEmail = this.resolveUserEmail(userId);

    // Fetch all emails from the collection (BrightDb doesn't support
    // complex recipient-matching queries natively, so we filter in JS
    // like the in-memory implementation does)
    const allDocs = await this.emailCollection.find().exec();
    const allEmails = (allDocs ?? []).map((d) => deserializeEmail(d));

    // 1. Filter: only emails where userId is a recipient
    let results = allEmails.filter((email) =>
      this.isRecipient(email, resolvedEmail),
    );

    // 2. Apply filters
    results = this.applyFilters(results, query, userId);

    // Count unread among filtered results
    const readKeys = await this.getReadKeysForUser(userId);
    const unreadCount = results.filter(
      (e) => !readKeys.has(this.readKey(e.messageId, userId)),
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
    const resolvedEmail = this.resolveUserEmail(userId);
    const allDocs = await this.emailCollection.find().exec();
    const allEmails = (allDocs ?? []).map((d) => deserializeEmail(d));
    const readKeys = await this.getReadKeysForUser(userId);

    let count = 0;
    for (const email of allEmails) {
      if (
        this.isRecipient(email, resolvedEmail) &&
        !readKeys.has(this.readKey(email.messageId, userId))
      ) {
        count++;
      }
    }
    return count;
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    const rk = this.readKey(messageId, userId);
    // Check if already tracked
    const existing = await this.readTrackingCollection
      .findOne({ readKey: rk } as Partial<ReadTrackingDocument>)
      .exec();
    if (!existing) {
      await this.readTrackingCollection.create({
        readKey: rk,
        messageId,
        userId,
      } as ReadTrackingDocument);
    }

    // Also update the email's readReceipts
    const email = await this.get(messageId);
    if (email) {
      email.readReceipts.set(userId, new Date());
      await this.update(messageId, { readReceipts: email.readReceipts } as Partial<IEmailMetadata>);
    }
  }

  async getThread(messageId: string): Promise<IEmailMetadata[]> {
    const startEmail = await this.get(messageId);
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
      const email = await this.get(id);
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
    const allDocs = await this.emailCollection.find().exec();
    const allEmails = (allDocs ?? []).map((d) => deserializeEmail(d));
    for (const email of allEmails) {
      if (knownIds.has(email.messageId)) continue;
      if (email.inReplyTo && knownIds.has(email.inReplyTo)) {
        knownIds.add(email.messageId);
      }
      if (email.references?.some((ref) => knownIds.has(ref))) {
        knownIds.add(email.messageId);
      }
    }

    const threadEmails: IEmailMetadata[] = [];
    for (const email of allEmails) {
      if (knownIds.has(email.messageId)) {
        threadEmails.push(email);
      }
    }

    // Sort chronologically
    threadEmails.sort((a, b) => a.date.getTime() - b.date.getTime());
    return threadEmails;
  }

  async getRootMessage(messageId: string): Promise<IEmailMetadata | null> {
    const email = await this.get(messageId);
    if (!email) return null;

    if (email.references && email.references.length > 0) {
      const rootId = email.references[0];
      return (await this.get(rootId)) ?? null;
    }

    if (email.inReplyTo) {
      const parent = await this.get(email.inReplyTo);
      if (parent) return this.getRootMessage(parent.messageId);
    }

    return email;
  }

  // ─── Attachment Content Storage ─────────────────────────────────────

  async storeAttachmentContent(
    key: string,
    content: Uint8Array,
  ): Promise<void> {
    const encoded = Buffer.from(content).toString('base64');
    // Upsert: delete existing then create
    await this.attachmentCollection.deleteOne({ key } as Partial<AttachmentDocument>);
    await this.attachmentCollection.create({
      key,
      content: encoded,
    } as AttachmentDocument);
  }

  async getAttachmentContent(key: string): Promise<Uint8Array | null> {
    const doc = await this.attachmentCollection
      .findOne({ key } as Partial<AttachmentDocument>)
      .exec();
    if (!doc) return null;
    return Buffer.from(doc.content, 'base64');
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  private readKey(messageId: string, userId: string): string {
    return `${messageId}::${userId}`;
  }

  private isRecipient(email: IEmailMetadata, userId: string): boolean {
    const lower = userId.toLowerCase();
    if (email.to?.some((m) => m.address.toLowerCase() === lower)) return true;
    if (email.cc?.some((m) => m.address.toLowerCase() === lower)) return true;
    if (email.bcc?.some((m) => m.address.toLowerCase() === lower)) return true;
    return false;
  }

  /** Get all read keys for a user from the read-tracking collection. */
  private async getReadKeysForUser(userId: string): Promise<Set<string>> {
    const docs = await this.readTrackingCollection
      .find({ userId } as Partial<ReadTrackingDocument>)
      .exec();
    const keys = new Set<string>();
    if (docs) {
      for (const doc of docs) {
        keys.add(doc.readKey);
      }
    }
    return keys;
  }

  private applyFilters(
    emails: IEmailMetadata[],
    query: IInboxQuery,
    userId: string,
  ): IEmailMetadata[] {
    let results = emails;

    if (query.readStatus === 'read' || query.readStatus === 'unread') {
      // We need synchronous read-key checking here, but we already
      // fetched read keys in the caller. For simplicity, use the
      // readReceipts on the email itself (which we update on markAsRead).
      if (query.readStatus === 'read') {
        results = results.filter((e) => e.readReceipts.has(userId));
      } else {
        results = results.filter((e) => !e.readReceipts.has(userId));
      }
    }

    if (query.senderAddress) {
      const senderLower = query.senderAddress.toLowerCase();
      results = results.filter(
        (e) => e.from.address.toLowerCase() === senderLower,
      );
    }

    if (query.dateFrom) {
      const from = query.dateFrom.getTime();
      results = results.filter((e) => e.date.getTime() >= from);
    }
    if (query.dateTo) {
      const to = query.dateTo.getTime();
      results = results.filter((e) => e.date.getTime() <= to);
    }

    if (query.hasAttachments !== undefined) {
      results = results.filter((e) => {
        const has = e.attachments !== undefined && e.attachments.length > 0;
        return query.hasAttachments ? has : !has;
      });
    }

    if (query.subjectContains) {
      const needle = query.subjectContains.toLowerCase();
      results = results.filter(
        (e) =>
          e.subject !== undefined && e.subject.toLowerCase().includes(needle),
      );
    }

    if (query.searchText) {
      const needle = query.searchText.toLowerCase();
      results = results.filter((e) => this.matchesSearch(e, needle));
    }

    return results;
  }

  private matchesSearch(email: IEmailMetadata, needle: string): boolean {
    if (email.subject && email.subject.toLowerCase().includes(needle)) {
      return true;
    }
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
}
