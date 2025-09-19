import {
  AccountStatus,
  AppConstants,
  CanaryStatus,
  debugLog,
  EmailString,
  IECIESConfig,
  IFailableResult,
  MemberType,
  ModelName,
  SecureString,
  StringLanguage,
  StringName,
  t,
  TranslatableError,
  translate,
} from '@brightchain/brightchain-lib';
import { createHash, randomBytes } from 'crypto';
import { Connection, Types } from 'mongoose';
import { BrightChainMember } from '../backendMember';
import { BackupCode } from '../backupCode';
import {
  IMnemonicDocument,
  IRoleDocument,
  IUserDocument,
  IUserRoleDocument,
} from '../documents';
import { IApplication } from '../interfaces/application';
import { IServerInitResult } from '../interfaces/server-init-result';
import { withTransaction } from '../utils';
import { BackupCodeService } from './backupCode';
import { ECIESService } from './ecies/service';
import { KeyWrappingService } from './keyWrapping';
import { MnemonicService } from './mnemonic';
import { RoleService } from './role';
import { SystemUserService } from './system-user';

export abstract class DatabaseInitializationService {
  /**
   * Generate a random password
   * @param length The length of the password
   * @returns The generated password
   */
  public static generatePassword(length: number): string {
    const specialCharacters = "!@#$%^&*()_+-=[]{};':|,.<>/?";
    const numbers = '0123456789';
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Get a random character from a string
    const getRandomChar = (chars: string): string => {
      const randomIndex = randomBytes(1)[0] % chars.length;
      return chars[randomIndex];
    };

    // Start with one of each required character type
    let password = '';
    password += getRandomChar(letters);
    password += getRandomChar(numbers);
    password += getRandomChar(specialCharacters);

    // Fill the rest with random characters from all types
    const allCharacters = specialCharacters + numbers + letters;
    for (let i = password.length; i < length; i++) {
      password += getRandomChar(allCharacters);
    }

    // Shuffle the password characters to avoid predictable pattern
    return password
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');
  }

  /**
   * Drops the database
   * @param connection The database connection
   * @returns True if the database was dropped, false if not connected
   */
  public static async dropDatabase(connection: Connection): Promise<boolean> {
    if (!connection.db) return false;
    debugLog(
      true,
      'warn',
      t('{{StringName.Admin_DroppingDatabase}}', undefined, 'admin'),
    );
    return connection.db.dropDatabase();
  }

  public static getInitOptions(application: IApplication): {
    adminId?: Types.ObjectId;
    adminMnemonic?: SecureString;
    adminPassword?: SecureString;
    adminRoleId?: Types.ObjectId;
    adminUserRoleId?: Types.ObjectId;
    adminBackupCodes?: BackupCode[];
    memberId?: Types.ObjectId;
    memberMnemonic?: SecureString;
    memberPassword?: SecureString;
    memberRoleId?: Types.ObjectId;
    memberUserRoleId?: Types.ObjectId;
    memberBackupCodes?: BackupCode[];
    systemId?: Types.ObjectId;
    systemMnemonic?: SecureString;
    systemPassword?: SecureString;
    systemRoleId?: Types.ObjectId;
    systemUserRoleId?: Types.ObjectId;
    systemBackupCodes?: BackupCode[];
  } {
    return {
      adminId: application.environment.adminId
        ? application.environment.adminId
        : undefined,
      adminMnemonic: application.environment.adminMnemonic?.hasValue
        ? application.environment.adminMnemonic
        : undefined,
      adminPassword: application.environment.adminPassword?.hasValue
        ? application.environment.adminPassword
        : undefined,
      adminRoleId: application.environment.adminRoleId
        ? application.environment.adminRoleId
        : undefined,
      adminUserRoleId: application.environment.adminUserRoleId
        ? application.environment.adminUserRoleId
        : undefined,
      adminBackupCodes: application.environment.adminBackupCodes
        ? application.environment.adminBackupCodes
        : undefined,
      memberId: application.environment.memberId
        ? application.environment.memberId
        : undefined,
      memberMnemonic: application.environment.memberMnemonic?.hasValue
        ? application.environment.memberMnemonic
        : undefined,
      memberPassword: application.environment.memberPassword?.hasValue
        ? application.environment.memberPassword
        : undefined,
      memberRoleId: application.environment.memberRoleId
        ? application.environment.memberRoleId
        : undefined,
      memberUserRoleId: application.environment.memberUserRoleId
        ? application.environment.memberUserRoleId
        : undefined,
      memberBackupCodes: application.environment.memberBackupCodes
        ? application.environment.memberBackupCodes
        : undefined,
      systemId: application.environment.systemId
        ? application.environment.systemId
        : undefined,
      systemMnemonic: application.environment.systemMnemonic?.hasValue
        ? application.environment.systemMnemonic
        : undefined,
      systemPassword: application.environment.systemPassword?.hasValue
        ? application.environment.systemPassword
        : undefined,
      systemRoleId: application.environment.systemRoleId
        ? application.environment.systemRoleId
        : undefined,
      systemUserRoleId: application.environment.systemUserRoleId
        ? application.environment.systemUserRoleId
        : undefined,
      systemBackupCodes: application.environment.systemBackupCodes
        ? application.environment.systemBackupCodes
        : undefined,
    };
  }

