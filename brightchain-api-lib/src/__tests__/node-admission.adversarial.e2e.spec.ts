/**
 * @fileoverview Adversarial E2E tests for Node Admission (Phase 2).
 *
 * NO MOCKS. Real ECDSA keys, real block stores, real BrightDb instances.
 * Tests the full join request → approval/denial → write access flow.
 *
 * @see .kiro/specs/member-pool-security/tasks.md — Task 2.4
 */

import {
  BlockSize,
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
  type AnnouncementHandler,
  type BlockAnnouncement,
  type BlockId,
  type GossipConfig,
  type IAclDocument,
  type IGossipService,
} from '@brightchain/brightchain-lib';
import {
  AuthorizedHeadRegistry,
  BrightDb,
  HeadRegistry,
  WriteAclManager,
} from '@brightchain/db';
import * as crypto from 'crypto';
import { ECDSANodeAuthenticator } from '../lib/auth/ecdsaNodeAuthenticator';
import {
  computeApprovalPayload,
  NodeAdmissionService,
} from '../lib/services/nodeAdmissionService';
import {
  addNodeToAcl,
  createMemberPoolAcl,
} from '../lib/services/poolSecurityService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateKeyPair() {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  return {
    privateKey: new Uint8Array(ecdh.getPrivateKey()),
    publicKey: new Uint8Array(ecdh.getPublicKey(undefined, 'compressed')),
  };
}

/**
 * Minimal IGossipService implementation that captures announcements
 * and dispatches them to registered handlers. No network — just in-process.
 */
class InProcessGossipService implements IGossipService {
  private handlers = new Set<AnnouncementHandler>();
  public sentAnnouncements: BlockAnnouncement[] = [];

  async announceBlock(): Promise<void> {}
  async announceRemoval(): Promise<void> {}
  async announcePoolDeletion(): Promise<void> {}
  async announceCBLIndexUpdate(): Promise<void> {}
  async announceCBLIndexDelete(): Promise<void> {}
  async announceHeadUpdate(): Promise<void> {}
  async announceACLUpdate(): Promise<void> {}
  async announceMessage(): Promise<void> {}
  async sendDeliveryAck(): Promise<void> {}
  async announceBrightTrustProposal(): Promise<void> {}
  async announceBrightTrustVote(): Promise<void> {}
  onMessageDelivery(): void {}
  offMessageDelivery(): void {}
  onDeliveryAck(): void {}
  offDeliveryAck(): void {}
  onBrightTrustProposal(): void {}
  offBrightTrustProposal(): void {}
  onBrightTrustVote(): void {}
  offBrightTrustVote(): void {}
  getPendingAnnouncements(): BlockAnnouncement[] {
    return [];
  }
  async flushAnnouncements(): Promise<void> {}
  start(): void {}
  async stop(): Promise<void> {}
  getConfig(): GossipConfig {
    return {
      fanout: 3,
      defaultTtl: 3,
      batchIntervalMs: 1000,
      maxBatchSize: 100,
      messagePriority: {
        normal: { fanout: 5, ttl: 5 },
        high: { fanout: 7, ttl: 7 },
      },
    };
  }

  onAnnouncement(handler: AnnouncementHandler): void {
    this.handlers.add(handler);
  }
  offAnnouncement(handler: AnnouncementHandler): void {
    this.handlers.delete(handler);
  }

  async handleAnnouncement(announcement: BlockAnnouncement): Promise<void> {
    this.sentAnnouncements.push(announcement);
    for (const handler of this.handlers) {
      try {
        handler(announcement);
      } catch {
        /* ignore */
      }
    }
  }
}

const POOL_NAME = 'TestBrightChain';
const auth = new ECDSANodeAuthenticator();

