import { MembersController } from './members';

// Mock the application and services
const createMockApplication = () => {
  const mockMemberStore = {
    getMemberProfile: jest.fn(),
  };

  const mockServices = {
    get: jest.fn((serviceName: string) => {
      if (serviceName === 'memberStore') {
        return mockMemberStore;
      }
      if (serviceName === 'idProvider') {
        return {
          fromString: jest.fn((str: string) => Buffer.from(str, 'hex')),
          toBytes: jest.fn((id: any) => {
            if (Buffer.isBuffer(id)) return id;
            if (id instanceof Uint8Array) return id;
            return Buffer.from(id);
          }),
        };
      }
      return null;
    }),
  };

  // Minimal shape expected by BaseController: transaction manager needs
  // `db.connection` and `environment.mongo.useTransactions`.
  const mockSession = {
    withTransaction: jest.fn(async (cb: (sess: unknown) => Promise<unknown>) =>
      cb(undefined),
    ),
    endSession: jest.fn(),
  } as any;

  const mockConnection = {
    startSession: jest.fn(async () => mockSession),
  } as any;

  return {
    services: mockServices,
    memberStore: mockMemberStore,
    db: { connection: mockConnection },
    environment: { mongo: { useTransactions: false } },
    constants: {},
  };
};

describe('MembersController - Profile Operations', () => {
  describe('handleGetMemberProfile', () => {
    it('should return 500 if memberStore service is not available', async () => {
      const mockApp = createMockApplication();
      mockApp.services.get = jest.fn((serviceName: string) => null);

      const controller = new MembersController(mockApp as any);
      const mockReq = {
        params: { memberId: 'test-id' },
        user: undefined,
      } as any;

      const result = await (controller as any).handleGetMemberProfile(mockReq);

      expect(result.statusCode).toBe(500);
      expect(result.response.error).toBe('MemberStore service not available');
    });

    it('should return 400 if member ID is not provided', async () => {
      const mockApp = createMockApplication();
      const controller = new MembersController(mockApp as any);
      const mockReq = {
        params: {},
        user: undefined,
      } as any;

      const result = await (controller as any).handleGetMemberProfile(mockReq);

      expect(result.statusCode).toBe(400);
      expect(result.response.error).toBe('Member ID is required');
    });

    it('should fetch profile from memberStore', async () => {
      const mockApp = createMockApplication();
      const testId = Buffer.from('test-member-id');

      mockApp.memberStore.getMemberProfile.mockResolvedValue({
        publicProfile: {
          id: testId,
          status: 'Active',
          reputation: 100,
          // 100 GiB to match expected formatted string
          storageQuota: BigInt(1024 * 1024 * 1024 * 100),
          storageUsed: BigInt(1024 * 500),
          lastActive: new Date('2026-01-20T10:00:00Z'),
          dateCreated: new Date('2026-01-01T00:00:00Z'),
          dateUpdated: new Date('2026-01-20T10:00:00Z'),
        },
        privateProfile: null,
      });

      const controller = new MembersController(mockApp as any);
      const mockReq = {
        params: { memberId: testId.toString('hex') },
        user: undefined,
      } as any;

      const result = await (controller as any).handleGetMemberProfile(mockReq);

      expect(result.statusCode).toBe(200);
      expect(mockApp.memberStore.getMemberProfile).toHaveBeenCalled();
    });

    it('should include private profile for authenticated owner', async () => {
      const mockApp = createMockApplication();
      const testId = 'test-member-id';
      const testIdBuffer = Buffer.from(testId, 'hex');

      mockApp.memberStore.getMemberProfile.mockResolvedValue({
        publicProfile: {
          id: testIdBuffer,
          status: 'Active',
          reputation: 150,
          storageQuota: BigInt(1024 * 1024 * 200),
          storageUsed: BigInt(1024 * 1000),
          lastActive: new Date('2026-01-24T12:00:00Z'),
          dateCreated: new Date('2026-01-01T00:00:00Z'),
          dateUpdated: new Date('2026-01-24T12:00:00Z'),
        },
        privateProfile: {
          id: testIdBuffer,
          trustedPeers: [],
          blockedPeers: [],
          settings: { theme: 'dark' },
          activityLog: [],
          dateCreated: new Date('2026-01-01T00:00:00Z'),
          dateUpdated: new Date('2026-01-24T12:00:00Z'),
        },
      });

      const controller = new MembersController(mockApp as any);
      const mockReq = {
        params: { memberId: testId },
        user: { id: testId },
      } as any;

      const result = await (controller as any).handleGetMemberProfile(mockReq);

      expect(result.statusCode).toBe(200);
      expect(result.response.privateProfile).toBeDefined();
    });

    it('should not include private profile for non-owner', async () => {
      const mockApp = createMockApplication();
      const testId = 'test-member-id';
      const otherUserId = 'other-user-id';
      const testIdBuffer = Buffer.from(testId, 'hex');

      mockApp.memberStore.getMemberProfile.mockResolvedValue({
        publicProfile: {
          id: testIdBuffer,
          status: 'Active',
          reputation: 100,
          storageQuota: BigInt(1024 * 1024 * 100),
          storageUsed: BigInt(1024 * 500),
          lastActive: new Date('2026-01-20T10:00:00Z'),
          dateCreated: new Date('2026-01-01T00:00:00Z'),
          dateUpdated: new Date('2026-01-20T10:00:00Z'),
        },
        privateProfile: {
          id: testIdBuffer,
          trustedPeers: [],
          blockedPeers: [],
          settings: { theme: 'dark' },
          activityLog: [],
          dateCreated: new Date('2026-01-01T00:00:00Z'),
          dateUpdated: new Date('2026-01-20T10:00:00Z'),
        },
      });

      const controller = new MembersController(mockApp as any);
      const mockReq = {
        params: { memberId: testId },
        user: { id: otherUserId },
      } as any;

      const result = await (controller as any).handleGetMemberProfile(mockReq);

      expect(result.statusCode).toBe(200);
      expect(result.response.privateProfile).toBeUndefined();
    });

    it('should handle errors from memberStore', async () => {
      const mockApp = createMockApplication();
      mockApp.memberStore.getMemberProfile.mockRejectedValue(
        new Error('Member not found'),
      );

      const controller = new MembersController(mockApp as any);
      const mockReq = {
        params: { memberId: 'non-existent-id' },
        user: undefined,
      } as any;

      const result = await (controller as any).handleGetMemberProfile(mockReq);

      expect(result.statusCode).toBe(500);
      expect(result.response.error).toBe('Member not found');
    });
  });

  describe('handleUpdateMemberProfile', () => {
    it('should return 500 if memberStore service is not available', async () => {
      const mockApp = createMockApplication();
      mockApp.services.get = jest.fn((serviceName: string) => null);

      const controller = new MembersController(mockApp as any);
      const mockReq = {
        body: {},
        user: { id: 'test-id' },
      } as any;

      const result = await (controller as any).handleUpdateMemberProfile(
        mockReq,
      );

      expect(result.statusCode).toBe(500);
      expect(result.response.error).toBe('MemberStore service not available');
    });

    it('should return 401 if user is not authenticated', async () => {
      const mockApp = createMockApplication();
      const controller = new MembersController(mockApp as any);
      const mockReq = {
        body: {},
        user: undefined,
      } as any;

      const result = await (controller as any).handleUpdateMemberProfile(
        mockReq,
      );

      expect(result.statusCode).toBe(401);
      expect(result.response.error).toBe('Authentication required');
    });

    it('should return 400 if request body is missing', async () => {
      const mockApp = createMockApplication();
      const controller = new MembersController(mockApp as any);
      const mockReq = {
        user: { id: 'test-id' },
      } as any;

      const result = await (controller as any).handleUpdateMemberProfile(
        mockReq,
      );

      expect(result.statusCode).toBe(400);
      expect(result.response.error).toBe('Update request body is required');
    });

    it('should return 501 for valid update request (not yet fully implemented)', async () => {
      const mockApp = createMockApplication();
      const controller = new MembersController(mockApp as any);
      const mockReq = {
        user: { id: 'test-id' },
        body: {
          settings: { theme: 'light' },
        },
      } as any;

      const result = await (controller as any).handleUpdateMemberProfile(
        mockReq,
      );

      expect(result.statusCode).toBe(501);
      expect(result.response.message).toContain('not yet fully implemented');
    });

    it('should handle errors gracefully', async () => {
      const mockApp = createMockApplication();
      mockApp.services.get = jest.fn((serviceName: string) => {
        throw new Error('Service error');
      });

      const controller = new MembersController(mockApp as any);
      const mockReq = {
        user: { id: 'test-id' },
        body: { settings: {} },
      } as any;

      const result = await (controller as any).handleUpdateMemberProfile(
        mockReq,
      );

      expect(result.statusCode).toBe(500);
      expect(result.response.error).toBeDefined();
    });
  });

  describe('Handler initialization', () => {
    it('should initialize all handlers', () => {
      const mockApp = createMockApplication();
      const controller = new MembersController(mockApp as any);

      expect((controller as any).handlers).toBeDefined();
      expect((controller as any).handlers.getMembers).toBeDefined();
      expect((controller as any).handlers.getMemberProfile).toBeDefined();
      expect((controller as any).handlers.updateMemberProfile).toBeDefined();
    });

    it('should bind handler methods correctly', () => {
      const mockApp = createMockApplication();
      const controller = new MembersController(mockApp as any);

      const getMembersHandler = (controller as any).handlers.getMembers;
      const getProfileHandler = (controller as any).handlers.getMemberProfile;
      const updateProfileHandler = (controller as any).handlers
        .updateMemberProfile;

      expect(typeof getMembersHandler).toBe('function');
      expect(typeof getProfileHandler).toBe('function');
      expect(typeof updateProfileHandler).toBe('function');
    });
  });

  describe('Response format validation', () => {
    it('should return properly formatted public profile response', async () => {
      const mockApp = createMockApplication();
      const testId = Buffer.from('test-id', 'utf-8');

      mockApp.memberStore.getMemberProfile.mockResolvedValue({
        publicProfile: {
          id: testId,
          status: 'Active',
          reputation: 100,
          // 100 GiB to align with formatted expectation
          storageQuota: BigInt(1024 * 1024 * 1024 * 100),
          storageUsed: BigInt(1024 * 500),
          lastActive: new Date('2026-01-20T10:00:00Z'),
          dateCreated: new Date('2026-01-01T00:00:00Z'),
          dateUpdated: new Date('2026-01-20T10:00:00Z'),
        },
        privateProfile: null,
      });

      const controller = new MembersController(mockApp as any);
      const mockReq = {
        params: { memberId: testId.toString('hex') },
        user: undefined,
      } as any;

      const result = await (controller as any).handleGetMemberProfile(mockReq);

      expect(result.statusCode).toBe(200);
      expect(result.response.publicProfile).toBeDefined();
      expect(result.response.publicProfile.id).toBeDefined();
      expect(result.response.publicProfile.status).toBe('Active');
      expect(result.response.publicProfile.reputation).toBe(100);
      expect(result.response.publicProfile.storageQuota).toBe('107374182400');
      expect(result.response.publicProfile.storageUsed).toBe('512000');
    });

    it('should convert BigInt to string in response', async () => {
      const mockApp = createMockApplication();
      const testId = Buffer.from('test-id');

      mockApp.memberStore.getMemberProfile.mockResolvedValue({
        publicProfile: {
          id: testId,
          status: 'Active',
          reputation: 0,
          storageQuota: BigInt('9007199254740991'),
          storageUsed: BigInt('1234567890'),
          lastActive: new Date(),
          dateCreated: new Date(),
          dateUpdated: new Date(),
        },
        privateProfile: null,
      });

      const controller = new MembersController(mockApp as any);
      const mockReq = {
        params: { memberId: testId.toString('hex') },
        user: undefined,
      } as any;

      const result = await (controller as any).handleGetMemberProfile(mockReq);

      expect(typeof result.response.publicProfile.storageQuota).toBe('string');
      expect(typeof result.response.publicProfile.storageUsed).toBe('string');
      expect(result.response.publicProfile.storageQuota).toBe(
        '9007199254740991',
      );
      expect(result.response.publicProfile.storageUsed).toBe('1234567890');
    });
  });
});
