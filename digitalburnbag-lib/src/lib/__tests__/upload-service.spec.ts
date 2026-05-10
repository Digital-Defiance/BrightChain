import {
  ChunkChecksumMismatchError,
  QuotaExceededError,
  UploadSessionExpiredError,
  UploadSessionNotFoundError,
} from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IUploadSessionBase } from '../interfaces/bases/upload-session';
import type { IQuotaCheckResult } from '../interfaces/params/quota-results';
import type { IUploadRepository } from '../interfaces/services/upload-repository';
import { IUploadServiceDeps, UploadService } from '../services/upload-service';

// ── In-Memory Repository ────────────────────────────────────────────

class InMemoryUploadRepository implements IUploadRepository<string> {
  public sessions = new Map<string, IUploadSessionBase<string>>();
  public chunks = new Map<string, Map<number, Uint8Array>>();
  public files: IFileMetadataBase<string>[] = [];

  async getSession(
    sessionId: string,
  ): Promise<IUploadSessionBase<string> | null> {
    const s = this.sessions.get(sessionId);
    return s ?? null;
  }

  async createSession(session: IUploadSessionBase<string>): Promise<void> {
    // Deep-copy sets/maps so mutations don't leak
    this.sessions.set(session.id, {
      ...session,
      receivedChunks: new Set(session.receivedChunks),
      chunkChecksums: new Map(session.chunkChecksums),
    });
  }

