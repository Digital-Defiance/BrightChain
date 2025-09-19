import { Role, StringLanguage } from '@brightchain/brightchain-lib';
import { Types } from 'mongoose';
import { IUserDocument } from '../documents/user';
import { IApplication } from '../interfaces/application';
import { IEnvironment } from '../interfaces/environment';
import { JwtService } from './jwt';
import { RoleService } from './role';

// Mock the RoleService
const mockRoleService = {
  getUserRoles: jest.fn(),
  rolesToTokenRoles: jest.fn(),
};

jest.mock('./role', () => ({
  RoleService: jest.fn().mockImplementation(() => mockRoleService),
}));

describe('JwtService', () => {
  let jwtService: JwtService;
  let mockApplication: IApplication;
  const testSecret = 'test-jwt-secret-key';

  beforeEach(() => {
    jest.clearAllMocks();

    const mockEnvironment: Partial<IEnvironment> = {
      jwtSecret: testSecret,
    };

    mockApplication = {
      environment: mockEnvironment as IEnvironment,
    } as IApplication;

    jwtService = new JwtService(mockApplication);
  });

  describe('signToken', () => {
    it('should sign a token with roles and verify it correctly', async () => {
      const userId = new Types.ObjectId();
      const mockUser = {
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
      } as IUserDocument;

      const mockRoles = [
        {
          _id: new Types.ObjectId(),
          name: Role.Admin,
          admin: true,
          member: false,
          child: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
        {
          _id: new Types.ObjectId(),
          name: Role.Member,
          admin: false,
          member: true,
          child: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      ];

      const mockTokenRoles = mockRoles.map((role) => ({
        ...role,
        translatedName: role.name === Role.Admin ? 'Administrator' : 'Member',
      }));

      mockRoleService.getUserRoles.mockResolvedValue(mockRoles);
      mockRoleService.rolesToTokenRoles.mockReturnValue(mockTokenRoles);

      (RoleService as any).roleToRoleDTO = jest
        .fn()
        .mockImplementation((role) => ({
          _id: role._id.toString(),
          name: role.name,
          admin: role.admin,
          member: role.member,
          child: role.child,
          translatedName: role.translatedName,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
          createdBy: role.createdBy.toString(),
          updatedBy: role.updatedBy.toString(),
        }));

      const signResult = await jwtService.signToken(mockUser, testSecret);

      expect(signResult.token).toBeDefined();
      expect(signResult.tokenUser.userId).toBe(userId.toString());
      expect(signResult.tokenUser.roles).toHaveLength(2);
      expect(signResult.roleNames).toEqual([Role.Admin, Role.Member]);
      expect(signResult.roleTranslatedNames).toEqual([
        'Administrator',
        'Member',
      ]);

      // Verify the token can be decoded
      const verifiedUser = await jwtService.verifyToken(signResult.token);
      expect(verifiedUser).not.toBeNull();
      expect(verifiedUser!.userId).toBe(userId.toString());
      expect(verifiedUser!.roles).toHaveLength(2);
      expect(verifiedUser!.roles[0].name).toBe(Role.Admin);
      expect(verifiedUser!.roles[0].admin).toBe(true);
      expect(verifiedUser!.roles[1].name).toBe(Role.Member);
      expect(verifiedUser!.roles[1].member).toBe(true);
    });

    it('should handle user with no roles', async () => {
      const userId = new Types.ObjectId();
      const mockUser = {
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
      } as IUserDocument;

      mockRoleService.getUserRoles.mockResolvedValue([]);
      mockRoleService.rolesToTokenRoles.mockReturnValue([]);
      (RoleService as any).roleToRoleDTO = jest.fn().mockReturnValue([]);

      const signResult = await jwtService.signToken(mockUser, testSecret);

      expect(signResult.token).toBeDefined();
      expect(signResult.tokenUser.userId).toBe(userId.toString());
      expect(signResult.tokenUser.roles).toHaveLength(0);
      expect(signResult.roleNames).toHaveLength(0);

      const verifiedUser = await jwtService.verifyToken(signResult.token);
      expect(verifiedUser).not.toBeNull();
      expect(verifiedUser!.userId).toBe(userId.toString());
      expect(verifiedUser!.roles).toHaveLength(0);
    });

    it('should handle role with boolean flags', async () => {
      const userId = new Types.ObjectId();
      const mockUser = {
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
      } as IUserDocument;

      const complexRole = {
        _id: new Types.ObjectId(),
        name: 'CustomRole',
        admin: false,
        member: true,
        child: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      const mockTokenRole = {
        ...complexRole,
        translatedName: 'Custom Role',
      };

      mockRoleService.getUserRoles.mockResolvedValue([complexRole]);
      mockRoleService.rolesToTokenRoles.mockReturnValue([mockTokenRole]);

      (RoleService as any).roleToRoleDTO = jest
        .fn()
        .mockImplementation((role) => ({
          _id: role._id.toString(),
          name: role.name,
          admin: role.admin,
          member: role.member,
          child: role.child,
          translatedName: role.translatedName,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
          createdBy: role.createdBy.toString(),
          updatedBy: role.updatedBy.toString(),
        }));

      const signResult = await jwtService.signToken(mockUser, testSecret);
      const verifiedUser = await jwtService.verifyToken(signResult.token);

      expect(verifiedUser).not.toBeNull();
      expect(verifiedUser!.roles[0].name).toBe(complexRole.name);
      expect(verifiedUser!.roles[0].admin).toBe(complexRole.admin);
      expect(verifiedUser!.roles[0].member).toBe(complexRole.member);
      expect(verifiedUser!.roles[0].child).toBe(complexRole.child);
      expect(verifiedUser!.roles[0].translatedName).toBe(
        mockTokenRole.translatedName,
      );
    });

    it('should use override language for role translations', async () => {
      const userId = new Types.ObjectId();
      const mockUser = {
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
      } as IUserDocument;

      const mockRole = {
        _id: new Types.ObjectId(),
        name: Role.Admin,
        admin: true,
        member: false,
        child: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      const mockTokenRole = {
        ...mockRole,
        translatedName: 'Administrador', // Spanish translation
      };

      mockRoleService.getUserRoles.mockResolvedValue([mockRole]);
      mockRoleService.rolesToTokenRoles.mockReturnValue([mockTokenRole]);

      (RoleService as any).roleToRoleDTO = jest
        .fn()
        .mockImplementation((role) => ({
          _id: role._id.toString(),
          name: role.name,
          admin: role.admin,
          member: role.member,
          child: role.child,
          translatedName: role.translatedName,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
          createdBy: role.createdBy.toString(),
          updatedBy: role.updatedBy.toString(),
        }));

      const signResult = await jwtService.signToken(
        mockUser,
        testSecret,
        StringLanguage.Spanish,
      );

      expect(mockRoleService.rolesToTokenRoles).toHaveBeenCalledWith(
        [mockRole],
        StringLanguage.Spanish,
      );
      expect(signResult.roleTranslatedNames).toEqual(['Administrador']);
    });
  });

  describe('verifyToken', () => {
    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(jwtService.verifyToken(invalidToken)).rejects.toThrow();
    });

    it('should handle malformed token payload', async () => {
      const malformedToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbnZhbGlkIjoicGF5bG9hZCJ9.invalid';

      const result = await jwtService
        .verifyToken(malformedToken)
        .catch(() => null);
      expect(result).toBeNull();
    });
  });

  describe('actual JWT sign/verify functionality', () => {
    it('should actually sign and verify JWT tokens using JwtService methods', async () => {
      const userId = new Types.ObjectId();
      const mockUser = {
        _id: userId,
        username: 'testuser',
      } as IUserDocument;

      const mockRole = {
        _id: new Types.ObjectId(),
        name: 'Admin',
        admin: true,
        member: false,
        child: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      const mockTokenRole = {
        ...mockRole,
        translatedName: 'Administrator',
      };

      mockRoleService.getUserRoles.mockResolvedValue([mockRole]);
      mockRoleService.rolesToTokenRoles.mockReturnValue([mockTokenRole]);

      (RoleService as any).roleToRoleDTO = jest
        .fn()
        .mockImplementation((role) => ({
          _id: role._id.toString(),
          name: role.name,
          admin: role.admin,
          member: role.member,
          child: role.child,
          translatedName: role.translatedName,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
          createdBy: role.createdBy.toString(),
          updatedBy: role.updatedBy.toString(),
        }));

      // Use actual JwtService.signToken()
      const signResult = await jwtService.signToken(mockUser, testSecret);

      // Use actual JwtService.verifyToken()
      const verifiedUser = await jwtService.verifyToken(signResult.token);

      expect(verifiedUser).not.toBeNull();
      expect(verifiedUser!.userId).toBe(userId.toString());
      expect(verifiedUser!.roles[0].name).toBe('Admin');
      expect(verifiedUser!.roles[0].admin).toBe(true);
      expect(verifiedUser!.roles[0].member).toBe(false);
      expect(verifiedUser!.roles[0].child).toBe(false);
    });

    it('should maintain role data integrity through sign/verify cycle', async () => {
      const userId = new Types.ObjectId();
      const roleId1 = new Types.ObjectId();
      const roleId2 = new Types.ObjectId();

      const mockUser = {
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
      } as IUserDocument;

      const complexRoles = [
        {
          _id: roleId1,
          name: 'DataScientist',
          admin: false,
          member: true,
          child: false,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-06-01'),
          createdBy: userId,
          updatedBy: userId,
        },
        {
          _id: roleId2,
          name: 'SecurityOfficer',
          admin: false,
          member: true,
          child: false,
          createdAt: new Date('2023-02-01'),
          updatedAt: new Date('2023-07-01'),
          createdBy: userId,
          updatedBy: userId,
        },
      ];

      const mockTokenRoles = complexRoles.map((role) => ({
        ...role,
        translatedName: role.name.replace(/([A-Z])/g, ' $1').trim(),
      }));

      mockRoleService.getUserRoles.mockResolvedValue(complexRoles);
      mockRoleService.rolesToTokenRoles.mockReturnValue(mockTokenRoles);

      (RoleService as any).roleToRoleDTO = jest
        .fn()
        .mockImplementation((role) => ({
          _id: role._id.toString(),
          name: role.name,
          admin: role.admin,
          member: role.member,
          child: role.child,
          translatedName: role.translatedName,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
          createdBy: role.createdBy.toString(),
          updatedBy: role.updatedBy.toString(),
        }));

      // Sign the token
      const signResult = await jwtService.signToken(mockUser, testSecret);

      // Verify the token
      const verifiedUser = await jwtService.verifyToken(signResult.token);

      // Verify all role data is preserved
      expect(verifiedUser).not.toBeNull();
      expect(verifiedUser!.userId).toBe(userId.toString());
      expect(verifiedUser!.roles).toHaveLength(2);

      const dataScientistRole = verifiedUser!.roles.find(
        (r) => r.name === 'DataScientist',
      );
      expect(dataScientistRole).toBeDefined();
      expect(dataScientistRole!.admin).toBe(false);
      expect(dataScientistRole!.member).toBe(true);
      expect(dataScientistRole!.child).toBe(false);

      const securityRole = verifiedUser!.roles.find(
        (r) => r.name === 'SecurityOfficer',
      );
      expect(securityRole).toBeDefined();
      expect(securityRole!.admin).toBe(false);
      expect(securityRole!.member).toBe(true);
      expect(securityRole!.child).toBe(false);
    });

    it('should handle multiple roles with different flag combinations', async () => {
      const userId = new Types.ObjectId();
      const mockUser = {
        _id: userId,
        username: 'testuser',
      } as IUserDocument;

      const multipleRoles = [
        {
          _id: new Types.ObjectId(),
          name: 'GlobalAdmin',
          admin: true,
          member: false,
          child: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Member',
          admin: false,
          member: true,
          child: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
        {
          _id: new Types.ObjectId(),
          name: 'ChildAccount',
          admin: false,
          member: false,
          child: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      ];

      const mockTokenRoles = multipleRoles.map((role) => ({
        ...role,
        translatedName: role.name,
      }));

      mockRoleService.getUserRoles.mockResolvedValue(multipleRoles);
      mockRoleService.rolesToTokenRoles.mockReturnValue(mockTokenRoles);

      (RoleService as any).roleToRoleDTO = jest
        .fn()
        .mockImplementation((role) => ({
          _id: role._id.toString(),
          name: role.name,
          admin: role.admin,
          member: role.member,
          child: role.child,
          translatedName: role.translatedName,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
          createdBy: role.createdBy.toString(),
          updatedBy: role.updatedBy.toString(),
        }));

      // This will use real JWT signing
      const signResult = await jwtService.signToken(mockUser, testSecret);

      // This will use real JWT verification
      const verifiedUser = await jwtService.verifyToken(signResult.token);

      expect(verifiedUser).not.toBeNull();
      expect(verifiedUser!.roles).toHaveLength(3);

      const adminRole = verifiedUser!.roles.find(
        (r) => r.name === 'GlobalAdmin',
      );
      expect(adminRole!.admin).toBe(true);
      expect(adminRole!.member).toBe(false);
      expect(adminRole!.child).toBe(false);

      const memberRole = verifiedUser!.roles.find((r) => r.name === 'Member');
      expect(memberRole!.admin).toBe(false);
      expect(memberRole!.member).toBe(true);
      expect(memberRole!.child).toBe(false);

      const childRole = verifiedUser!.roles.find(
        (r) => r.name === 'ChildAccount',
      );
      expect(childRole!.admin).toBe(false);
      expect(childRole!.member).toBe(false);
      expect(childRole!.child).toBe(true);
    });
  });
});
