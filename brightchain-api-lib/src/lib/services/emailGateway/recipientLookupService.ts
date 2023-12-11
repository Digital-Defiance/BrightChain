/**
 * RecipientLookupService — TCP socketmap server for Postfix recipient validation.
 *
 * Implements the Postfix `socketmap` lookup protocol over TCP so that Postfix
 * can validate whether a recipient address corresponds to a registered
 * BrightChain user *before* accepting the message (preventing backscatter).
 *
 * Protocol (simplified):
 *   Client sends: `<name> <key>\n`   (e.g. `virtual alice@brightchain.org\n`)
 *   Server responds: `OK <value>\n` | `NOTFOUND \n` | `TEMP <reason>\n`
 *
 * The service:
 * - Listens on a configurable TCP port (default 2526) on localhost
 * - Queries a user-registry dependency for the local part at the canonical domain
 * - Caches positive results in an LRU cache with configurable TTL (default 300 s)
 * - Responds within 5 seconds (timeout handling)
 *
 * @see Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 4.1, 4.2, 4.3
 * @module recipientLookupService
 */

import * as net from 'net';

import type { IRecipientLookupService } from '@brightchain/brightchain-lib';

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IDomainAwareComponent } from './emailGatewayService';

// ─── User Registry Interface ────────────────────────────────────────────────

/**
 * Minimal interface for querying the BrightChain user registry.
 *
 * Concrete implementations may delegate to `IMemberStore.queryIndex` or
 * any other backing store. The recipient lookup service only needs to know
 * whether a given email address belongs to a registered user.
 */
export interface IUserRegistry {
  /**
   * Check whether `emailAddress` corresponds to a registered BrightChain user.
   *
   * @returns `true` if the user exists, `false` otherwise.
   * @throws When the registry is unreachable (triggers TEMP response).
   */
  hasUser(emailAddress: string): Promise<boolean>;
}

// ─── LRU Cache ──────────────────────────────────────────────────────────────

/** A single cache entry with an expiry timestamp. */
interface CacheEntry {
  /** Timestamp (ms since epoch) at which this entry expires. */
  expiresAt: number;
}

/**
 * Simple LRU cache for positive recipient lookup results.
 *
 * Only positive (`OK`) results are cached — negative and temporary results
 * are always re-queried so that newly registered users are found promptly.
 *
 * @see Requirement 13.6
 */