  async updateSession(session: IUploadSessionBase<string>): Promise<void> {
    this.sessions.set(session.id, {
      ...session,
      receivedChunks: new Set(session.receivedChunks),
      chunkChecksums: new Map(session.chunkChecksums),
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async getExpiredSessions(): Promise<IUploadSessionBase<string>[]> {
    const now = new Date();
    const expired: IUploadSessionBase<string>[] = [];
    for (const s of this.sessions.values()) {
      if (new Date(s.expiresAt) < now) {
        expired.push(s);
      }
    }
    return expired;
  }

  async storeChunkData(
    sessionId: string,
    chunkIndex: number,
    data: Uint8Array,
  ): Promise<void> {
    if (!this.chunks.has(sessionId)) {
      this.chunks.set(sessionId, new Map());
    }
    this.chunks.get(sessionId)!.set(chunkIndex, data);
  }

  async getChunkData(
    sessionId: string,
    chunkIndex: number,
  ): Promise<Uint8Array | null> {
    return this.chunks.get(sessionId)?.get(chunkIndex) ?? null;
  }

  async deleteChunkData(sessionId: string): Promise<void> {
    this.chunks.delete(sessionId);
  }

  async createFileMetadata(
    metadata: IFileMetadataBase<string>,
  ): Promise<IFileMetadataBase<string>> {
    this.files.push(metadata);
    return metadata;
  }

  // Escrow stubs (Joule economy — not exercised by these unit tests)
  async storeEscrowData(
    _sessionId: string,
    _ciphertext: Uint8Array,
    _ttlMs: number,
  ): Promise<void> {
    /* no-op */
  }

  async getEscrowData(_sessionId: string): Promise<Uint8Array | null> {
    return null;
  }

  async deleteEscrowData(_sessionId: string): Promise<void> {
    /* no-op */
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Deterministic checksum function used by both "client" and service. */
function testChecksum(data: Uint8Array): string {
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

function makeDeps(
  overrides: Partial<IUploadServiceDeps<string>> = {},
): IUploadServiceDeps<string> {
  return {
    checkQuota: async (
      _userId: string,
      _additionalBytes: number,
    ): Promise<IQuotaCheckResult> => ({
      allowed: true,
      currentUsageBytes: 0,
      quotaBytes: 10 * 1024 * 1024 * 1024,
      remainingBytes: 10 * 1024 * 1024 * 1024,
    }),
    encrypt: async (plaintext: Uint8Array) => ({
      ciphertext: plaintext, // passthrough for testing
      key: new Uint8Array(32),
      iv: new Uint8Array(12),
    }),
    storeBlocks: async (_encrypted: Uint8Array) => ({
      blockRefs: {},
      vaultCreationLedgerEntryHash: new Uint8Array(64),
    }),
    wrapKeyForOwner: async (
      _fileVersionId: string,
      _symmetricKey: Uint8Array,
      _ownerId: string,
    ) => {
      /* no-op for tests */
    },
    computeChecksum: testChecksum,
    ...overrides,
  };
}

const CHUNK_SIZE = 64; // small chunk size for tests
const SESSION_EXPIRATION_MS = 24 * 60 * 60 * 1000;

// ── Tests ───────────────────────────────────────────────────────────

describe('UploadService', () => {
  let repo: InMemoryUploadRepository;
  let deps: IUploadServiceDeps<string>;
  let service: UploadService<string>;

  beforeEach(() => {
    idCounter = 0;
    repo = new InMemoryUploadRepository();
    deps = makeDeps();
    service = new UploadService(
      repo,
      deps,
      generateId,
      CHUNK_SIZE,
      SESSION_EXPIRATION_MS,
    );
  });

  // ── Chunk checksum verification (Req 1.1, 1.6) ─────────────────

  describe('chunk checksum verification', () => {
    it('accepts a chunk with a valid checksum', async () => {
      const session = await service.createSession({
        userId: 'user-1',
        fileName: 'test.txt',
        mimeType: 'text/plain',
        totalSizeBytes: CHUNK_SIZE,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      const data = new Uint8Array(CHUNK_SIZE).fill(42);
      const checksum = testChecksum(data);

      const receipt = await service.receiveChunk(session.id, 0, data, checksum);
      expect(receipt.received).toBe(true);
      expect(receipt.chunkIndex).toBe(0);
      expect(receipt.progress).toBe(1);
    });

    it('rejects a chunk with mismatched checksum', async () => {
      const session = await service.createSession({
        userId: 'user-1',
        fileName: 'test.txt',
        mimeType: 'text/plain',
        totalSizeBytes: CHUNK_SIZE,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      const data = new Uint8Array(CHUNK_SIZE).fill(42);
      const badChecksum = 'deadbeef';

      await expect(
        service.receiveChunk(session.id, 0, data, badChecksum),
      ).rejects.toThrow(ChunkChecksumMismatchError);
    });

    it('does not store chunk data when checksum fails', async () => {
      const session = await service.createSession({
        userId: 'user-1',
        fileName: 'test.txt',
        mimeType: 'text/plain',
        totalSizeBytes: CHUNK_SIZE,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      const data = new Uint8Array(CHUNK_SIZE).fill(42);

      try {
        await service.receiveChunk(session.id, 0, data, 'wrong');
      } catch {
        // expected
      }

      // Session should still show 0 received chunks
      const status = await service.getSessionStatus(session.id);
      expect(status.receivedChunks).toEqual([]);
    });
  });

  // ── Resume from last successful chunk (Req 1.3) ────────────────

  describe('resume from last successful chunk', () => {
    it('reports received chunks so client can resume', async () => {
      const totalSize = CHUNK_SIZE * 4;
      const session = await service.createSession({
        userId: 'user-1',
        fileName: 'big.bin',
        mimeType: 'application/octet-stream',
        totalSizeBytes: totalSize,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      // Upload chunks 0 and 1 only
      for (let i = 0; i < 2; i++) {
        const data = new Uint8Array(CHUNK_SIZE).fill(i);
        const checksum = testChecksum(data);
        await service.receiveChunk(session.id, i, data, checksum);
      }

      const status = await service.getSessionStatus(session.id);
      expect(status.receivedChunks).toEqual([0, 1]);
      expect(status.totalChunks).toBe(4);
      expect(status.expired).toBe(false);
    });

    it('allows uploading remaining chunks after resume', async () => {
      const totalSize = CHUNK_SIZE * 3;
      const session = await service.createSession({
        userId: 'user-1',
        fileName: 'resume.bin',
        mimeType: 'application/octet-stream',
        totalSizeBytes: totalSize,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      // Upload chunk 0
      const data0 = new Uint8Array(CHUNK_SIZE).fill(10);
      await service.receiveChunk(session.id, 0, data0, testChecksum(data0));

      // "Disconnect" — check status for resume
      const status = await service.getSessionStatus(session.id);
      expect(status.receivedChunks).toEqual([0]);

      // Resume: upload chunks 1 and 2
      const data1 = new Uint8Array(CHUNK_SIZE).fill(20);
      await service.receiveChunk(session.id, 1, data1, testChecksum(data1));

      const data2 = new Uint8Array(CHUNK_SIZE).fill(30);
      const receipt = await service.receiveChunk(
        session.id,
        2,
        data2,
        testChecksum(data2),
      );

      expect(receipt.progress).toBe(1); // all chunks received
    });

    it('returns progress as fraction of received/total chunks', async () => {
      const totalSize = CHUNK_SIZE * 4;
      const session = await service.createSession({
        userId: 'user-1',
        fileName: 'progress.bin',
        mimeType: 'application/octet-stream',
        totalSizeBytes: totalSize,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      const data = new Uint8Array(CHUNK_SIZE).fill(1);
      const checksum = testChecksum(data);

      const r1 = await service.receiveChunk(session.id, 0, data, checksum);
      expect(r1.progress).toBe(0.25);

      const r2 = await service.receiveChunk(session.id, 1, data, checksum);
      expect(r2.progress).toBe(0.5);
    });
  });

  // ── Session expiration cleanup (Req 1.7) ────────────────────────

  describe('session expiration cleanup', () => {
    it('purges expired sessions and their chunk data', async () => {
      // Create a service with a very short expiration (1 ms)
      const shortService = new UploadService(
        repo,
        deps,
        generateId,
        CHUNK_SIZE,
        1, // 1 ms expiration
      );

      const session = await shortService.createSession({
        userId: 'user-1',
        fileName: 'expire.txt',
        mimeType: 'text/plain',
        totalSizeBytes: CHUNK_SIZE,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      // Store some chunk data manually so we can verify cleanup
      await repo.storeChunkData(session.id, 0, new Uint8Array(10));

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const purged = await shortService.purgeExpiredSessions();
      expect(purged).toBe(1);

      // Session and chunks should be gone
      expect(repo.sessions.has(session.id)).toBe(false);
      expect(repo.chunks.has(session.id)).toBe(false);
    });

    it('does not purge non-expired sessions', async () => {
      await service.createSession({
        userId: 'user-1',
        fileName: 'active.txt',
        mimeType: 'text/plain',
        totalSizeBytes: CHUNK_SIZE,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      const purged = await service.purgeExpiredSessions();
      expect(purged).toBe(0);
      expect(repo.sessions.size).toBe(1);
    });

    it('rejects chunk upload on expired session', async () => {
      const shortService = new UploadService(
        repo,
        deps,
        generateId,
        CHUNK_SIZE,
        1,
      );

      const session = await shortService.createSession({
        userId: 'user-1',
        fileName: 'expired.txt',
        mimeType: 'text/plain',
        totalSizeBytes: CHUNK_SIZE,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const data = new Uint8Array(CHUNK_SIZE).fill(1);
      await expect(
        shortService.receiveChunk(session.id, 0, data, testChecksum(data)),
      ).rejects.toThrow(UploadSessionExpiredError);
    });
  });

  // ── Quota rejection before session creation (Req 8.2) ──────────

  describe('quota rejection before session creation', () => {
    it('rejects session creation when quota is exceeded', async () => {
      const quotaDeps = makeDeps({
        checkQuota: async () => ({
          allowed: false,
          currentUsageBytes: 900,
          quotaBytes: 1000,
          remainingBytes: 100,
        }),
      });

      const quotaService = new UploadService(
        repo,
        quotaDeps,
        generateId,
        CHUNK_SIZE,
        SESSION_EXPIRATION_MS,
      );

      await expect(
        quotaService.createSession({
          userId: 'user-1',
          fileName: 'toobig.bin',
          mimeType: 'application/octet-stream',
          totalSizeBytes: 200,
          targetFolderId: 'folder-1',
          vaultContainerId: 'vc-1',
        }),
      ).rejects.toThrow(QuotaExceededError);

      // No session should have been created
      expect(repo.sessions.size).toBe(0);
    });

    it('allows session creation when within quota', async () => {
      const session = await service.createSession({
        userId: 'user-1',
        fileName: 'ok.txt',
        mimeType: 'text/plain',
        totalSizeBytes: 100,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      expect(session).toBeDefined();
      expect(session.fileName).toBe('ok.txt');
      expect(repo.sessions.size).toBe(1);
    });

    it('checks quota with the correct file size', async () => {
      let capturedBytes = 0;
      const captureDeps = makeDeps({
        checkQuota: async (_userId, additionalBytes) => {
          capturedBytes = additionalBytes;
          return {
            allowed: true,
            currentUsageBytes: 0,
            quotaBytes: 10000,
            remainingBytes: 10000,
          };
        },
      });

      const captureService = new UploadService(
        repo,
        captureDeps,
        generateId,
        CHUNK_SIZE,
        SESSION_EXPIRATION_MS,
      );

      await captureService.createSession({
        userId: 'user-1',
        fileName: 'sized.bin',
        mimeType: 'application/octet-stream',
        totalSizeBytes: 12345,
        targetFolderId: 'folder-1',
        vaultContainerId: 'vc-1',
      });

      expect(capturedBytes).toBe(12345);
    });
  });

  // ── Session not found ───────────────────────────────────────────

  describe('session not found', () => {
    it('throws UploadSessionNotFoundError for unknown session', async () => {
      await expect(service.getSessionStatus('nonexistent')).rejects.toThrow(
        UploadSessionNotFoundError,
      );
    });
  });
});