describe('Node Admission — Adversarial E2E Tests', () => {
  const adminUser = generateKeyPair();
  const newNode = generateKeyPair();
  const attacker = generateKeyPair();

  let adminAcl: IAclDocument;

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
  });

  // ── Test: Approved node can write ────────────────────────────────

  it('full flow: request → approve → write succeeds', async () => {
    const gossip = new InProcessGossipService();
    const adminNodeId = 'admin-node';
    const newNodeId = 'new-node';

    // Admin's admission service
    const adminAdmission = new NodeAdmissionService(
      gossip,
      auth,
      POOL_NAME,
      adminNodeId,
      Buffer.from(adminUser.publicKey).toString('hex'),
    );
    adminAdmission.registerGossipHandlers();

    // New node sends a join request
    const newNodeAdmission = new NodeAdmissionService(
      gossip,
      auth,
      POOL_NAME,
      newNodeId,
      Buffer.from(newNode.publicKey).toString('hex'),
    );
    await newNodeAdmission.requestPoolJoin('Please let me in');

    // Admin should have the pending request
    const pending = adminAdmission.getPendingRequests();
    expect(pending).toHaveLength(1);
    expect(pending[0].requestingNodeId).toBe(newNodeId);

    // Admin approves
    const store = new MemoryBlockStore(BlockSize.Small);
    const db = new BrightDb(store, {
      name: POOL_NAME,
      headRegistry: HeadRegistry.createIsolated(),
    });
    await db.connect();

    const result = await adminAdmission.approveJoinRequest(
      newNodeId,
      adminAcl,
      adminUser.privateKey,
      db,
    );
    expect(result.success).toBe(true);
    expect(result.updatedAcl).toBeDefined();

    // Verify the new node is in the updated ACL
    const updatedAcl = result.updatedAcl!;
    const newNodeKeyHex = Buffer.from(newNode.publicKey).toString('hex');
    const isInAcl = updatedAcl.authorizedWriters.some(
      (w) => Buffer.from(w).toString('hex') === newNodeKeyHex,
    );
    expect(isInAcl).toBe(true);

    // Now verify the new node can actually write with the updated ACL
    const aclManager = new WriteAclManager(store, auth);
    aclManager.setCachedAcl(updatedAcl);

    const securedDb = new BrightDb(store, {
      name: POOL_NAME,
      headRegistry: HeadRegistry.createIsolated(),
      writeAclConfig: { aclService: aclManager, authenticator: auth },
    });
    await securedDb.connect();
    const headReg = securedDb.getHeadRegistry();
    if ('setLocalSigner' in headReg) {
      (headReg as AuthorizedHeadRegistry).setLocalSigner({
        publicKey: newNode.publicKey,
        privateKey: newNode.privateKey,
      });
    }

    const coll = securedDb.collection('users');
    await expect(
      coll.insertOne({ _id: 'new-user', name: 'NewNodeUser' }),
    ).resolves.not.toThrow();
  });

  // ── Test: Denied node cannot write ───────────────────────────────

  it('denied node cannot write to the pool', async () => {
    const gossip = new InProcessGossipService();

    const adminAdmission = new NodeAdmissionService(
      gossip,
      auth,
      POOL_NAME,
      'admin-node',
      Buffer.from(adminUser.publicKey).toString('hex'),
    );
    adminAdmission.registerGossipHandlers();

    // New node requests
    const deniedAdmission = new NodeAdmissionService(
      gossip,
      auth,
      POOL_NAME,
      'denied-node',
      Buffer.from(newNode.publicKey).toString('hex'),
    );
    await deniedAdmission.requestPoolJoin();

    // Admin denies
    await adminAdmission.denyJoinRequest('denied-node', 'Not trusted');

    // Verify denial was gossiped
    const denials = gossip.sentAnnouncements.filter(
      (a) => a.type === 'pool_join_denied',
    );
    expect(denials).toHaveLength(1);

    // The denied node tries to write with the original ACL (no changes)
    const store = new MemoryBlockStore(BlockSize.Small);
    const aclManager = new WriteAclManager(store, auth);
    aclManager.setCachedAcl(adminAcl); // Original ACL — denied node not in it

    const db = new BrightDb(store, {
      name: POOL_NAME,
      headRegistry: HeadRegistry.createIsolated(),
      writeAclConfig: { aclService: aclManager, authenticator: auth },
    });
    await db.connect();
    const headReg = db.getHeadRegistry();
    if ('setLocalSigner' in headReg) {
      (headReg as AuthorizedHeadRegistry).setLocalSigner({
        publicKey: newNode.publicKey,
        privateKey: newNode.privateKey,
      });
    }

    const coll = db.collection('users');
    await expect(
      coll.insertOne({ _id: 'denied-write', name: 'ShouldFail' }),
    ).rejects.toThrow(/authorization/i);
  });

  // ── Test: Unapproved node cannot write ───────────────────────────

  it('node that sent request but was not approved cannot write', async () => {
    const gossip = new InProcessGossipService();

    const adminAdmission = new NodeAdmissionService(
      gossip,
      auth,
      POOL_NAME,
      'admin-node',
      Buffer.from(adminUser.publicKey).toString('hex'),
    );
    adminAdmission.registerGossipHandlers();

    // Node sends request but admin doesn't act on it
    const unapprovedAdmission = new NodeAdmissionService(
      gossip,
      auth,
      POOL_NAME,
      'unapproved-node',
      Buffer.from(newNode.publicKey).toString('hex'),
    );
    await unapprovedAdmission.requestPoolJoin();

    // Request is pending
    expect(adminAdmission.getPendingRequests()).toHaveLength(1);

    // But the node tries to write anyway — ACL hasn't changed
    const store = new MemoryBlockStore(BlockSize.Small);
    const aclManager = new WriteAclManager(store, auth);
    aclManager.setCachedAcl(adminAcl);

    const db = new BrightDb(store, {
      name: POOL_NAME,
      headRegistry: HeadRegistry.createIsolated(),
      writeAclConfig: { aclService: aclManager, authenticator: auth },
    });
    await db.connect();
    const headReg = db.getHeadRegistry();
    if ('setLocalSigner' in headReg) {
      (headReg as AuthorizedHeadRegistry).setLocalSigner({
        publicKey: newNode.publicKey,
        privateKey: newNode.privateKey,
      });
    }

    const coll = db.collection('users');
    await expect(
      coll.insertOne({ _id: 'unapproved-write', name: 'ShouldFail' }),
    ).rejects.toThrow(/authorization/i);
  });

  // ── Test: Non-admin cannot approve ───────────────────────────────

  it('node with Write but not Admin permission cannot approve requests', async () => {
    // Create an ACL where attacker has Write but not Admin
    const aclWithWriter = await addNodeToAcl(
      adminAcl,
      attacker.publicKey,
      adminUser.privateKey,
      auth,
    );

    const gossip = new InProcessGossipService();

    // Attacker's admission service (they're a writer, not admin)
    const attackerAdmission = new NodeAdmissionService(
      gossip,
      auth,
      POOL_NAME,
      'attacker-node',
      Buffer.from(attacker.publicKey).toString('hex'),
    );
    attackerAdmission.registerGossipHandlers();

    // Someone requests to join
    const requesterAdmission = new NodeAdmissionService(
      gossip,
      auth,
      POOL_NAME,
      'requester-node',
      Buffer.from(newNode.publicKey).toString('hex'),
    );
    await requesterAdmission.requestPoolJoin();

    // Attacker tries to approve using their own key (not an admin)
    const store = new MemoryBlockStore(BlockSize.Small);
    const db = new BrightDb(store, {
      name: POOL_NAME,
      headRegistry: HeadRegistry.createIsolated(),
    });
    await db.connect();

    // The approval will produce an ACL signed by the attacker's key.
    // But when another node loads this ACL and tries to verify it via
    // WriteAclManager.setAcl(), the attacker's signature won't be
    // accepted because they're not in aclAdministrators.
    const result = await attackerAdmission.approveJoinRequest(
      'requester-node',
      aclWithWriter,
      attacker.privateKey,
      db,
    );

    // The approval itself "succeeds" locally (the attacker can sign anything),
    // but the resulting ACL won't be accepted by other nodes.
    // Let's verify: try to use the attacker-signed ACL on a WriteAclManager
    // that has the original admin ACL cached.
    if (result.success && result.updatedAcl) {
      const aclManager = new WriteAclManager(store, auth);
      aclManager.setCachedAcl(adminAcl); // Original ACL with admin as sole admin

      // Try to set the attacker-signed ACL — should be rejected
      const attackerSig = result.updatedAcl.creatorSignature;
      await expect(
        aclManager.setAcl(result.updatedAcl, attackerSig, attacker.publicKey),
      ).rejects.toThrow(/admin/i);
    }
  });

  // ── Test: Forged approval rejected ───────────────────────────────

  it('forged approval not signed by admin does not grant write access', async () => {
    const gossip = new InProcessGossipService();

    // Attacker gossips a fake approval
    const fakeApproval: BlockAnnouncement = {
      type: 'pool_join_approved',
      blockId: '' as BlockId,
      nodeId: 'attacker-node',
      timestamp: new Date(),
      ttl: 7,
      poolJoinApproval: {
        poolId: POOL_NAME,
        approvedNodeId: 'attacker-node',
        approvedPublicKey: Buffer.from(attacker.publicKey).toString('hex'),
        approverPublicKey: Buffer.from(attacker.publicKey).toString('hex'),
        aclSignature: 'deadbeef', // Fake signature
        aclVersion: 999,
      },
    };
    await gossip.handleAnnouncement(fakeApproval);

    // The original ACL hasn't changed — attacker still can't write
    const store = new MemoryBlockStore(BlockSize.Small);
    const aclManager = new WriteAclManager(store, auth);
    aclManager.setCachedAcl(adminAcl); // Original ACL

    const db = new BrightDb(store, {
      name: POOL_NAME,
      headRegistry: HeadRegistry.createIsolated(),
      writeAclConfig: { aclService: aclManager, authenticator: auth },
    });
    await db.connect();
    const headReg = db.getHeadRegistry();
    if ('setLocalSigner' in headReg) {
      (headReg as AuthorizedHeadRegistry).setLocalSigner({
        publicKey: attacker.publicKey,
        privateKey: attacker.privateKey,
      });
    }

    const coll = db.collection('users');
    await expect(
      coll.insertOne({ _id: 'forged-write', name: 'ShouldFail' }),
    ).rejects.toThrow(/authorization/i);
  });
});

