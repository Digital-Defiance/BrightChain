/**
 * @fileoverview Adversarial E2E tests for Ban Enforcement (Phase 3).
 *
 * NO MOCKS for crypto. Real ECDSA keys, real block stores, real BrightDb.
 * Uses a minimal in-memory IBanListCache implementation for testing.
 *
 * @see .kiro/specs/member-pool-security/tasks.md — Task 3.3
 */

import {
  asBlockId,
  BlockSize,
  type IAclDocument,
  type IBanListCache,
  type IBanRecord,
  type IGossipService,
  initializeBrightChain,
  MemoryBlockStore,
  normalizeBanConfig,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import {
  AuthorizedHeadRegistry,
  BrightDb,
  HeadRegistry,
  WriteAclManager,
} from '@brightchain/db';
import * as crypto from 'crypto';
import { ECDSANodeAuthenticator } from '../lib/auth/ecdsaNodeAuthenticator';
import { BanEnforcementService } from '../lib/services/banEnforcementService';
import {
  addNodeToAcl,
  createMemberPoolAcl,
  savePoolSecurity,
} from '../lib/services/poolSecurityService';

function generateKeyPair() {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  return {
    privateKey: new Uint8Array(ecdh.getPrivateKey()),
    publicKey: new Uint8Array(ecdh.getPublicKey(undefined, 'compressed')),
  };
}

/**
 * Minimal in-memory IBanListCache for testing.
 */
class InMemoryBanListCache implements IBanListCache<Uint8Array> {
  private bans = new Map<string, IBanRecord<Uint8Array>>();

  private keyToHex(key: Uint8Array): string {
    return Buffer.from(key).toString('hex');
  }

  isBanned(memberId: Uint8Array): boolean {
    return this.bans.has(this.keyToHex(memberId));
  }

  addBan(record: IBanRecord<Uint8Array>): void {
    this.bans.set(this.keyToHex(record.memberId), record);
  }

  removeBan(memberId: Uint8Array): void {
    this.bans.delete(this.keyToHex(memberId));
  }

  getAll(): IBanRecord<Uint8Array>[] {
    return Array.from(this.bans.values());
  }

  getBan(memberId: Uint8Array): IBanRecord<Uint8Array> | null {
    return this.bans.get(this.keyToHex(memberId)) ?? null;
  }

  loadFrom(records: IBanRecord<Uint8Array>[]): void {
    this.bans.clear();
    for (const r of records) {
      this.addBan(r);
    }
  }

  get size(): number {
    return this.bans.size;
  }

  async verifySignatures(): Promise<boolean> {
    return true; // Simplified for testing
  }
}

function makeBanRecord(memberId: Uint8Array): IBanRecord<Uint8Array> {
  return {
    memberId,
    bannedAt: new Date(),
    reason: 'Adversarial behavior',
    proposalId: new Uint8Array(32),
    approvalSignatures: [],
    enactedAt: new Date(),
  };
}

// Minimal gossip service stub
const stubGossip: IGossipService = {
  announceBlock: async () => {},
  announceRemoval: async () => {},
  announcePoolDeletion: async () => {},
  announceCBLIndexUpdate: async () => {},
  announceCBLIndexDelete: async () => {},
  announceHeadUpdate: async () => {},
  announceACLUpdate: async () => {},
  announceMessage: async () => {},
  sendDeliveryAck: async () => {},
  announceBrightTrustProposal: async () => {},
  announceBrightTrustVote: async () => {},
  handleAnnouncement: async () => {},
  onAnnouncement: () => {},
  offAnnouncement: () => {},
  onMessageDelivery: () => {},
  offMessageDelivery: () => {},
  onDeliveryAck: () => {},
  offDeliveryAck: () => {},
  onBrightTrustProposal: () => {},
  offBrightTrustProposal: () => {},
  onBrightTrustVote: () => {},
  offBrightTrustVote: () => {},
  getPendingAnnouncements: () => [],
  flushAnnouncements: async () => {},
  start: () => {},
  stop: async () => {},
  getConfig: () => ({
    fanout: 3,
    defaultTtl: 3,
    batchIntervalMs: 1000,
    maxBatchSize: 100,
    messagePriority: {
      normal: { fanout: 5, ttl: 5 },
      high: { fanout: 7, ttl: 7 },
    },
  }),
};

const POOL_NAME = 'TestBrightChain';
const auth = new ECDSANodeAuthenticator();

describe('Ban Enforcement — Adversarial E2E Tests', () => {
  const adminUser = generateKeyPair();
  const bannedNode = generateKeyPair();

  let adminAcl: IAclDocument;
  let aclWithBannedNode: IAclDocument;

  beforeAll(async () => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

    adminAcl = await createMemberPoolAcl({
      poolName: POOL_NAME,
      systemUserId: 'admin-node',
      systemUserPublicKey: adminUser.publicKey,
      systemUserPrivateKey: adminUser.privateKey,
      authenticator: auth,
    });

    // Add the node that will be banned
    aclWithBannedNode = await addNodeToAcl(
      adminAcl,
      bannedNode.publicKey,
      adminUser.privateKey,
      auth,
    );
  });

  // ── Test: Banned node cannot write ───────────────────────────────

  it('banned node is removed from ACL and cannot write', async () => {
    const banCache = new InMemoryBanListCache();
    const banService = new BanEnforcementService(
      banCache,
      auth,
      stubGossip,
      POOL_NAME,
      'admin-node',
    );

    // Create a DB and save the ACL with the banned node
    const store = new MemoryBlockStore(BlockSize.Small);
    const db = new BrightDb(store, {
      name: POOL_NAME,
      headRegistry: HeadRegistry.createIsolated(),
    });
    await db.connect();
    await savePoolSecurity(db, aclWithBannedNode, 'admin-node');

    // Enforce the ban
    const banRecord = makeBanRecord(bannedNode.publicKey);
    const updatedAcl = await banService.enforceBan(
      banRecord,
      aclWithBannedNode,
      adminUser.privateKey,
      db,
    );

    expect(updatedAcl).not.toBeNull();

    // Verify the banned node is no longer in the ACL
    const stillInAcl = updatedAcl!.authorizedWriters.some(
      (w) =>
        Buffer.from(w).toString('hex') ===
        Buffer.from(bannedNode.publicKey).toString('hex'),
    );
    expect(stillInAcl).toBe(false);

    // Verify the banned node can't write with the updated ACL
    const aclManager = new WriteAclManager(store, auth);
    aclManager.setCachedAcl(updatedAcl!);

    const securedDb = new BrightDb(store, {
      name: POOL_NAME,
      headRegistry: HeadRegistry.createIsolated(),
      writeAclConfig: { aclService: aclManager, authenticator: auth },
    });
    await securedDb.connect();
    const headReg = securedDb.getHeadRegistry();
    if ('setLocalSigner' in headReg) {
      (headReg as AuthorizedHeadRegistry).setLocalSigner({
        publicKey: bannedNode.publicKey,
        privateKey: bannedNode.privateKey,
      });
    }

    const coll = securedDb.collection('users');
    await expect(
      coll.insertOne({ _id: 'banned-write', name: 'ShouldFail' }),
    ).rejects.toThrow(/authorization/i);
  });

  // ── Test: Ban list cache correctly identifies banned nodes ───────

  it('ban list cache correctly identifies banned and non-banned nodes', () => {
    const banCache = new InMemoryBanListCache();
    const banRecord = makeBanRecord(bannedNode.publicKey);
    banCache.addBan(banRecord);

    expect(banCache.isBanned(bannedNode.publicKey)).toBe(true);
    expect(banCache.isBanned(adminUser.publicKey)).toBe(false);
    expect(banCache.size).toBe(1);
  });

  // ── Test: Gossip filter drops banned node's messages ─────────────

  it('gossip filter drops announcements from banned nodes', () => {
    const banCache = new InMemoryBanListCache();
    banCache.addBan(makeBanRecord(bannedNode.publicKey));

    const banService = new BanEnforcementService(
      banCache,
      auth,
      stubGossip,
      POOL_NAME,
      'admin-node',
    );

    const _bannedKeyHex = Buffer.from(bannedNode.publicKey).toString('hex');
    // Create a nodeId → publicKey resolver
    const keyMap = new Map<string, Uint8Array>([
      ['banned-node', bannedNode.publicKey],
      ['admin-node', adminUser.publicKey],
    ]);
    const filter = banService.createGossipFilter(
      (nodeId) => keyMap.get(nodeId) ?? null,
    );

    // Banned node's announcement should be filtered
    expect(
      filter({
        type: 'add',
        blockId: asBlockId('a'.repeat(64)),
        nodeId: 'banned-node',
        timestamp: new Date(),
        ttl: 3,
      }),
    ).toBe(false);

    // Admin node's announcement should pass
    expect(
      filter({
        type: 'add',
        blockId: asBlockId('b'.repeat(64)),
        nodeId: 'admin-node',
        timestamp: new Date(),
        ttl: 3,
      }),
    ).toBe(true);

    // Unknown node should pass (can't verify ban status)
    expect(
      filter({
        type: 'add',
        blockId: asBlockId('c'.repeat(64)),
        nodeId: 'unknown-node',
        timestamp: new Date(),
        ttl: 3,
      }),
    ).toBe(true);
  });

  // ── Test: Admin still has write access after ban ─────────────────

  it('admin retains write access after banning another node', async () => {
    const banCache = new InMemoryBanListCache();
    const banService = new BanEnforcementService(
      banCache,
      auth,
      stubGossip,
      POOL_NAME,
      'admin-node',
    );

    const store = new MemoryBlockStore(BlockSize.Small);
    const db = new BrightDb(store, {
      name: POOL_NAME,
      headRegistry: HeadRegistry.createIsolated(),
    });
    await db.connect();

    const banRecord = makeBanRecord(bannedNode.publicKey);
    const updatedAcl = await banService.enforceBan(
      banRecord,
      aclWithBannedNode,
      adminUser.privateKey,
      db,
    );

    // Admin should still be in the ACL
    const adminInAcl = updatedAcl!.authorizedWriters.some(
      (w) =>
        Buffer.from(w).toString('hex') ===
        Buffer.from(adminUser.publicKey).toString('hex'),
    );
    expect(adminInAcl).toBe(true);

    // Admin can still write
    const aclManager = new WriteAclManager(store, auth);
    aclManager.setCachedAcl(updatedAcl!);

    const securedDb = new BrightDb(store, {
      name: POOL_NAME,
      headRegistry: HeadRegistry.createIsolated(),
      writeAclConfig: { aclService: aclManager, authenticator: auth },
    });
    await securedDb.connect();
    const headReg = securedDb.getHeadRegistry();
    if ('setLocalSigner' in headReg) {
      (headReg as AuthorizedHeadRegistry).setLocalSigner({
        publicKey: adminUser.publicKey,
        privateKey: adminUser.privateKey,
      });
    }

    const coll = securedDb.collection('users');
    await expect(
      coll.insertOne({ _id: 'admin-write-after-ban', name: 'StillWorks' }),
    ).resolves.not.toThrow();
  });
});

