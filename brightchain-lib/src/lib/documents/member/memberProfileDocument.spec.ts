/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ECIESService,
  EmailString,
  GuidV4Uint8Array,
  Member,
  MemberType,
  ShortHexGuid,
  TypedIdProviderWrapper,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { MemberStatusType } from '../../enumerations/memberStatusType';
import { MemberError } from '../../errors/memberError';
import {
  IPrivateMemberProfileHydratedData,
  IPublicMemberProfileHydratedData,
} from '../../interfaces/member/profileStorage';
import { ServiceProvider } from '../../services/service.provider';
import { Checksum } from '../../types/checksum';
import { MemberProfileDocument } from './memberProfileDocument';

describe('MemberProfileDocument', () => {
  let eciesService: ECIESService<GuidV4Uint8Array>;
  let signer: Member<GuidV4Uint8Array>;
  let idProvider: TypedIdProviderWrapper<GuidV4Uint8Array>;
  let testId: GuidV4Uint8Array;
  let publicProfileData: IPublicMemberProfileHydratedData<GuidV4Uint8Array>;
  let privateProfileData: IPrivateMemberProfileHydratedData<GuidV4Uint8Array>;

  beforeEach(async () => {
    // Initialize service provider
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    idProvider = sp.idProvider;
    eciesService = sp.eciesService;

    // Create test member for signing
    const { member } = Member.newMember(
      eciesService,
      MemberType.User,
      'test-signer',
      new EmailString('signer@example.com'),
    );
    signer = member;
    testId = signer.id;

    // Create test profile data
    publicProfileData = {
      id: testId,
      status: MemberStatusType.Active,
      reputation: 100,
      storageQuota: BigInt(1024 * 1024 * 100), // 100MB
      storageUsed: BigInt(1024 * 500), // 500KB
      lastActive: new Date('2026-01-20T10:00:00Z'),
      dateCreated: new Date('2026-01-01T00:00:00Z'),
      dateUpdated: new Date('2026-01-20T10:00:00Z'),
    };

    privateProfileData = {
      id: testId,
      trustedPeers: [],
      blockedPeers: [],
      settings: { theme: 'dark', notifications: true },
      activityLog: [],
      dateCreated: new Date('2026-01-01T00:00:00Z'),
      dateUpdated: new Date('2026-01-20T10:00:00Z'),
    };
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('Factory Pattern', () => {
    it('should create a profile document using factory method', () => {
      const doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        privateProfileData,
      );

      expect(doc).toBeInstanceOf(MemberProfileDocument);
      expect(doc.id).toBe(
        uint8ArrayToHex(idProvider.toBytes(testId)) as ShortHexGuid,
      );
    });

    it('should accept custom block size configuration', () => {
      const doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        privateProfileData,
        { blockSize: BlockSize.Large },
      );

      expect(doc).toBeInstanceOf(MemberProfileDocument);
    });

    it('should throw error when trying to use constructor directly', () => {
      expect(() => {
        new (MemberProfileDocument as any)(
          'invalid-token',
          testId,
          signer,
          publicProfileData,
          privateProfileData,
        );
      }).toThrow();
    });
  });

  describe('Data Access', () => {
    let doc: MemberProfileDocument<GuidV4Uint8Array>;

    beforeEach(() => {
      doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        privateProfileData,
      );
    });

    it('should retrieve public profile data', () => {
      const publicData = doc.getPublicHydrated();

      expect(publicData.id).toEqual(testId);
      expect(publicData.status).toBe(MemberStatusType.Active);
      expect(publicData.reputation).toBe(100);
      expect(publicData.storageQuota).toBe(BigInt(1024 * 1024 * 100));
      expect(publicData.storageUsed).toBe(BigInt(1024 * 500));
    });

    it('should retrieve private profile data', () => {
      const privateData = doc.getPrivateHydrated();

      expect(privateData.id).toEqual(testId);
      expect(privateData.settings).toEqual({
        theme: 'dark',
        notifications: true,
      });
      expect(privateData.trustedPeers).toEqual([]);
      expect(privateData.blockedPeers).toEqual([]);
      expect(privateData.activityLog).toEqual([]);
    });
  });

  describe('Profile Updates', () => {
    let doc: MemberProfileDocument<GuidV4Uint8Array>;

    beforeEach(() => {
      doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        privateProfileData,
      );
    });

    it('should update public profile data', () => {
      const updates = {
        reputation: 150,
        storageUsed: BigInt(1024 * 1000), // 1MB
        lastActive: new Date('2026-01-24T12:00:00Z'),
      };

      doc.updatePublicData(updates);
      const publicData = doc.getPublicHydrated();

      expect(publicData.reputation).toBe(150);
      expect(publicData.storageUsed).toBe(BigInt(1024 * 1000));
      expect(publicData.lastActive).toEqual(updates.lastActive);
    });

    it('should update private profile data', () => {
      const updates = {
        settings: { theme: 'light', notifications: false },
      };

      doc.updatePrivateData(updates);
      const privateData = doc.getPrivateHydrated();

      expect(privateData.settings).toEqual({
        theme: 'light',
        notifications: false,
      });
    });

    it('should update dateUpdated when updating data', () => {
      const originalDate = doc.getPublicHydrated().dateUpdated;

      // Wait a bit to ensure time difference
      const newDate = new Date(Date.now() + 100);
      doc.updatePublicData({ lastActive: newDate });

      const updatedDate = doc.getPublicHydrated().dateUpdated;
      expect(updatedDate.getTime()).toBeGreaterThanOrEqual(
        originalDate.getTime(),
      );
    });
  });

  describe('Peer Management', () => {
    let doc: MemberProfileDocument<GuidV4Uint8Array>;
    let peerId1: GuidV4Uint8Array;
    let peerId2: GuidV4Uint8Array;

    beforeEach(() => {
      doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        privateProfileData,
      );

      const { member: peer1 } = Member.newMember(
        eciesService,
        MemberType.User,
        'peer1',
        new EmailString('peer1@example.com'),
      );
      peerId1 = peer1.id;

      const { member: peer2 } = Member.newMember(
        eciesService,
        MemberType.User,
        'peer2',
        new EmailString('peer2@example.com'),
      );
      peerId2 = peer2.id;
    });

    it('should add trusted peer', () => {
      doc.addTrustedPeer(peerId1);
      const privateData = doc.getPrivateHydrated();

      expect(privateData.trustedPeers).toContainEqual(peerId1);
      expect(privateData.trustedPeers.length).toBe(1);
    });

    it('should not add duplicate trusted peer', () => {
      doc.addTrustedPeer(peerId1);
      doc.addTrustedPeer(peerId1);
      const privateData = doc.getPrivateHydrated();

      expect(privateData.trustedPeers.length).toBe(1);
    });

    it('should remove trusted peer', () => {
      doc.addTrustedPeer(peerId1);
      doc.addTrustedPeer(peerId2);
      doc.removeTrustedPeer(peerId1);
      const privateData = doc.getPrivateHydrated();

      expect(privateData.trustedPeers).not.toContainEqual(peerId1);
      expect(privateData.trustedPeers).toContainEqual(peerId2);
      expect(privateData.trustedPeers.length).toBe(1);
    });

    it('should add blocked peer', () => {
      doc.addBlockedPeer(peerId1);
      const privateData = doc.getPrivateHydrated();

      expect(privateData.blockedPeers).toContainEqual(peerId1);
      expect(privateData.blockedPeers.length).toBe(1);
    });

    it('should not add duplicate blocked peer', () => {
      doc.addBlockedPeer(peerId1);
      doc.addBlockedPeer(peerId1);
      const privateData = doc.getPrivateHydrated();

      expect(privateData.blockedPeers.length).toBe(1);
    });

    it('should remove blocked peer', () => {
      doc.addBlockedPeer(peerId1);
      doc.addBlockedPeer(peerId2);
      doc.removeBlockedPeer(peerId1);
      const privateData = doc.getPrivateHydrated();

      expect(privateData.blockedPeers).not.toContainEqual(peerId1);
      expect(privateData.blockedPeers).toContainEqual(peerId2);
      expect(privateData.blockedPeers.length).toBe(1);
    });
  });

  describe('Activity Log', () => {
    let doc: MemberProfileDocument<GuidV4Uint8Array>;

    beforeEach(() => {
      doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        privateProfileData,
      );
    });

    it('should add activity log entry', () => {
      const timestamp = new Date('2026-01-24T12:00:00Z');
      doc.addActivityLogEntry('login', timestamp, { ip: '127.0.0.1' });

      const privateData = doc.getPrivateHydrated();
      expect(privateData.activityLog.length).toBe(1);
      expect(privateData.activityLog[0].action).toBe('login');
      expect(privateData.activityLog[0].timestamp).toEqual(timestamp);
      expect(privateData.activityLog[0].metadata).toEqual({ ip: '127.0.0.1' });
    });

    it('should add multiple activity log entries', () => {
      doc.addActivityLogEntry('login', new Date());
      doc.addActivityLogEntry('upload', new Date());
      doc.addActivityLogEntry('download', new Date());

      const privateData = doc.getPrivateHydrated();
      expect(privateData.activityLog.length).toBe(3);
    });
  });

  describe('CBL Generation', () => {
    let doc: MemberProfileDocument<GuidV4Uint8Array>;

    beforeEach(() => {
      doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        privateProfileData,
      );
    });

    it('should generate CBLs successfully', async () => {
      await doc.generateCBLs();

      expect(doc.getPublicCBL()).toBeInstanceOf(Checksum);
      expect(doc.getPrivateCBL()).toBeInstanceOf(Checksum);
    });

    it('should create valid CBL data', async () => {
      await doc.generateCBLs();

      const publicCBL = await doc.toPublicCBL();
      const privateCBL = await doc.toPrivateCBL();

      expect(publicCBL).toBeInstanceOf(Uint8Array);
      expect(privateCBL).toBeInstanceOf(Uint8Array);
      expect(publicCBL.length).toBeGreaterThan(0);
      expect(privateCBL.length).toBeGreaterThan(0);
    });

    it('should throw error when getting CBL before generation', () => {
      expect(() => doc.getPublicCBL()).toThrow(MemberError);
      expect(() => doc.getPrivateCBL()).toThrow(MemberError);
    });

    it('should throw error when accessing CBL data before generation', async () => {
      await expect(doc.toPublicCBL()).rejects.toThrow(MemberError);
      await expect(doc.toPrivateCBL()).rejects.toThrow(MemberError);
    });
  });

  describe('Data Isolation', () => {
    let doc: MemberProfileDocument<GuidV4Uint8Array>;

    beforeEach(() => {
      doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        privateProfileData,
      );
    });

    it('should not expose private data in public methods', () => {
      const publicData = doc.getPublicHydrated();

      expect((publicData as any).trustedPeers).toBeUndefined();
      expect((publicData as any).blockedPeers).toBeUndefined();
      expect((publicData as any).settings).toBeUndefined();
      expect((publicData as any).activityLog).toBeUndefined();
    });

    it('should keep public and private data separate', () => {
      doc.updatePublicData({ reputation: 200 });
      doc.updatePrivateData({ settings: { newSetting: 'value' } });

      const publicData = doc.getPublicHydrated();
      const privateData = doc.getPrivateHydrated();

      expect(publicData.reputation).toBe(200);
      expect(privateData.settings).toEqual({ newSetting: 'value' });
      expect((publicData as any).settings).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle BigInt serialization', () => {
      const largeQuota = BigInt('999999999999999999');
      const data = { ...publicProfileData, storageQuota: largeQuota };

      const doc = MemberProfileDocument.create(
        testId,
        signer,
        data,
        privateProfileData,
      );

      const retrieved = doc.getPublicHydrated();
      expect(retrieved.storageQuota).toBe(largeQuota);
    });

    it('should handle empty activity log', () => {
      const doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        privateProfileData,
      );

      const privateData = doc.getPrivateHydrated();
      expect(privateData.activityLog).toEqual([]);
    });

    it('should handle empty settings object', () => {
      const data = { ...privateProfileData, settings: {} };
      const doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        data,
      );

      const privateData = doc.getPrivateHydrated();
      expect(privateData.settings).toEqual({});
    });

    it('should handle multiple peer operations', () => {
      const doc = MemberProfileDocument.create(
        testId,
        signer,
        publicProfileData,
        privateProfileData,
      );

      const { member: peer1 } = Member.newMember(
        eciesService,
        MemberType.User,
        'peer1',
        new EmailString('peer1@example.com'),
      );
      const { member: peer2 } = Member.newMember(
        eciesService,
        MemberType.User,
        'peer2',
        new EmailString('peer2@example.com'),
      );

      doc.addTrustedPeer(peer1.id);
      doc.addBlockedPeer(peer2.id);
      doc.removeTrustedPeer(peer1.id);

      const privateData = doc.getPrivateHydrated();
      expect(privateData.trustedPeers.length).toBe(0);
      expect(privateData.blockedPeers.length).toBe(1);
      expect(privateData.blockedPeers).toContainEqual(peer2.id);
    });
  });
});
