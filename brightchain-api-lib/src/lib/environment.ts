import {
  AppConstants,
  GuidV4,
  SecureBuffer,
  SecureString,
  StringLanguage,
  StringName,
  Timezone,
  translate,
} from '@brightchain/brightchain-lib';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { BackupCode } from './backupCode';
import { TranslatableError } from './errors/translatable-error-local';
import { setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv } from './getLanguage';
import { setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv } from './getTimezone';
import { IEnvironment } from './interfaces/environment';
import { IEnvironmentAws } from './interfaces/environment-aws';
import { DefaultBackendIdType } from './shared-types';
import { DEBUG_TYPE, debugLog, locatePEMRoot, parseBackupCodes } from './utils';

export class Environment implements IEnvironment {
  private readonly _environment: IEnvironment;
  private readonly _envObject: object;
  constructor(path?: string, initialization = false, override = true) {
    let envObj = process.env;
    let debug = envObj['DEBUG'] === 'true' || envObj['DEBUG'] === '1';
    let detailedDebug =
      envObj['DETAILED_DEBUG'] === 'true' || envObj['DETAILED_DEBUG'] === '1';
    if (path && existsSync(path)) {
      debugLog(
        debug,
        'log',
        translate(StringName.Admin_LoadingEnvironmentTemplate, {
          PATH: path,
        }),
      );
      const result = config({ path, override: override });
      envObj = override
        ? { ...envObj, ...result.parsed }
        : { ...result.parsed, ...envObj };
      // debug / detailedDebug may have changed due to the env loading
      debug = envObj['DEBUG'] === 'true' || envObj['DEBUG'] === '1';
      detailedDebug =
        envObj['DETAILED_DEBUG'] === 'true' || envObj['DETAILED_DEBUG'] === '1';

      if (result.error || !result.parsed) {
        throw new TranslatableError(
          StringName.Admin_Error_FailedToLoadEnvironment,
        );
      }
    } else if (path) {
      debugLog(
        debug,
        'warn',
        translate(StringName.Admin_EnvFileNotFoundTemplate, {
          PATH: path,
        }),
      );
    } else {
      console.log(translate(StringName.Admin_EnvFileNotFound));
    }

    const httpsDevCertRoot = process.env['HTTPS_DEV_CERT_DIR']
      ? locatePEMRoot(process.env['HTTPS_DEV_CERT_DIR'])
      : undefined;
    const httpsDevPort = process.env['HTTPS_DEV_PORT']
      ? parseInt(process.env['HTTPS_DEV_PORT'] ?? '3443')
      : 443;

    this._environment = {
      debug: debug,
      detailedDebug: detailedDebug,
      host: envObj['HOST'] ?? '0.0.0.0',
      port: envObj['PORT'] ? Number(envObj['PORT']) : 3000,
      jwtSecret: envObj['JWT_SECRET'] ?? 'd!6!7al-6urnb46-s3cr3t!',
      fontAwesomeKitId: envObj['FONTAWESOME_KIT_ID'] ?? '',
      emailSender: envObj['EMAIL_SENDER'] ?? 'noreply@digitalburnbag.com',
      basePath: envObj['BASE_PATH'] ?? '/',
      serverUrl:
        envObj['NODE_ENV'] === 'production'
          ? 'https://cursefund.com'
          : httpsDevCertRoot
            ? `https://localhost:${httpsDevPort}`
            : 'http://localhost:3000',
      // Avoid importing Application here to prevent circular deps
      // Compute dist dir from process.cwd() directly
      apiDistDir:
        envObj['API_DIST_DIR'] ??
        join(process.cwd(), 'dist', 'brightchain-api'),
      reactDistDir:
        envObj['REACT_DIST_DIR'] ??
        join(process.cwd(), 'dist', 'brightchain-react'),
      httpsDevCertRoot: httpsDevCertRoot,
      httpsDevPort: httpsDevPort,
      disableEmailSend:
        envObj['DISABLE_EMAIL_SEND'] === 'true' ||
        envObj['DISABLE_EMAIL_SEND'] === '1',
      aws: {
        accessKeyId: new SecureString(envObj['AWS_ACCESS_KEY_ID'] ?? ''),
        secretAccessKey: new SecureString(
          envObj['AWS_SECRET_ACCESS_KEY'] ?? '',
        ),
        region: envObj['AWS_REGION'] ?? 'us-west-2', // Default to a region if not set
      },
      adminMnemonic: new SecureString(envObj['ADMIN_MNEMONIC'] ?? null),
      adminCreatedAt: envObj['ADMIN_CREATED_AT']
        ? new Date(envObj['ADMIN_CREATED_AT'])
        : new Date(),
      adminId: envObj['ADMIN_ID']
        ? new GuidV4(envObj['ADMIN_ID'])
        : new GuidV4(),
      adminPassword: envObj['ADMIN_PASSWORD']
        ? new SecureString(envObj['ADMIN_PASSWORD'])
        : undefined,
      adminRoleId: envObj['ADMIN_ROLE_ID']
        ? new GuidV4(envObj['ADMIN_ROLE_ID'])
        : undefined,
      adminUserRoleId: envObj['ADMIN_ROLE_ID']
        ? new GuidV4(envObj['ADMIN_ROLE_ID'])
        : undefined,
      adminBackupCodes: envObj['ADMIN_BACKUP_CODES']
        ? parseBackupCodes('admin', envObj)
        : undefined,
      memberMnemonic: new SecureString(envObj['MEMBER_MNEMONIC'] ?? null),
      memberCreatedAt: envObj['MEMBER_CREATED_AT']
        ? new Date(envObj['MEMBER_CREATED_AT'])
        : new Date(),
      memberId: envObj['MEMBER_ID']
        ? new GuidV4(envObj['MEMBER_ID'])
        : new GuidV4(),
      memberPassword: envObj['MEMBER_PASSWORD']
        ? new SecureString(envObj['MEMBER_PASSWORD'])
        : undefined,
      memberRoleId: envObj['MEMBER_ROLE_ID']
        ? new GuidV4(envObj['MEMBER_ROLE_ID'])
        : undefined,
      memberUserRoleId: envObj['MEMBER_USER_ROLE_ID']
        ? new GuidV4(envObj['MEMBER_USER_ROLE_ID'])
        : undefined,
      memberBackupCodes: envObj['MEMBER_BACKUP_CODES']
        ? parseBackupCodes('member', envObj)
        : undefined,
      systemMnemonic: new SecureString(envObj['SYSTEM_MNEMONIC'] ?? null),
      systemCreatedAt: envObj['SYSTEM_CREATED_AT']
        ? new Date(envObj['SYSTEM_CREATED_AT'])
        : new Date(),
      systemId: envObj['SYSTEM_ID']
        ? new GuidV4(envObj['SYSTEM_ID'])
        : new GuidV4(),
      systemPublicKeyHex: envObj['SYSTEM_PUBLIC_KEY'] ?? undefined,
      systemPassword: envObj['SYSTEM_PASSWORD']
        ? new SecureString(envObj['SYSTEM_PASSWORD'])
        : undefined,
      systemRoleId: envObj['SYSTEM_ROLE_ID']
        ? new GuidV4(envObj['SYSTEM_ROLE_ID'])
        : undefined,
      systemUserRoleId: envObj['SYSTEM_ROLE_ID']
        ? new GuidV4(envObj['SYSTEM_ROLE_ID'])
        : undefined,
      systemBackupCodes: envObj['SYSTEM_BACKUP_CODES']
        ? parseBackupCodes('system', envObj)
        : undefined,
      mnemonicHmacSecret: new SecureBuffer(
        Buffer.from(envObj['MNEMONIC_HMAC_SECRET'] ?? '', 'hex'),
      ),
      mnemonicEncryptionKey: new SecureBuffer(
        Buffer.from(envObj['MNEMONIC_ENCRYPTION_KEY'] ?? '', 'hex'),
      ),
      timezone: setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv(),

      // Set language last as it depends on process.env and argv
      adminLanguage: setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv(),
      pbkdf2Iterations: parseInt(envObj['PBKDF2_ITERATIONS'] ?? '100000'),
    };
    this._envObject = envObj;
    // ensure all required environment variables are set
    if (!this._environment.host) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, { NAME: 'HOST' }),
      );
    }
    if (!this._environment.port) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, { NAME: 'PORT' }),
      );
    }
    if (!this._environment.serverUrl) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, { NAME: 'SERVER_URL' }),
      );
    }
    if (!this._environment.jwtSecret) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, { NAME: 'JWT_SECRET' }),
      );
    }
    if (!this._environment.emailSender) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, { NAME: 'EMAIL_SENDER' }),
      );
    }
    if (!initialization && !this._environment.systemPublicKeyHex) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, {
          NAME: 'SYSTEM_PUBLIC_KEY',
        }),
      );
    }
    if (
      process.env['NODE_ENV'] !== 'test' &&
      this._environment.aws.accessKeyId.length === 0
    ) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, {
          NAME: 'AWS_ACCESS_KEY_ID',
        }),
      );
    }
    if (
      process.env['NODE_ENV'] !== 'test' &&
      this._environment.aws.secretAccessKey.length === 0
    ) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, {
          NAME: 'AWS_SECRET_ACCESS_KEY',
        }),
      );
    }
    if (!this._environment.aws.region) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, { NAME: 'AWS_REGION' }),
      );
    }
    if (this._environment.mnemonicHmacSecret.length !== 32) {
      throw new Error('MNEMONIC_HMAC_SECRET must be a 64 character hex string');
    }
    if (this._environment.mnemonicEncryptionKey.length !== 32) {
      throw new Error(
        'MNEMONIC_ENCRYPTION_KEY must be a 64 character hex string',
      );
    }
    if (
      this._environment.adminMnemonic?.value &&
      !AppConstants.MnemonicRegex.test(
        this._environment.adminMnemonic.value ?? '',
      )
    ) {
      throw new Error('ADMIN_MNEMONIC must be a valid mnemonic phrase');
    }
    if (
      this._environment.memberMnemonic?.value &&
      !AppConstants.MnemonicRegex.test(
        this._environment.memberMnemonic.value ?? '',
      )
    ) {
      throw new Error('MEMBER_MNEMONIC must be a valid mnemonic phrase');
    }
    if (!this._environment.apiDistDir) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, {
          NAME: 'API_DIST_DIR',
        }),
      );
    } else if (!existsSync(this._environment.apiDistDir)) {
      throw new Error(
        translate(StringName.Admin_EnvDirSetButMissingTemplate, {
          VAR: 'API_DIST_DIR',
          PATH: this._environment.apiDistDir,
        }),
      );
    }
    if (!this._environment.reactDistDir) {
      throw new Error(
        translate(StringName.Admin_EnvNotSetTemplate, {
          NAME: 'REACT_DIST_DIR',
        }),
      );
    } else if (!existsSync(this._environment.reactDistDir)) {
      throw new Error(
        translate(StringName.Admin_EnvDirSetButMissingTemplate, {
          VAR: 'REACT_DIST_DIR',
          PATH: this._environment.reactDistDir,
        }),
      );
    }
    if (this.pbkdf2Iterations < 1) {
      throw new Error('PBKDF2_ITERATIONS must be greater than 0');
    }
  }

  public has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this._envObject, key);
  }

  public get(key: string): string | undefined {
    return this.has(key) ? String((this._envObject as any)[key]) : undefined;
  }

  public getObject(): object {
    return this._envObject;
  }

  /**
   * Whether to print certain console debug messages and enable certain debug features
   */
  public get debug(): boolean {
    return this._environment.debug;
  }

  public get detailedDebug(): boolean {
    return this._environment.detailedDebug;
  }

  /**
   * The hostname of this server
   */
  public get host(): string {
    return this._environment.host;
  }

  /**
   * The primary port of this server
   */
  public get port(): number {
    return this._environment.port;
  }

  /**
   * The JWT secret of this server
   */
  public get jwtSecret(): string {
    return this._environment.jwtSecret;
  }

  /**
   * The FontAwesome kit Id
   */
  public get fontAwesomeKitId(): string {
    return this._environment.fontAwesomeKitId;
  }

  /**
   * The email sernder for this site
   */
  public get emailSender(): string {
    return this._environment.emailSender;
  }

  /**
   * The base path of the express http server (eg /)
   */
  public get basePath(): string {
    return this._environment.basePath;
  }

  /**
   * The full URL to the server
   */
  public get serverUrl(): string {
    return this._environment.serverUrl;
  }

  /**
   * The path to the API dist directory
   */
  public get apiDistDir(): string {
    return this._environment.apiDistDir;
  }

  /**
   * The path to the react dist directory
   */
  public get reactDistDir(): string {
    return this._environment.reactDistDir;
  }

  /**
   * The directory + cert root name (eg /workspaces/DigitalBurnbag/locahost+2) to store HTTPS development certificates
   */
  public get httpsDevCertRoot(): string | undefined {
    return this._environment.httpsDevCertRoot;
  }

  /**
   * The port to use for development HTTPS
   */
  public get httpsDevPort(): number {
    return this._environment.httpsDevPort;
  }

  /**
   * Whether to disable email sending
   */
  public get disableEmailSend(): boolean {
    return this._environment.disableEmailSend;
  }

  /**
   * The AWS configuration (primarily for email sending and S3)
   */
  public get aws(): IEnvironmentAws {
    return this._environment.aws;
  }

  /**
   * The admin user's mnemonic used to encrypt all files
   */
  public get adminMnemonic(): SecureString | undefined {
    return this._environment.adminMnemonic;
  }

  /**
   * The date the admin user was created
   */
  public get adminCreatedAt(): Date | undefined {
    return this._environment.adminCreatedAt;
  }

  /**
   * The ID of the admin user
   */
  public get adminId(): DefaultBackendIdType | undefined {
    return this._environment.adminId;
  }

  /**
   * The password of the admin user
   */
  public get adminPassword(): SecureString | undefined {
    return this._environment.adminPassword;
  }

  /**
   * The role ID of the admin user
   */
  public get adminRoleId(): DefaultBackendIdType | undefined {
    return this._environment.adminRoleId;
  }

  /**
   * The user role ID of the admin user
   */
  public get adminUserRoleId(): DefaultBackendIdType | undefined {
    return this._environment.adminUserRoleId;
  }

  /**
   * Backup codes for the admin user
   */
  public get adminBackupCodes(): BackupCode[] | undefined {
    return this._environment.adminBackupCodes;
  }

  /**
   * The test member user's mnemonic used to encrypt all files
   */
  public get memberMnemonic(): SecureString | undefined {
    return this._environment.memberMnemonic;
  }

  /**
   * The date the member user was created
   */
  public get memberCreatedAt(): Date | undefined {
    return this._environment.memberCreatedAt;
  }

  /**
   * The date the member user was created
   */
  public get memberId(): DefaultBackendIdType | undefined {
    return this._environment.memberId;
  }

  /**
   * The password of the member user
   */
  public get memberPassword(): SecureString | undefined {
    return this._environment.memberPassword;
  }

  /**
   * The role ID of the member user
   */
  public get memberRoleId(): DefaultBackendIdType | undefined {
    return this._environment.memberRoleId;
  }

  /**
   * The user role ID of the member user
   */
  public get memberUserRoleId(): DefaultBackendIdType | undefined {
    return this._environment.memberUserRoleId;
  }

  /**
   * Backup codes for the member user
   */
  public get memberBackupCodes(): BackupCode[] | undefined {
    return this._environment.memberBackupCodes;
  }

  /**
   * The system user's mnemonic used to encrypt all files
   */
  public get systemMnemonic(): SecureString | undefined {
    return this._environment.systemMnemonic;
  }

  /**
   * The date the system user was created
   */
  public get systemCreatedAt(): Date | undefined {
    return this._environment.systemCreatedAt;
  }

  /**
   * The ID of the system user
   */
  public get systemId(): DefaultBackendIdType | undefined {
    return this._environment.systemId;
  }

  /**
   * The public key of the system user
   */
  public get systemPublicKeyHex(): string | undefined {
    return this._environment.systemPublicKeyHex;
  }

  /**
   * The password of the system user
   */
  public get systemPassword(): SecureString | undefined {
    return this._environment.systemPassword;
  }

  /**
   * The role ID of the system user
   */
  public get systemRoleId(): DefaultBackendIdType | undefined {
    return this._environment.systemRoleId;
  }

  /**
   * The user role ID of the system user
   */
  public get systemUserRoleId(): DefaultBackendIdType | undefined {
    return this._environment.systemUserRoleId;
  }

  /**
   * Backup codes for the system user
   */
  public get systemBackupCodes(): BackupCode[] | undefined {
    return this._environment.systemBackupCodes;
  }

  /**
   * The system's HMAC secret for the mnemonic tracking collection
   */
  public get mnemonicHmacSecret(): SecureBuffer {
    return this._environment.mnemonicHmacSecret;
  }

  /**
   * The system's HMAC encryption key for the mnemonic tracking collection
   */
  public get mnemonicEncryptionKey(): SecureBuffer {
    return this._environment.mnemonicEncryptionKey;
  }

  /**
   * The timezone for the server
   */
  public get timezone(): Timezone {
    return this._environment.timezone;
  }

  public get adminLanguage(): StringLanguage {
    return this._environment.adminLanguage;
  }

  /**
   * The number of pbkdf2 iterations for key wrapping
   */
  public get pbkdf2Iterations(): number {
    return this._environment.pbkdf2Iterations;
  }

  /**
   * Console dump the environment variables for debugging purposes
   */
  public dumpEnvironment(logLevel: DEBUG_TYPE = 'log'): void {
    debugLog(
      true,
      logLevel,
      `Environment Variables:
-------------------------
DEBUG: ${this.debug}
DETAILED_DEBUG: ${this.detailedDebug}
HOST: ${this.host}
PORT: ${this.port}
JWT_SECRET: ${this.jwtSecret}
FONTAWESOME_KIT_ID: ${this.fontAwesomeKitId}
EMAIL_SENDER: ${this.emailSender}
BASE_PATH: ${this.basePath}
SERVER_URL: ${this.serverUrl}
API_DIST_DIR: ${this.apiDistDir}
REACT_DIST_DIR: ${this.reactDistDir}
DISABLE_EMAIL_SEND: ${this.disableEmailSend}
TIMEZONE: ${this.timezone.value}
LANGUAGE: ${this.adminLanguage}
AWS Configuration:
-- Access Key ID: ${this.aws.accessKeyId.value}
-- Secret Key: ${this.aws.secretAccessKey.value}
-- Region: ${this.aws.region}
Admin User Data:
-- ADMIN_ID: ${this.adminId?.toString()}
-- ADMIN_CREATED_AT: ${this.adminCreatedAt?.toISOString()}
-- ADMIN_MNEMONIC: ${this.adminMnemonic?.value}
-- ADMIN_PASSWORD: ${this.adminPassword?.value}
-- ADMIN_ROLE_ID: ${this.adminRoleId?.toString()}
-- ADMIN_ROLE_ID: ${this.adminUserRoleId?.toString()}
-- ADMIN_BACKUP_CODES: ${this.adminBackupCodes
        ?.map((code: SecureString) => code.value)
        .join(', ')}
Member User Data:
-- MEMBER_ID: ${this.memberId?.toString()}
-- MEMBER_CREATED_AT: ${this.memberCreatedAt?.toISOString()}
-- MEMBER_MNEMONIC: ${this.adminMnemonic?.value}
-- MEMBER_PASSWORD: ${this.memberPassword?.value}
-- MEMBER_ROLE_ID: ${this.memberRoleId?.toString()}
-- MEMBER_USER_ROLE_ID: ${this.memberUserRoleId?.toString()}
-- MEMBER_BACKUP_CODES: ${this.memberBackupCodes
        ?.map((code: SecureString) => code.value)
        .join(', ')}
System User Data:
-- SYSTEM_ID: ${this.systemId?.toString()}
-- SYSTEM_CREATED_AT: ${this.systemCreatedAt?.toISOString()}
-- SYSTEM_MNEMONIC: ${this.systemMnemonic?.value}
-- SYSTEM_PUBLIC_KEY: ${this.systemPublicKeyHex}
-- SYSTEM_PASSWORD: ${this.systemPassword?.value}
-- SYSTEM_ROLE_ID: ${this.systemRoleId?.toString()}
-- SYSTEM_ROLE_ID: ${this.systemUserRoleId?.toString()}
-- SYSTEM_BACKUP_CODES: ${this.systemBackupCodes
        ?.map((code: SecureString) => code.value)
        .join(', ')}
Mnemonic Service Configuration:
-- MNEMONIC_HMAC_SECRET: ${this.mnemonicHmacSecret.valueAsHexString}
-- MNEMONIC_ENCRYPTION_KEY: ${this.mnemonicEncryptionKey.valueAsHexString}
PBKDF2 Iterations: ${this.pbkdf2Iterations}
-------------------------`,
    );
  }
}