  public static serverInitResultHash(
    serverInitResult: IServerInitResult,
  ): string {
    const h = createHash('sha256');
    h.update(serverInitResult.adminUser._id.toHexString());
    h.update(serverInitResult.adminRole._id.toHexString());
    h.update(serverInitResult.adminUserRole._id.toHexString());
    h.update(serverInitResult.adminUsername);
    h.update(serverInitResult.adminEmail);
    h.update(serverInitResult.adminMnemonic);
    h.update(serverInitResult.adminPassword);
    h.update(serverInitResult.adminUser.publicKey);
    serverInitResult.adminBackupCodes.map((bc) => h.update(bc));
    h.update(serverInitResult.memberUser._id.toHexString());
    h.update(serverInitResult.memberRole._id.toHexString());
    h.update(serverInitResult.memberUserRole._id.toHexString());
    h.update(serverInitResult.memberUsername);
    h.update(serverInitResult.memberEmail);
    h.update(serverInitResult.memberMnemonic);
    h.update(serverInitResult.memberPassword);
    h.update(serverInitResult.memberUser.publicKey);
    serverInitResult.memberBackupCodes.map((bc) => h.update(bc));
    h.update(serverInitResult.systemUser._id.toHexString());
    h.update(serverInitResult.systemRole._id.toHexString());
    h.update(serverInitResult.systemUserRole._id.toHexString());
    h.update(serverInitResult.systemUsername);
    h.update(serverInitResult.systemEmail);
    h.update(serverInitResult.systemMnemonic);
    h.update(serverInitResult.systemPassword);
    h.update(serverInitResult.systemUser.publicKey);
    serverInitResult.systemBackupCodes.map((bc) => h.update(bc));
    return h.digest('hex');
  }

