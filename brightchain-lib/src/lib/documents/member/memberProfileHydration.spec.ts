import {
  EmailString,
  GuidV4Uint8Array,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { MemberStatusType } from '../../enumerations/memberStatusType';
import {
  IPrivateMemberProfileHydratedData,
  IPrivateMemberProfileStorageData,
  IPublicMemberProfileHydratedData,
  IPublicMemberProfileStorageData,
} from '../../interfaces/member/profileStorage';
import { ServiceProvider } from '../../services/service.provider';
import {
  privateMemberProfileHydrationSchema,
  publicMemberProfileHydrationSchema,
} from './memberProfileHydration';

describe('MemberProfileHydration', () => {
  let testId: GuidV4Uint8Array;

  beforeEach(() => {
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    const { member } = Member.newMember(
      sp.eciesService,
      MemberType.User,
      'test-user',
      new EmailString('test@example.com'),
    );
    testId = member.id;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('Public Profile Hydration', () => {
    it('should dehydrate public profile data to storage format', () => {
      const hydratedData: IPublicMemberProfileHydratedData<GuidV4Uint8Array> = {
        id: testId,
        status: MemberStatusType.Active,
        reputation: 100,
        storageQuota: BigInt(1024 * 1024 * 1024 * 100),
        storageUsed: BigInt(1024 * 500),
        lastActive: new Date('2026-01-20T10:00:00Z'),
        dateCreated: new Date('2026-01-01T00:00:00Z'),
        dateUpdated: new Date('2026-01-20T10:00:00Z'),
      };

      const schema = publicMemberProfileHydrationSchema<GuidV4Uint8Array>();
      const storageData = schema.dehydrate(hydratedData);

      expect(storageData.id).toBeInstanceOf(Uint8Array);
      expect(storageData.status).toBe(MemberStatusType.Active);
      expect(storageData.reputation).toBe(100);
      expect(storageData.storageQuota).toBe('107374182400'); // BigInt as string
      expect(storageData.storageUsed).toBe('512000'); // BigInt as string
      expect(storageData.lastActive).toBe('2026-01-20T10:00:00.000Z');
      expect(storageData.dateCreated).toBe('2026-01-01T00:00:00.000Z');
      expect(storageData.dateUpdated).toBe('2026-01-20T10:00:00.000Z');
    });

    it('should hydrate storage data to public profile format', () => {
      const idProvider =
        ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
      const idBytes = idProvider.toBytes(testId);

      const storageData: IPublicMemberProfileStorageData = {
        id: idBytes,
        status: MemberStatusType.Active,
        reputation: 150,
        storageQuota: '214748364800', // 200MB as string
        storageUsed: '1048576', // 1MB as string
        lastActive: '2026-01-24T12:00:00.000Z',
        dateCreated: '2026-01-01T00:00:00.000Z',
        dateUpdated: '2026-01-24T12:00:00.000Z',
      };

      const schema = publicMemberProfileHydrationSchema<GuidV4Uint8Array>();
      const hydratedData = schema.hydrate(storageData);

      expect(hydratedData.id).toEqual(testId);
      expect(hydratedData.status).toBe(MemberStatusType.Active);
      expect(hydratedData.reputation).toBe(150);
      expect(hydratedData.storageQuota).toBe(BigInt('214748364800'));
      expect(hydratedData.storageUsed).toBe(BigInt('1048576'));
      expect(hydratedData.lastActive).toEqual(
        new Date('2026-01-24T12:00:00.000Z'),
      );
      expect(hydratedData.dateCreated).toEqual(
        new Date('2026-01-01T00:00:00.000Z'),
      );
      expect(hydratedData.dateUpdated).toEqual(
        new Date('2026-01-24T12:00:00.000Z'),
      );
    });

    it('should handle round-trip conversion for public data', () => {
      const original: IPublicMemberProfileHydratedData<GuidV4Uint8Array> = {
        id: testId,
        status: MemberStatusType.Suspended,
        reputation: 75,
        storageQuota: BigInt(1024 * 1024 * 50),
        storageUsed: BigInt(1024 * 100),
        lastActive: new Date('2026-01-15T08:30:00Z'),
        dateCreated: new Date('2025-12-01T00:00:00Z'),
        dateUpdated: new Date('2026-01-15T08:30:00Z'),
      };

      const schema = publicMemberProfileHydrationSchema<GuidV4Uint8Array>();
      const storage = schema.dehydrate(original);
      const roundTrip = schema.hydrate(storage);

      expect(roundTrip.id).toEqual(original.id);
      expect(roundTrip.status).toBe(original.status);
      expect(roundTrip.reputation).toBe(original.reputation);
      expect(roundTrip.storageQuota).toBe(original.storageQuota);
      expect(roundTrip.storageUsed).toBe(original.storageUsed);
      expect(roundTrip.lastActive).toEqual(original.lastActive);
      expect(roundTrip.dateCreated).toEqual(original.dateCreated);
      expect(roundTrip.dateUpdated).toEqual(original.dateUpdated);
    });
  });

  describe('Private Profile Hydration', () => {
    let peerId1: GuidV4Uint8Array;
    let peerId2: GuidV4Uint8Array;

    beforeEach(() => {
      const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
      const { member: peer1 } = Member.newMember(
        sp.eciesService,
        MemberType.User,
        'peer1',
        new EmailString('peer1@example.com'),
      );
      peerId1 = peer1.id;

      const { member: peer2 } = Member.newMember(
        sp.eciesService,
        MemberType.User,
        'peer2',
        new EmailString('peer2@example.com'),
      );
      peerId2 = peer2.id;
    });

    it('should dehydrate private profile data to storage format', () => {
      const hydratedData: IPrivateMemberProfileHydratedData<GuidV4Uint8Array> =
        {
          id: testId,
          trustedPeers: [peerId1, peerId2],
          blockedPeers: [],
          settings: { theme: 'dark', notifications: true },
          activityLog: [
            {
              action: 'login',
              timestamp: new Date('2026-01-24T10:00:00Z'),
              metadata: { ip: '127.0.0.1' },
            },
          ],
          dateCreated: new Date('2026-01-01T00:00:00Z'),
          dateUpdated: new Date('2026-01-24T10:00:00Z'),
        };

      const schema = privateMemberProfileHydrationSchema<GuidV4Uint8Array>();
      const storageData = schema.dehydrate(hydratedData);

      expect(storageData.id).toBeInstanceOf(Uint8Array);
      expect(storageData.trustedPeers).toHaveLength(2);
      expect(storageData.trustedPeers[0]).toBeInstanceOf(Uint8Array);
      expect(storageData.blockedPeers).toHaveLength(0);
      expect(storageData.settings).toEqual({
        theme: 'dark',
        notifications: true,
      });
      expect(storageData.activityLog).toHaveLength(1);
      expect(storageData.activityLog[0].action).toBe('login');
      expect(storageData.activityLog[0].timestamp).toBe(
        '2026-01-24T10:00:00.000Z',
      );
      expect(storageData.activityLog[0].metadata).toEqual({ ip: '127.0.0.1' });
    });

    it('should hydrate storage data to private profile format', () => {
      const idProvider =
        ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
      const idBytes = idProvider.toBytes(testId);
      const peer1Bytes = idProvider.toBytes(peerId1);

      const storageData: IPrivateMemberProfileStorageData = {
        id: idBytes,
        trustedPeers: [peer1Bytes],
        blockedPeers: [],
        settings: { language: 'en', timezone: 'UTC' },
        activityLog: [
          {
            action: 'upload',
            timestamp: '2026-01-23T15:30:00.000Z',
            metadata: { fileSize: 1024 },
          },
        ],
        dateCreated: '2026-01-01T00:00:00.000Z',
        dateUpdated: '2026-01-23T15:30:00.000Z',
      };

      const schema = privateMemberProfileHydrationSchema<GuidV4Uint8Array>();
      const hydratedData = schema.hydrate(storageData);

      expect(hydratedData.id).toEqual(testId);
      expect(hydratedData.trustedPeers).toHaveLength(1);
      expect(hydratedData.trustedPeers[0]).toEqual(peerId1);
      expect(hydratedData.blockedPeers).toHaveLength(0);
      expect(hydratedData.settings).toEqual({
        language: 'en',
        timezone: 'UTC',
      });
      expect(hydratedData.activityLog).toHaveLength(1);
      expect(hydratedData.activityLog[0].action).toBe('upload');
      expect(hydratedData.activityLog[0].timestamp).toEqual(
        new Date('2026-01-23T15:30:00.000Z'),
      );
    });

    it('should handle round-trip conversion for private data', () => {
      const original: IPrivateMemberProfileHydratedData<GuidV4Uint8Array> = {
        id: testId,
        trustedPeers: [peerId1],
        blockedPeers: [peerId2],
        settings: { customSetting: 'value' },
        activityLog: [
          {
            action: 'test',
            timestamp: new Date('2026-01-20T12:00:00Z'),
            metadata: { test: true },
          },
        ],
        dateCreated: new Date('2026-01-01T00:00:00Z'),
        dateUpdated: new Date('2026-01-20T12:00:00Z'),
      };

      const schema = privateMemberProfileHydrationSchema<GuidV4Uint8Array>();
      const storage = schema.dehydrate(original);
      const roundTrip = schema.hydrate(storage);

      expect(roundTrip.id).toEqual(original.id);
      expect(roundTrip.trustedPeers).toHaveLength(1);
      expect(roundTrip.trustedPeers[0]).toEqual(peerId1);
      expect(roundTrip.blockedPeers).toHaveLength(1);
      expect(roundTrip.blockedPeers[0]).toEqual(peerId2);
      expect(roundTrip.settings).toEqual(original.settings);
      expect(roundTrip.activityLog).toHaveLength(1);
      expect(roundTrip.activityLog[0].action).toBe('test');
      expect(roundTrip.activityLog[0].timestamp).toEqual(
        original.activityLog[0].timestamp,
      );
      expect(roundTrip.activityLog[0].metadata).toEqual(
        original.activityLog[0].metadata,
      );
    });

    it('should handle empty arrays and objects', () => {
      const hydratedData: IPrivateMemberProfileHydratedData<GuidV4Uint8Array> =
        {
          id: testId,
          trustedPeers: [],
          blockedPeers: [],
          settings: {},
          activityLog: [],
          dateCreated: new Date('2026-01-01T00:00:00Z'),
          dateUpdated: new Date('2026-01-01T00:00:00Z'),
        };

      const schema = privateMemberProfileHydrationSchema<GuidV4Uint8Array>();
      const storage = schema.dehydrate(hydratedData);
      const roundTrip = schema.hydrate(storage);

      expect(roundTrip.trustedPeers).toEqual([]);
      expect(roundTrip.blockedPeers).toEqual([]);
      expect(roundTrip.settings).toEqual({});
      expect(roundTrip.activityLog).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large BigInt values', () => {
      const largeValue = BigInt('9007199254740991'); // MAX_SAFE_INTEGER
      const hydratedData: IPublicMemberProfileHydratedData<GuidV4Uint8Array> = {
        id: testId,
        status: MemberStatusType.Active,
        reputation: 0,
        storageQuota: largeValue,
        storageUsed: largeValue,
        lastActive: new Date(),
        dateCreated: new Date(),
        dateUpdated: new Date(),
      };

      const schema = publicMemberProfileHydrationSchema<GuidV4Uint8Array>();
      const storage = schema.dehydrate(hydratedData);
      const roundTrip = schema.hydrate(storage);

      expect(roundTrip.storageQuota).toBe(largeValue);
      expect(roundTrip.storageUsed).toBe(largeValue);
    });

    it('should handle complex metadata in activity log', () => {
      const complexMetadata = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        string: 'test',
        boolean: true,
        null: null,
      };

      const hydratedData: IPrivateMemberProfileHydratedData<GuidV4Uint8Array> =
        {
          id: testId,
          trustedPeers: [],
          blockedPeers: [],
          settings: {},
          activityLog: [
            {
              action: 'complex',
              timestamp: new Date('2026-01-24T12:00:00Z'),
              metadata: complexMetadata,
            },
          ],
          dateCreated: new Date(),
          dateUpdated: new Date(),
        };

      const schema = privateMemberProfileHydrationSchema<GuidV4Uint8Array>();
      const storage = schema.dehydrate(hydratedData);
      const roundTrip = schema.hydrate(storage);

      expect(roundTrip.activityLog[0].metadata).toEqual(complexMetadata);
    });
  });
});