export class RecipientLookupCache {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number,
  ) {}

  /**
   * Retrieve a cached positive result for `key`.
   *
   * @returns `true` if the key is cached and not expired, `false` otherwise.
   */
  get(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    // Move to end (most-recently used) by re-inserting.
    this.cache.delete(key);
    this.cache.set(key, entry);
    return true;
  }

  /**
   * Store a positive lookup result for `key`.
   */
  set(key: string): void {
    // If already present, delete first so insertion order is refreshed.
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict the least-recently used entry if at capacity.
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, { expiresAt: Date.now() + this.ttlMs });
  }

  /** Number of entries currently in the cache. */
  get size(): number {
    return this.cache.size;
  }

  /** Remove all entries. */
  clear(): void {
    this.cache.clear();
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum time (ms) to wait for a registry lookup before returning TEMP. */
const LOOKUP_TIMEOUT_MS = 5_000;

/** Default maximum number of entries in the LRU cache. */
const DEFAULT_CACHE_MAX_SIZE = 10_000;

// ─── RecipientLookupService ─────────────────────────────────────────────────

/**
 * TCP socketmap server that Postfix queries to validate recipient addresses
 * against the BrightChain user registry.
 *
 * Implements `IRecipientLookupService` from brightchain-lib for the `lookup`
 * contract, and adds TCP server lifecycle (`start` / `stop`).
 *
 * @see Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */
export class RecipientLookupService
  implements IRecipientLookupService, IDomainAwareComponent
{
  private server: net.Server | null = null;
  private readonly cache: RecipientLookupCache;
  private readonly port: number;
  private canonicalDomain: string;

  constructor(
    private readonly config: IEmailGatewayConfig,
    private readonly userRegistry: IUserRegistry,
  ) {
    this.port = config.recipientLookupPort;
    this.canonicalDomain = config.canonicalDomain.toLowerCase();
    this.cache = new RecipientLookupCache(
      DEFAULT_CACHE_MAX_SIZE,
      config.recipientLookupCacheTtlSeconds * 1_000,
    );
  }

  /**
   * Update the canonical domain used for recipient validation.
   *
   * Clears the lookup cache since cached entries may belong to the old domain.
   *
   * @param newDomain - The new canonical domain
   *
   * @see Requirement 8.5 — hot-reload canonical domain without restart
   */
  updateCanonicalDomain(newDomain: string): void {
    this.canonicalDomain = newDomain.toLowerCase();
    this.cache.clear();
  }

  // ─── IRecipientLookupService ────────────────────────────────────────

  /**
   * Look up whether `emailAddress` corresponds to a registered BrightChain
   * user at the canonical domain.
   *
   * 1. Check the LRU cache for a positive hit.
   * 2. Query the user registry (with a 5-second timeout).
   * 3. Cache positive results.
   *
   * @returns `'OK'` | `'NOTFOUND'` | `'TEMP'`
   *
   * @see Requirements 13.2, 13.3, 13.4, 13.5, 13.6
   */
  async lookup(emailAddress: string): Promise<'OK' | 'NOTFOUND' | 'TEMP'> {
    const normalised = emailAddress.toLowerCase().trim();

    // Validate that the address belongs to the canonical domain.
    const atIndex = normalised.lastIndexOf('@');
    if (atIndex === -1) {
      return 'NOTFOUND';
    }
    const domain = normalised.slice(atIndex + 1);
    if (domain !== this.canonicalDomain) {
      return 'NOTFOUND';
    }

    // 1. Cache hit → return OK immediately (Req 13.6).
    if (this.cache.get(normalised)) {
      console.info(
        `[RecipientLookup] Cache hit for ${normalised} → OK`,
      );
      return 'OK';
    }

    // 2. Query registry with timeout (Req 4.3 — respond within 5 s).
    console.info(`[RecipientLookup] Registry lookup for ${normalised}`);
    try {
      const found = await this.withTimeout(
        this.userRegistry.hasUser(normalised),
        LOOKUP_TIMEOUT_MS,
      );

      if (found) {
        this.cache.set(normalised);
        console.info(`[RecipientLookup] ${normalised} → OK (cached)`);
        return 'OK';
      }
      console.info(`[RecipientLookup] ${normalised} → NOTFOUND`);
      return 'NOTFOUND';
    } catch (err) {
      // Registry unreachable or timeout → TEMP (Req 13.5).
      const reason = err instanceof Error ? err.message : String(err);
      console.error(
        `[RecipientLookup] ${normalised} → TEMP (registry error: ${reason})`,
      );
      return 'TEMP';
    }
  }

  // ─── TCP Server Lifecycle ───────────────────────────────────────────

  /**
   * Start the TCP socketmap server on the configured port (localhost only).
   *
   * @see Requirement 13.1
   */
  start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.server) {
        resolve();
        return;
      }

      this.server = net.createServer((socket) => this.handleConnection(socket));

      this.server.on('error', (err) => {
        console.error(`[RecipientLookup] Server error: ${err.message}`);
        reject(err);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        console.info(
          `[RecipientLookup] TCP socketmap server listening on 127.0.0.1:${this.port}`,
        );
        resolve();
      });
    });
  }

  /**
   * Stop the TCP server and clear the cache.
   */
  stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.cache.clear();
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close(() => {
        console.info(`[RecipientLookup] TCP server stopped`);
        this.server = null;
        resolve();
      });
    });
  }

  /** Whether the TCP server is currently listening. */
  isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }

  /** Expose cache for testing purposes. */
  getCache(): RecipientLookupCache {
    return this.cache;
  }

  // ─── Connection Handler ─────────────────────────────────────────────

  /**
   * Handle a single TCP connection from Postfix.
   *
   * Postfix socketmap protocol uses netstrings (RFC-like):
   *   Request:  `<length>:<mapname> <key>,`
   *   Response: `<length>:<status> <value>,`
   *
   * For example:
   *   Request:  `30:virtual jessica@brightchain.org,`
   *   Response: `26:OK jessica@brightchain.org,`
   *
   * The connection may carry multiple back-to-back netstring requests.
   *
   * @see http://cr.yp.to/proto/netstrings.txt
   * @see https://www.postfix.org/socketmap_table.5.html
   */
  private handleConnection(socket: net.Socket): void {
    let buffer = Buffer.alloc(0) as Buffer;
    let processing = false;
    let pendingChunks: Buffer[] = [];

    const drain = async () => {
      if (processing) return;
      processing = true;
      try {
        while (pendingChunks.length > 0) {
          const chunks = pendingChunks;
          pendingChunks = [];
          for (const chunk of chunks) {
            buffer = Buffer.concat([buffer, chunk]) as Buffer;
          }
          buffer = (await this.processBuffer(socket, buffer)) as Buffer;
        }
      } finally {
        processing = false;
      }
      // If more chunks arrived while we were processing, drain again.
      if (pendingChunks.length > 0) {
        drain();
      }
    };

    socket.on('data', (chunk: Buffer) => {
      pendingChunks.push(chunk);
      drain();
    });

    socket.on('error', (err) => {
      // Silently handle socket errors (e.g. client disconnect).
      console.warn(`[RecipientLookup] Socket error: ${err.message}`);
    });
  }

  /**
   * Process all complete netstrings in the buffer.
   *
   * Returns the unconsumed remainder of the buffer.
   */
  private async processBuffer(
    socket: net.Socket,
    buffer: Buffer,
  ): Promise<Buffer> {
    while (buffer.length > 0) {
      // Find the colon separating the length prefix from the data.
      const colonIdx = buffer.indexOf(':');
      if (colonIdx === -1) {
        // No colon yet — wait for more data.
        break;
      }

      const lengthStr = buffer.slice(0, colonIdx).toString('ascii');
      const length = parseInt(lengthStr, 10);
      if (isNaN(length) || length < 0) {
        // Malformed — close the connection.
        socket.destroy();
        return Buffer.alloc(0);
      }

      // Total bytes needed: colon + data + trailing comma.
      const totalNeeded = colonIdx + 1 + length + 1;
      if (buffer.length < totalNeeded) {
        // Incomplete netstring — wait for more data.
        break;
      }

      // Extract the payload (between ':' and ',').
      const payload = buffer.slice(colonIdx + 1, colonIdx + 1 + length).toString('utf-8');
      const terminator = buffer[colonIdx + 1 + length];

      // Consume this netstring from the buffer.
      buffer = buffer.slice(totalNeeded);

      if (terminator !== 0x2c /* ',' */) {
        // Malformed netstring — close the connection.
        socket.destroy();
        return Buffer.alloc(0);
      }

      // Process the request and send the netstring response.
      const response = await this.handleRequest(payload.trim()).catch(
        () => 'TEMP internal error',
      );

      if (!socket.destroyed) {
        const responseBytes = Buffer.from(response, 'utf-8');
        const netstring = `${responseBytes.length}:${response},`;
        socket.write(netstring);
      }
    }

    return buffer;
  }

  /**
   * Parse a socketmap request payload and return the response string.
   *
   * @param payload - The netstring payload, e.g. `virtual alice@brightchain.org`
   * @returns The response string, e.g. `OK alice@brightchain.org`
   */
  private async handleRequest(payload: string): Promise<string> {
    // Format: `<mapname> <key>`
    const spaceIdx = payload.indexOf(' ');
    if (spaceIdx === -1) {
      console.log(`[RecipientLookup] Malformed request (no space): ${payload}`);
      return 'TEMP malformed request';
    }

    const key = payload.slice(spaceIdx + 1).trim();
    if (key.length === 0) {
      console.log(`[RecipientLookup] Malformed request (empty key): ${payload}`);
      return 'TEMP malformed request';
    }

    const result = await this.lookup(key);

    switch (result) {
      case 'OK':
        console.log(`[RecipientLookup] ✓ ${key} → OK`);
        return `OK ${key}`;
      case 'NOTFOUND':
        console.log(`[RecipientLookup] ✗ ${key} → NOTFOUND`);
        return 'NOTFOUND ';
      case 'TEMP':
        console.log(`[RecipientLookup] ⚠ ${key} → TEMP (registry unavailable)`);
        return 'TEMP registry unavailable';
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  /**
   * Race a promise against a timeout.
   *
   * @throws If the timeout fires first.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Lookup timed out after ${ms}ms`));
      }, ms);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