  /**
   * Initialize the user database with default users and roles
   * @param application The application
   * @param language The language for console messages
   * @returns The result of the initialization
   */
  public static async initUserDb(
    application: IApplication,
  ): Promise<IFailableResult<IServerInitResult>> {
    const options = DatabaseInitializationService.getInitOptions(application);
    const UserModel = application.getModel<IUserDocument>(ModelName.User);
    const RoleModel = application.getModel<IRoleDocument>(ModelName.Role);
    const mnemonicModel = application.getModel<IMnemonicDocument>(
      ModelName.Mnemonic,
    );
    const keyWrappingService = new KeyWrappingService();
    const mnemonicService = new MnemonicService(
      mnemonicModel,
      application.environment.mnemonicHmacSecret,
      keyWrappingService,
    );
    const config: IECIESConfig = {
      curveName: AppConstants.ECIES.CURVE_NAME,
      primaryKeyDerivationPath: AppConstants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: AppConstants.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: AppConstants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: AppConstants.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: AppConstants.ECIES.SYMMETRIC.MODE,
    };
    const eciesService = new ECIESService(config);
    const roleService = new RoleService(application);
    const backupCodeService = new BackupCodeService(
      application,
      eciesService,
      keyWrappingService,
      roleService,
    );
    const adminUserId = options.adminId ?? new Types.ObjectId();
    const adminRoleId = options.adminRoleId ?? new Types.ObjectId();
    const adminUserRoleId = options.adminUserRoleId ?? new Types.ObjectId();
    const memberUserId = options.memberId ?? new Types.ObjectId();
    const memberRoleId = options.memberRoleId ?? new Types.ObjectId();
    const memberUserRoleId = options.memberUserRoleId ?? new Types.ObjectId();
    const systemUserId = options.systemId ?? new Types.ObjectId();
    const systemRoleId = options.systemRoleId ?? new Types.ObjectId();
    const systemUserRoleId = options.systemUserRoleId ?? new Types.ObjectId();

    // Check for existing users without transaction
    const existingUsers = await UserModel.find({
      username: {
        $in: [AppConstants.AdministratorUser, AppConstants.MemberUser],
      },
    });
    if (existingUsers.length > 0) {
      return {
        success: false,
        message: translate(
          StringName.Admin_DatabaseAlreadyInitialized,
          undefined,
          undefined,
          'admin',
        ),
        error: new Error(
          translate(
            StringName.Admin_DatabaseAlreadyInitialized,
            undefined,
            undefined,
            'admin',
          ),
        ),
      };
    }

    debugLog(
      application.environment.detailedDebug,
      'log',
      translate(
        StringName.Admin_SettingUpUsersAndRoles,
        undefined,
        undefined,
        'admin',
      ),
    );
    const now = new Date();

    try {
      // Create main roles first
      const rolesResult = await withTransaction<{
        adminRole: IRoleDocument;
        memberRole: IRoleDocument;
        systemRole: IRoleDocument;
      }>(
        application.db.connection,
        application.environment.mongo.useTransactions,
        undefined,
        async (sess) => {
          // Check if admin role already exists
          let adminRole = await RoleModel.findOne({
            name: AppConstants.AdministratorRole,
          }).session(sess ?? null);
          if (!adminRole) {
            const adminRoleDocs = await RoleModel.create(
              [
                {
                  _id: adminRoleId,
                  name: AppConstants.AdministratorRole,
                  admin: true,
                  member: true,
                  system: false,
                  child: false,
                  createdAt: now,
                  updatedAt: now,
                  createdBy: systemUserId,
                  updatedBy: systemUserId,
                },
              ],
              { session: sess },
            );
            if (adminRoleDocs.length !== 1) {
              throw new TranslatableError(
                StringName.Error_FailedToCreateRoleTemplate,
              );
            }
            adminRole = adminRoleDocs[0];
          }

          // Check if member role already exists
          let memberRole = await RoleModel.findOne({
            name: AppConstants.MemberRole,
          }).session(sess ?? null);
          if (!memberRole) {
            const memberRoleDocs = await RoleModel.create(
              [
                {
                  _id: memberRoleId,
                  name: AppConstants.MemberRole,
                  admin: false,
                  member: true,
                  child: false,
                  system: false,
                  createdAt: now,
                  updatedAt: now,
                  createdBy: systemUserId,
                  updatedBy: systemUserId,
                },
              ],
              { session: sess },
            );
            if (memberRoleDocs.length !== 1) {
              throw new Error(
                translate(
                  StringName.Error_FailedToCreateRoleTemplate,
                  {
                    NAME: translate(StringName.Common_Member),
                  },
                  undefined,
                  'admin',
                ),
              );
            }
            memberRole = memberRoleDocs[0];
          }

          // Check if system role already exists
          let systemRole = await RoleModel.findOne({
            name: AppConstants.SystemRole,
          }).session(sess ?? null);
          if (!systemRole) {
            const systemRoleDocs = await RoleModel.create(
              [
                {
                  _id: systemRoleId,
                  name: AppConstants.SystemRole,
                  admin: true,
                  member: true,
                  system: true,
                  child: false,
                  createdAt: now,
                  updatedAt: now,
                  createdBy: systemUserId,
                  updatedBy: systemUserId,
                },
              ],
              { session: sess },
            );
            if (systemRoleDocs.length !== 1) {
              throw new TranslatableError(
                StringName.Error_FailedToCreateRoleTemplate,
              );
            }
            systemRole = systemRoleDocs[0];
          }

          return { adminRole, memberRole, systemRole };
        },
        { timeoutMs: 60000 }, // 60 seconds for roles
      );

      // Create system user and role relationship in same transaction
      const systemResult: {
        systemDoc: IUserDocument;
        systemUserRoleDoc: IUserRoleDocument;
        systemPassword: string;
        systemMnemonic: string;
        systemBackupCodes: SecureString[];
        systemBurnbagMember: BrightChainMember;
      } = await withTransaction<{
        systemDoc: IUserDocument;
        systemUserRoleDoc: IUserRoleDocument;
        systemPassword: string;
        systemMnemonic: string;
        systemBackupCodes: SecureString[];
        systemBurnbagMember: BrightChainMember;
      }>(
        application.db.connection,
        application.environment.mongo.useTransactions,
        undefined,
        async (sess) => {
          const systemUser: {
            member: BrightChainMember;
            mnemonic: SecureString;
          } = BrightChainMember.newMember(
            eciesService,
            MemberType.System,
            AppConstants.SystemUser,
            new EmailString(AppConstants.SystemEmail),
            options.systemMnemonic,
          );
          backupCodeService.setSystemUser(systemUser.member);
          SystemUserService.setSystemUser(systemUser.member);
          // Encrypt mnemonic for recovery
          const systemEncryptedMnemonic = systemUser.member
            .encryptData(Buffer.from(systemUser.mnemonic.value ?? '', 'utf-8'))
            .toString('hex');
          const systemMnemonicDoc = await mnemonicService.addMnemonic(
            systemUser.mnemonic,
            sess,
          );
          if (!systemMnemonicDoc) {
            throw new Error(
              translate(
                StringName.Error_FailedToStoreUserMnemonicTemplate,
                {
                  NAME: translate(StringName.Common_System),
                },
                undefined,
                'admin',
              ),
            );
          }
          const systemPasswordSecure = options.systemPassword
            ? options.systemPassword
            : new SecureString(this.generatePassword(16));

          const wrapped = keyWrappingService.wrapSecret(
            systemUser.member.privateKey!,
            systemPasswordSecure,
          );
          const backupCodes =
            options.systemBackupCodes ?? BackupCode.generateBackupCodes();
          const encryptedBackupCodes = await BackupCode.encryptBackupCodes(
            systemUser.member,
            systemUser.member,
            backupCodes,
          );
          const systemDocs = await UserModel.create(
            [
              {
                _id: systemUserId,
                username: AppConstants.SystemUser,
                email: AppConstants.SystemEmail,
                publicKey: systemUser.member.publicKey.toString('hex'),
                duressPasswords: [],
                mnemonicRecovery: systemEncryptedMnemonic,
                mnemonicId: systemMnemonicDoc._id,
                passwordWrappedPrivateKey: wrapped,
                backupCodes: encryptedBackupCodes,
                timezone: application.environment.timezone.value,
                siteLanguage: StringLanguage.EnglishUS,
                emailVerified: true,
                accountStatus: AccountStatus.Active,
                overallCanaryStatus: CanaryStatus.Alive,
                createdAt: now,
                updatedAt: now,
                createdBy: systemUserId,
                updatedBy: systemUserId,
              },
            ],
            { session: sess },
          );
          if (systemDocs.length !== 1) {
            throw new Error(
              translate(
                StringName.Error_FailedToCreateUserTemplate,
                {
                  NAME: translate(StringName.Common_System),
                },
                undefined,
                'admin',
              ),
            );
          }

          const systemDoc = systemDocs[0];

          // Create admin user-role relationship
          const systemUserRoleDoc = await roleService.addUserToRole(
            systemRoleId,
            systemUserId,
            systemUserId,
            sess,
            systemUserRoleId,
          );

          if (!systemUser.mnemonic.value) {
            throw new Error(
              translate(
                StringName.Error_MnemonicIsNullTemplate,
                {
                  NAME: StringName.Common_System,
                },
                undefined,
                'admin',
              ),
            );
          }

          return {
            systemDoc,
            systemUserRoleDoc,
            systemPassword: systemPasswordSecure.notNullValue,
            systemMnemonic: systemUser.mnemonic.notNullValue,
            systemBackupCodes: backupCodes,
            systemBurnbagMember: systemUser.member,
          };
        },
        { timeoutMs: 120000 }, // 2 minutes for admin user
      );

      // Create admin user and role relationship in same transaction
      const adminResult: {
        adminDoc: IUserDocument;
        adminUserRoleDoc: IUserRoleDocument;
        adminPassword: string;
        adminMnemonic: string;
        adminBackupCodes: SecureString[];
        adminBurnbagMember: BrightChainMember;
      } = await withTransaction<{
        adminDoc: IUserDocument;
        adminUserRoleDoc: IUserRoleDocument;
        adminPassword: string;
        adminMnemonic: string;
        adminBackupCodes: SecureString[];
        adminBurnbagMember: BrightChainMember;
      }>(
        application.db.connection,
        application.environment.mongo.useTransactions,
        undefined,
        async (sess) => {
          const adminUser: {
            member: BrightChainMember;
            mnemonic: SecureString;
          } = BrightChainMember.newMember(
            eciesService,
            MemberType.Admin,
            AppConstants.AdministratorUser,
            new EmailString(AppConstants.AdministratorEmail),
            options.adminMnemonic,
          );
          // Encrypt mnemonic for recovery
          const adminEncryptedMnemonic = adminUser.member
            .encryptData(Buffer.from(adminUser.mnemonic.value ?? '', 'utf-8'))
            .toString('hex');
          const adminMnemonicDoc = await mnemonicService.addMnemonic(
            adminUser.mnemonic,
            sess,
          );
          if (!adminMnemonicDoc) {
            throw new Error(
              translate(
                StringName.Error_FailedToStoreUserMnemonicTemplate,
                {
                  NAME: translate(StringName.Common_Admin),
                },
                undefined,
                'admin',
              ),
            );
          }
          const adminPasswordSecure = options.adminPassword
            ? options.adminPassword
            : new SecureString(this.generatePassword(16));

          const wrapped = keyWrappingService.wrapSecret(
            adminUser.member.privateKey!,
            adminPasswordSecure,
          );
          const backupCodes =
            options.adminBackupCodes ?? BackupCode.generateBackupCodes();
          const encryptedBackupCodes = await BackupCode.encryptBackupCodes(
            adminUser.member,
            systemResult.systemBurnbagMember,
            backupCodes,
          );
          const adminDocs = await UserModel.create(
            [
              {
                _id: adminUserId,
                username: AppConstants.AdministratorUser,
                email: AppConstants.AdministratorEmail,
                publicKey: adminUser.member.publicKey.toString('hex'),
                duressPasswords: [],
                mnemonicRecovery: adminEncryptedMnemonic,
                mnemonicId: adminMnemonicDoc._id,
                passwordWrappedPrivateKey: wrapped,
                backupCodes: encryptedBackupCodes,
                timezone: application.environment.timezone.value,
                siteLanguage: StringLanguage.EnglishUS,
                emailVerified: true,
                accountStatus: AccountStatus.Active,
                overallCanaryStatus: CanaryStatus.Alive,
                createdAt: now,
                updatedAt: now,
                createdBy: systemUserId,
                updatedBy: systemUserId,
              },
            ],
            { session: sess },
          );
          if (adminDocs.length !== 1) {
            throw new Error(
              translate(
                StringName.Error_FailedToCreateUserTemplate,
                {
                  NAME: translate(StringName.Common_Admin),
                },
                undefined,
                'admin',
              ),
            );
          }

          const adminDoc = adminDocs[0];

          // Create admin user-role relationship
          const adminUserRoleDoc = await roleService.addUserToRole(
            adminRoleId,
            adminUserId,
            systemUserId,
            sess,
            adminUserRoleId,
          );

          if (!adminUser.mnemonic.value) {
            throw new Error(
              translate(
                StringName.Error_MnemonicIsNullTemplate,
                {
                  NAME: StringName.Common_Admin,
                },
                undefined,
                'admin',
              ),
            );
          }

          return {
            adminDoc,
            adminUserRoleDoc,
            adminPassword: adminPasswordSecure.notNullValue,
            adminMnemonic: adminUser.mnemonic.notNullValue,
            adminBackupCodes: backupCodes,
            adminBurnbagMember: adminUser.member,
          };
        },
        { timeoutMs: 120000 }, // 2 minutes for admin user
      );

      // Create member user and role relationship in same transaction
      const memberResult: {
        memberDoc: IUserDocument;
        memberUserRoleDoc: IUserRoleDocument;
        memberPassword: string;
        memberMnemonic: string;
        memberBackupCodes: SecureString[];
        memberBurnbagUser: BrightChainMember;
      } = await withTransaction<{
        memberDoc: IUserDocument;
        memberUserRoleDoc: IUserRoleDocument;
        memberPassword: string;
        memberMnemonic: string;
        memberBackupCodes: SecureString[];
        memberBurnbagUser: BrightChainMember;
      }>(
        application.db.connection,
        application.environment.mongo.useTransactions,
        undefined,
        async (sess) => {
          const memberUser: {
            member: BrightChainMember;
            mnemonic: SecureString;
          } = BrightChainMember.newMember(
            eciesService,
            MemberType.User,
            AppConstants.MemberUser,
            new EmailString(AppConstants.MemberEmail),
            options.memberMnemonic,
            adminResult.adminDoc._id,
          );
          const memberPasswordSecure = options.memberPassword
            ? options.memberPassword
            : new SecureString(this.generatePassword(16));

          const memberMnemonicDoc = await mnemonicService.addMnemonic(
            memberUser.mnemonic,
            sess,
          );
          if (!memberMnemonicDoc) {
            throw new Error(
              translate(
                StringName.Error_FailedToStoreUserMnemonicTemplate,
                {
                  NAME: translate(StringName.Common_Member),
                },
                undefined,
                'admin',
              ),
            );
          }

          // Encrypt mnemonic for recovery
          const encryptedMemberMnemonic = memberUser.member
            .encryptData(Buffer.from(memberUser.mnemonic.value ?? '', 'utf-8'))
            .toString('hex');
          const wrapped = keyWrappingService.wrapSecret(
            memberUser.member.privateKey!,
            memberPasswordSecure,
          );
          const backupCodes =
            options.memberBackupCodes ?? BackupCode.generateBackupCodes();
          const encryptedBackupCodes = await BackupCode.encryptBackupCodes(
            memberUser.member,
            systemResult.systemBurnbagMember,
            backupCodes,
          );
          const memberDocs = await UserModel.create(
            [
              {
                _id: memberUserId,
                username: AppConstants.MemberUser,
                email: AppConstants.MemberEmail,
                publicKey: memberUser.member.publicKey.toString('hex'),
                mnemonicId: memberMnemonicDoc._id,
                mnemonicRecovery: encryptedMemberMnemonic,
                passwordWrappedPrivateKey: wrapped,
                backupCodes: encryptedBackupCodes,
                duressPasswords: [],
                timezone: application.environment.timezone.value,
                siteLanguage: StringLanguage.EnglishUS,
                emailVerified: true,
                accountStatus: AccountStatus.Active,
                overallCanaryStatus: CanaryStatus.Alive,
                createdAt: now,
                updatedAt: now,
                createdBy: systemUserId,
                updatedBy: systemUserId,
              },
            ],
            { session: sess },
          );
          if (memberDocs.length !== 1) {
            throw new Error(
              translate(
                StringName.Error_FailedToCreateUserTemplate,
                {
                  NAME: translate(StringName.Common_Member),
                },
                undefined,
                'admin',
              ),
            );
          }

          const memberDoc = memberDocs[0];

          // Create member user-role relationship
          const memberUserRoleDoc = await roleService.addUserToRole(
            memberRoleId,
            memberUserId,
            systemUserId,
            sess,
            memberUserRoleId,
          );

          if (!memberUser.mnemonic.value) {
            throw new Error(
              translate(
                StringName.Error_MnemonicIsNullTemplate,
                {
                  NAME: translate(StringName.Common_Member, undefined),
                },
                undefined,
                'admin',
              ),
            );
          }

          return {
            memberDoc,
            memberUserRoleDoc,
            memberPassword: memberPasswordSecure.notNullValue,
            memberMnemonic: memberUser.mnemonic.notNullValue,
            memberBackupCodes: backupCodes,
            memberBurnbagUser: memberUser.member,
          };
        },
        { timeoutMs: 120000 }, // 2 minutes for member user
      );

      return {
        success: true,
        data: {
          adminRole: rolesResult.adminRole,
          adminUserRole: adminResult.adminUserRoleDoc,
          adminUser: adminResult.adminDoc,
          adminUsername: adminResult.adminDoc.username,
          adminEmail: adminResult.adminDoc.email,
          adminMnemonic: adminResult.adminMnemonic,
          adminPassword: adminResult.adminPassword,
          adminBackupCodes: adminResult.adminBackupCodes.map(
            (bc) => bc.value ?? '',
          ),
          adminBurnbagMember: adminResult.adminBurnbagMember,
          memberRole: rolesResult.memberRole,
          memberUserRole: memberResult.memberUserRoleDoc,
          memberUser: memberResult.memberDoc,
          memberUsername: memberResult.memberDoc.username,
          memberEmail: memberResult.memberDoc.email,
          memberMnemonic: memberResult.memberMnemonic,
          memberPassword: memberResult.memberPassword,
          memberBackupCodes: memberResult.memberBackupCodes.map(
            (bc) => bc.value ?? '',
          ),
          memberBurnbagMember: memberResult.memberBurnbagUser,
          systemRole: rolesResult.systemRole,
          systemUserRole: systemResult.systemUserRoleDoc,
          systemUser: systemResult.systemDoc,
          systemUsername: systemResult.systemDoc.username,
          systemEmail: systemResult.systemDoc.email,
          systemMnemonic: systemResult.systemMnemonic,
          systemPassword: systemResult.systemPassword,
          systemBackupCodes: systemResult.systemBackupCodes.map(
            (bc) => bc.value ?? '',
          ),
          systemBurnbagMember: systemResult.systemBurnbagMember,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: translate(
          StringName.Admin_Error_FailedToInitializeUserDatabase,
          undefined,
          undefined,
          'admin',
        ),
        error:
          error instanceof Error
            ? error
            : new Error(
                translate(
                  StringName.Admin_Error_FailedToInitializeUserDatabase,
                  undefined,
                  undefined,
                  'admin',
                ),
              ),
      };
    }
  }

  public static printServerInitResults(result: IServerInitResult): void {
    debugLog(
      true,
      'log',
      t(
        '\n=== {{StringName.Admin_AccountCredentials}} ===',
        undefined,
        'admin',
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_System}} {{StringName.Common_ID}}: {id}',
        undefined,
        'admin',
        {
          id: result.systemUser._id.toHexString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_System}} {{StringName.Common_Role}}: {roleName}',
        undefined,
        'admin',
        {
          roleName: result.systemRole.name,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_System}} {{StringName.Common_Role}} {{StringName.Common_ID}}: {roleId}',
        undefined,
        'admin',
        {
          roleId: result.systemRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_System}} {{StringName.Common_User}} {{StringName.Common_Role}} {{StringName.Common_ID}}: {userRoleId}',
        undefined,
        'admin',
        {
          userRoleId: result.systemUserRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_System}} {{StringName.Common_Username}}: {username}',
        undefined,
        'admin',
        {
          username: result.systemUsername,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_System}} {{StringName.Common_Email}}: {email}',
        undefined,
        'admin',
        {
          email: result.systemEmail,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_System}} {{StringName.Common_Password}}: {password}',
        undefined,
        'admin',
        {
          password: result.systemPassword,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_System}} {{StringName.Common_Mnemonic}}: {mnemonic}',
        undefined,
        'admin',
        {
          mnemonic: result.systemMnemonic,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_System}} {{StringName.Common_PublicKey}}: {publicKey}',
        undefined,
        'admin',
        {
          publicKey: result.systemUser.publicKey,
        },
      ),
    );
    debugLog(
      true,
      'log',
      `${t(
        '{{StringName.Common_System}} {{StringName.Common_BackupCodes}}',
        undefined,
        'admin',
      )}: ${result.systemBackupCodes.join(', ')}`,
    );
    debugLog(true, 'log', '');
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Admin}} {{StringName.Common_ID}}: {id}',
        undefined,
        'admin',
        {
          id: result.adminUser._id.toHexString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Admin}} {{StringName.Common_Role}}: {roleName}',
        undefined,
        'admin',
        {
          roleName: result.adminRole.name,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Admin}} {{StringName.Common_Role}} {{StringName.Common_ID}}: {roleId}',
        undefined,
        'admin',
        {
          roleId: result.adminRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Admin}} {{StringName.Common_User}} {{StringName.Common_Role}} {{StringName.Common_ID}}: {userRoleId}',
        undefined,
        'admin',
        {
          userRoleId: result.adminUserRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Admin}} {{StringName.Common_Username}}: {username}',
        undefined,
        'admin',
        {
          username: result.adminUsername,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Admin}} {{StringName.Common_Email}}: {email}',
        undefined,
        'admin',
        {
          email: result.adminEmail,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Admin}} {{StringName.Common_Password}}: {password}',
        undefined,
        'admin',
        {
          password: result.adminPassword,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Admin}} {{StringName.Common_Mnemonic}}: {mnemonic}',
        undefined,
        'admin',
        {
          mnemonic: result.adminMnemonic,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Admin}} {{StringName.Common_PublicKey}}: {publicKey}',
        undefined,
        'admin',
        {
          publicKey: result.adminUser.publicKey,
        },
      ),
    );
    debugLog(
      true,
      'log',
      `${t(
        '{{StringName.Common_Admin}} {{StringName.Common_BackupCodes}}',
        undefined,
        'admin',
      )}: ${result.adminBackupCodes.join(', ')}`,
    );
    debugLog(true, 'log', '');
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Member}} {{StringName.Common_ID}}: {id}',
        undefined,
        'admin',
        {
          id: result.memberUser._id.toHexString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Member}} {{StringName.Common_Role}}: {roleName}',
        undefined,
        'admin',
        {
          roleName: result.memberRole.name,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Member}} {{StringName.Common_Role}} {{StringName.Common_ID}}: {roleId}',
        undefined,
        'admin',
        {
          roleId: result.memberRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Member}} {{StringName.Common_User}} {{StringName.Common_Role}} {{StringName.Common_ID}}: {userRoleId}',
        undefined,
        'admin',
        {
          userRoleId: result.memberUserRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Member}} {{StringName.Common_Username}}: {username}',
        undefined,
        'admin',
        {
          username: result.memberUsername,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Member}} {{StringName.Common_Email}}: {email}',
        undefined,
        'admin',
        {
          email: result.memberEmail,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Member}} {{StringName.Common_Password}}: {password}',
        undefined,
        'admin',
        {
          password: result.memberPassword,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Member}} {{StringName.Common_Mnemonic}}: {mnemonic}',
        undefined,
        'admin',
        {
          mnemonic: result.memberMnemonic,
        },
      ),
    );
    debugLog(
      true,
      'log',
      t(
        '{{StringName.Common_Member}} {{StringName.Common_PublicKey}}: {publicKey}',
        undefined,
        'admin',
        {
          publicKey: result.memberUser.publicKey,
        },
      ),
    );
    debugLog(
      true,
      'log',
      `${t(
        '{{StringName.Common_Member}} {{StringName.Common_BackupCodes}}',
        undefined,
        'admin',
      )}: ${result.memberBackupCodes.join(', ')}`,
    );
    debugLog(
      true,
      'log',
      t('\n=== {{StringName.Admin_EndCredentials}} ===', undefined, 'admin'),
    );
  }

  public static setEnvFromInitResults(result: IServerInitResult): void {
    process.env['ADMIN_ID'] = result.adminUser._id.toHexString();
    process.env['ADMIN_PUBLIC_KEY'] = result.adminUser.publicKey;
    process.env['ADMIN_MNEMONIC'] = result.adminMnemonic;
    process.env['ADMIN_PASSWORD'] = result.adminPassword;
    process.env['ADMIN_ROLE_ID'] = result.adminRole._id.toHexString();
    process.env['ADMIN_USER_ROLE_ID'] = result.adminUserRole._id.toHexString();
    //
    process.env['MEMBER_ID'] = result.memberUser._id.toHexString();
    process.env['MEMBER_PUBLIC_KEY'] = result.memberUser.publicKey;
    process.env['MEMBER_MNEMONIC'] = result.memberMnemonic;
    process.env['MEMBER_PASSWORD'] = result.memberPassword;
    process.env['MEMBER_ROLE_ID'] = result.memberRole._id.toHexString();
    process.env['MEMBER_USER_ROLE_ID'] =
      result.memberUserRole._id.toHexString();
    //
    process.env['SYSTEM_ID'] = result.systemUser._id.toHexString();
    process.env['SYSTEM_PUBLIC_KEY'] = result.systemUser.publicKey;
    process.env['SYSTEM_MNEMONIC'] = result.systemMnemonic;
    process.env['SYSTEM_PASSWORD'] = result.systemPassword;
    process.env['SYSTEM_ROLE_ID'] = result.systemRole._id.toHexString();
    process.env['SYSTEM_USER_ROLE_ID'] =
      result.systemUserRole._id.toHexString();
  }
}