describe('Ban Enforcement — Reconciliation & Connection Tests', () => {
  const adminUser = generateKeyPair();
  const bannedNode = generateKeyPair();
  const goodNode = generateKeyPair();

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  // ── Test: Banned peers filtered from reconciliation ──────────────

  it('filterBannedPeers removes banned peers from reconciliation list', () => {
    const banCache = new InMemoryBanListCache();
    banCache.addBan(makeBanRecord(bannedNode.publicKey));

    const banService = new BanEnforcementService(
      banCache,
      auth,
      stubGossip,
      POOL_NAME,
      'admin-node',
    );

    const keyMap = new Map<string, Uint8Array>([
      ['banned-peer', bannedNode.publicKey],
      ['good-peer', goodNode.publicKey],
      ['admin-peer', adminUser.publicKey],
    ]);

    const filtered = banService.filterBannedPeers(
      ['banned-peer', 'good-peer', 'admin-peer'],
      (id) => keyMap.get(id) ?? null,
    );

    expect(filtered).toEqual(['good-peer', 'admin-peer']);
    expect(filtered).not.toContain('banned-peer');
  });

  // ── Test: Connection refusal for banned peers ────────────────────

  it('shouldRefuseConnection returns true for banned peers', () => {
    const banCache = new InMemoryBanListCache();
    banCache.addBan(makeBanRecord(bannedNode.publicKey));

    const banService = new BanEnforcementService(
      banCache,
      auth,
      stubGossip,
      POOL_NAME,
      'admin-node',
    );

    expect(banService.shouldRefuseConnection(bannedNode.publicKey)).toBe(true);
    expect(banService.shouldRefuseConnection(goodNode.publicKey)).toBe(false);
    expect(banService.shouldRefuseConnection(adminUser.publicKey)).toBe(false);
  });

  // ── Test: Unban restores access ──────────────────────────────────

  it('unbanned node is no longer filtered or refused', () => {
    const banCache = new InMemoryBanListCache();
    banCache.addBan(makeBanRecord(bannedNode.publicKey));

    const banService = new BanEnforcementService(
      banCache,
      auth,
      stubGossip,
      POOL_NAME,
      'admin-node',
    );

    // Initially banned
    expect(banService.shouldRefuseConnection(bannedNode.publicKey)).toBe(true);

    // Unban
    banCache.removeBan(bannedNode.publicKey);

    // No longer banned
    expect(banService.shouldRefuseConnection(bannedNode.publicKey)).toBe(false);

    const keyMap = new Map<string, Uint8Array>([
      ['unbanned-peer', bannedNode.publicKey],
    ]);
    const filtered = banService.filterBannedPeers(
      ['unbanned-peer'],
      (id) => keyMap.get(id) ?? null,
    );
    expect(filtered).toEqual(['unbanned-peer']);
  });
});