describe('Node Admission — Gossip Signature Verification', () => {
  const adminUser = generateKeyPair();
  const newNode = generateKeyPair();
  const attacker = generateKeyPair();
  const authenticatorInstance = new ECDSANodeAuthenticator();

  let adminAcl: IAclDocument;

  beforeAll(async () => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

    adminAcl = await createMemberPoolAcl({
      poolName: POOL_NAME,
      systemUserId: 'admin-node',
      systemUserPublicKey: adminUser.publicKey,
      systemUserPrivateKey: adminUser.privateKey,
      authenticator: authenticatorInstance,
    });
  });

  it('verifyApproval returns false when approver is not an admin', async () => {
    const gossip = new InProcessGossipService();
    const admission = new NodeAdmissionService(
      gossip,
      authenticatorInstance,
      POOL_NAME,
      'admin-node',
      Buffer.from(adminUser.publicKey).toString('hex'),
    );

    // Fake approval from attacker (not an admin)
    const fakeApproval: BlockAnnouncement = {
      type: 'pool_join_approved',
      blockId: '' as BlockId,
      nodeId: 'attacker-node',
      timestamp: new Date(),
      ttl: 7,
      poolJoinApproval: {
        poolId: POOL_NAME,
        approvedNodeId: 'attacker-node',
        approvedPublicKey: Buffer.from(attacker.publicKey).toString('hex'),
        approverPublicKey: Buffer.from(attacker.publicKey).toString('hex'),
        aclSignature: 'deadbeef',
        aclVersion: 2,
      },
    };

    const isValid = await admission.verifyApproval(fakeApproval, adminAcl);
    expect(isValid).toBe(false);
  });

  it('verifyApproval returns true when approver is a valid admin', async () => {
    const gossip = new InProcessGossipService();
    const admission = new NodeAdmissionService(
      gossip,
      authenticatorInstance,
      POOL_NAME,
      'admin-node',
      Buffer.from(adminUser.publicKey).toString('hex'),
    );

    // Compute and sign the approval payload with the admin's real key
    const approverPubHex = Buffer.from(adminUser.publicKey).toString('hex');
    const payload = computeApprovalPayload(
      'new-node',
      POOL_NAME,
      approverPubHex,
    );
    const realSig = await authenticatorInstance.signChallenge(
      payload,
      adminUser.privateKey,
    );

    // Real approval from admin with a cryptographically valid signature
    const realApproval: BlockAnnouncement = {
      type: 'pool_join_approved',
      blockId: '' as BlockId,
      nodeId: 'admin-node',
      timestamp: new Date(),
      ttl: 7,
      poolJoinApproval: {
        poolId: POOL_NAME,
        approvedNodeId: 'new-node',
        approvedPublicKey: Buffer.from(newNode.publicKey).toString('hex'),
        approverPublicKey: approverPubHex,
        aclSignature: Buffer.from(realSig).toString('hex'),
        aclVersion: 2,
      },
    };

    const isValid = await admission.verifyApproval(realApproval, adminAcl);
    expect(isValid).toBe(true);
  });

  it('verifyApproval returns false for non-approval announcement types', async () => {
    const gossip = new InProcessGossipService();
    const admission = new NodeAdmissionService(
      gossip,
      authenticatorInstance,
      POOL_NAME,
      'admin-node',
      Buffer.from(adminUser.publicKey).toString('hex'),
    );

    const wrongType: BlockAnnouncement = {
      type: 'pool_join_request',
      blockId: '' as BlockId,
      nodeId: 'some-node',
      timestamp: new Date(),
      ttl: 7,
    };

    const isValid = await admission.verifyApproval(wrongType, adminAcl);
    expect(isValid).toBe(false);
  });

  it('forged approverPublicKey with garbage signature is rejected', async () => {
    const gossip = new InProcessGossipService();
    const admission = new NodeAdmissionService(
      gossip,
      authenticatorInstance,
      POOL_NAME,
      'admin-node',
      Buffer.from(adminUser.publicKey).toString('hex'),
    );

    // Attacker sets approverPublicKey to a known admin's key but provides
    // a garbage signature (they don't have the admin's private key)
    const forgedApproval: BlockAnnouncement = {
      type: 'pool_join_approved',
      blockId: '' as BlockId,
      nodeId: 'attacker-node',
      timestamp: new Date(),
      ttl: 7,
      poolJoinApproval: {
        poolId: POOL_NAME,
        approvedNodeId: 'attacker-node',
        approvedPublicKey: Buffer.from(attacker.publicKey).toString('hex'),
        approverPublicKey: Buffer.from(adminUser.publicKey).toString('hex'), // Claims to be admin
        aclSignature: 'deadbeefdeadbeefdeadbeefdeadbeef', // Garbage signature
        aclVersion: 2,
      },
    };

    const isValid = await admission.verifyApproval(forgedApproval, adminAcl);
    expect(isValid).toBe(false);
  });

  it('valid signature from real admin is accepted', async () => {
    const gossip = new InProcessGossipService();
    const admission = new NodeAdmissionService(
      gossip,
      authenticatorInstance,
      POOL_NAME,
      'admin-node',
      Buffer.from(adminUser.publicKey).toString('hex'),
    );

    // Admin signs the approval payload with their real private key
    const approverPubHex = Buffer.from(adminUser.publicKey).toString('hex');
    const payload = computeApprovalPayload(
      'new-node',
      POOL_NAME,
      approverPubHex,
    );
    const validSig = await authenticatorInstance.signChallenge(
      payload,
      adminUser.privateKey,
    );

    const validApproval: BlockAnnouncement = {
      type: 'pool_join_approved',
      blockId: '' as BlockId,
      nodeId: 'admin-node',
      timestamp: new Date(),
      ttl: 7,
      poolJoinApproval: {
        poolId: POOL_NAME,
        approvedNodeId: 'new-node',
        approvedPublicKey: Buffer.from(newNode.publicKey).toString('hex'),
        approverPublicKey: approverPubHex,
        aclSignature: Buffer.from(validSig).toString('hex'),
        aclVersion: 2,
      },
    };

    const isValid = await admission.verifyApproval(validApproval, adminAcl);
    expect(isValid).toBe(true);
  });
});
