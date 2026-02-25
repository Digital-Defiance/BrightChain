import { createHash, randomUUID } from 'crypto';

import type { BrightChainDb, BsonDocument } from '@brightchain/db';

const COLLECTION_SESSIONS = 'sessions';

/**
 * Shape of a session document stored in BrightChainDb.
 * Exported so consumers (tests, controllers) can reference the type.
 */
export interface ISessionDocument {
  /** UUID v4 identifying this session. */
  sessionId: string;
  /** Hex-encoded member ID. */
  memberId: string;
  /** SHA-256 hex digest of the JWT token. */
  tokenHash: string;
  /** Epoch-ms when the session was created. */
  createdAt: number;
  /** Epoch-ms when the session expires. */
  expiresAt: number;
}

/**
 * Internal document shape that extends BsonDocument for storage in
 * BrightChainDb collections.
 */
interface SessionDoc extends BsonDocument {
  sessionId: string;
  memberId: string;
  tokenHash: string;
  createdAt: number;
  expiresAt: number;
}

/** Compute the SHA-256 hex digest of a string. */
function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Manages user sessions backed by a BrightChainDb `sessions` collection.
 *
 * Token hashes use SHA-256 (not bcrypt) so that `validateToken` can
 * query by hash without a per-row compare.
 */
export class BrightChainSessionAdapter {
  private readonly db: BrightChainDb;

  constructor(db: BrightChainDb) {
    this.db = db;
  }

  /**
   * Create a new session for the given member.
   *
   * @param memberId  Hex string of the member's ID.
   * @param token     The raw JWT token (will be SHA-256 hashed for storage).
   * @param ttlMs     Time-to-live in milliseconds.
   * @returns The generated UUID session ID.
   */
  async createSession(
    memberId: string,
    token: string,
    ttlMs: number,
  ): Promise<string> {
    const sessionId = randomUUID();
    const now = Date.now();

    const doc: Omit<SessionDoc, '_id'> = {
      sessionId,
      memberId,
      tokenHash: sha256Hex(token),
      createdAt: now,
      expiresAt: now + ttlMs,
    };

    const col = this.db.collection<SessionDoc>(COLLECTION_SESSIONS);
    await col.insertOne(doc as SessionDoc);

    return sessionId;
  }

  /**
   * Retrieve a session by its ID.
   *
   * @returns The session document, or `null` if not found or expired.
   */
  async getSession(sessionId: string): Promise<ISessionDocument | null> {
    const col = this.db.collection<SessionDoc>(COLLECTION_SESSIONS);
    const doc = await col.findOne({ sessionId });
    if (!doc) return null;
    if (doc.expiresAt < Date.now()) return null;
    return toSessionDocument(doc);
  }

  /**
   * Validate a raw JWT token against stored sessions.
   *
   * Hashes the token with SHA-256, looks up the matching session,
   * and checks expiration.
   *
   * @returns The session document, or `null` if invalid / expired / missing.
   */
  async validateToken(token: string): Promise<ISessionDocument | null> {
    const tokenHash = sha256Hex(token);
    const col = this.db.collection<SessionDoc>(COLLECTION_SESSIONS);
    const doc = await col.findOne({ tokenHash });
    if (!doc) return null;
    if (doc.expiresAt < Date.now()) return null;
    return toSessionDocument(doc);
  }

  /**
   * Delete a session by its ID.
   */
  async deleteSession(sessionId: string): Promise<void> {
    const col = this.db.collection<SessionDoc>(COLLECTION_SESSIONS);
    await col.deleteOne({ sessionId });
  }

  /**
   * Remove all expired sessions.
   *
   * @returns The number of sessions removed.
   */
  async cleanExpired(): Promise<number> {
    const col = this.db.collection<SessionDoc>(COLLECTION_SESSIONS);
    const now = Date.now();

    // BrightChainDb's filter engine supports $lt on numeric fields.
    const result = await col.deleteMany({ expiresAt: { $lt: now } });
    return result.deletedCount;
  }
}

/** Map a stored SessionDoc to the public ISessionDocument shape. */
function toSessionDocument(doc: SessionDoc): ISessionDocument {
  return {
    sessionId: doc.sessionId,
    memberId: doc.memberId,
    tokenHash: doc.tokenHash,
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt,
  };
}