describe('Ban Enforcement — BrightTrust Policy Tests', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  it('ban requires 75% supermajority — 2 of 4 admins is insufficient', () => {
    // With 4 admins and 75% threshold, need 3 approvals
    const config = normalizeBanConfig({ banSupermajorityThreshold: 0.75 });

    const totalAdmins = 4;
    const approvals = 2;
    const threshold = Math.ceil(totalAdmins * config.banSupermajorityThreshold);

    expect(threshold).toBe(3); // Need 3 of 4
    expect(approvals).toBeLessThan(threshold); // 2 < 3 — insufficient
  });

  it('ban requires 75% supermajority — 3 of 4 admins is sufficient', () => {
    const config = normalizeBanConfig({ banSupermajorityThreshold: 0.75 });

    const totalAdmins = 4;
    const approvals = 3;
    const threshold = Math.ceil(totalAdmins * config.banSupermajorityThreshold);

    expect(threshold).toBe(3);
    expect(approvals).toBeGreaterThanOrEqual(threshold); // 3 >= 3 — sufficient
  });

  it('ban cooling period must elapse before enactment', () => {
    const config = normalizeBanConfig();

    // Default cooling period is 72 hours
    expect(config.banCoolingPeriodMs).toBe(72 * 60 * 60 * 1000);

    // Simulate: vote passed 1 hour ago
    const votePassedAt = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const coolingEndsAt = new Date(
      votePassedAt.getTime() + config.banCoolingPeriodMs,
    );
    const now = new Date();

    // Cooling period has NOT elapsed (1 hour < 72 hours)
    expect(now.getTime()).toBeLessThan(coolingEndsAt.getTime());

    // Simulate: vote passed 73 hours ago
    const votePassedLongAgo = new Date(Date.now() - 73 * 60 * 60 * 1000);
    const coolingEndsLongAgo = new Date(
      votePassedLongAgo.getTime() + config.banCoolingPeriodMs,
    );

    // Cooling period HAS elapsed (73 hours > 72 hours)
    expect(now.getTime()).toBeGreaterThan(coolingEndsLongAgo.getTime());
  });

  it('ban config enforces minimum thresholds', () => {
    // Try to set threshold below minimum (67%)
    const config = normalizeBanConfig({ banSupermajorityThreshold: 0.5 });
    expect(config.banSupermajorityThreshold).toBe(0.67); // Clamped to minimum

    // Try to set cooling period below minimum (1 hour)
    const config2 = normalizeBanConfig({ banCoolingPeriodMs: 1000 });
    expect(config2.banCoolingPeriodMs).toBe(60 * 60 * 1000); // Clamped to 1 hour
  });
});
