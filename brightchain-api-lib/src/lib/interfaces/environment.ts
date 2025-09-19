import {
  SecureBuffer,
  SecureString,
  StringLanguage,
  Timezone,
} from '@brightchain/brightchain-lib';
import { BackupCode } from '../backupCode';
import { DefaultBackendIdType } from '../shared-types';
import { IEnvironmentAws } from './environment-aws';

export interface IEnvironment {
  /**
   * Whether to print certain console debug messages
   */
  debug: boolean;
  /**
   * Whether to enable super verbose debug messags
   */
  detailedDebug: boolean;
  /**
   * The host name of the server
   */
  host: string;
  /**
   * The port the server is running on
   */
  port: number;
  /**
   * The base path of the server
   */
  basePath: string;
  /**
   * The URL of the server
   */
  serverUrl: string;
  /**
   * The secret used to sign JWTs
   */
  jwtSecret: string;
  /**
   * The FontAwesome kit ID
   */
  fontAwesomeKitId: string;
  /**
   * The email address to send notifications from
   */
  emailSender: string;
  /**
   * API distribution directory
   */
  apiDistDir: string;
  /**
   * react dist dir
   */
  reactDistDir: string;
  /**
   * The directory and root filename (eg /workspaces/DigitalBurnbag/locahost+2) to store HTTPS development certificates
   */
  httpsDevCertRoot?: string;
  /**
   * The port to use for HTTPS development certificates
   */
  httpsDevPort: number;
  /**
   * Disable email sending
   */
  disableEmailSend: boolean;
  /**
   * AWS configuration
   */
  aws: IEnvironmentAws;
  /**
   * Mnemonic for the admin user
   */
  adminMnemonic?: SecureString;
  /**
   * The ID of the admin user
   */
  adminId?: DefaultBackendIdType;
  /**
   * The creation date of the admin user
   */
  adminCreatedAt?: Date;
  /**
   * The password of the admin user
   */
  adminPassword?: SecureString;
  /**
   * The ID of the admin user role object
   */
  adminRoleId?: DefaultBackendIdType;
  /**
   * The ID of the admin user's user role object
   */
  adminUserRoleId?: DefaultBackendIdType;
  /**
   * Backup codes for the admin user
   */
  adminBackupCodes?: BackupCode[];
  /**
   * Mnemonic for the member user
   */
  memberMnemonic?: SecureString;
  /**
   * The ID of the member user
   */
  memberId?: DefaultBackendIdType;
  /**
   * The creation date of the member user
   */
  memberCreatedAt?: Date;
  /**
   * The password of the member user
   */
  memberPassword?: SecureString;
  /**
   * The ID of the member user role object
   */
  memberRoleId?: DefaultBackendIdType;
  /**
   * The ID of the member user's user role object
   */
  memberUserRoleId?: DefaultBackendIdType;
  /**
   * Backup codes for the member user
   */
  memberBackupCodes?: BackupCode[];
  /**
   * Mnemonic for the system user
   */
  systemMnemonic?: SecureString;
  /**
   * The ID of the system user
   */
  systemId?: DefaultBackendIdType;
  /**
   * The creation date of the system user
   */
  systemCreatedAt?: Date;
  /**
   * The public key of the system user
   */
  systemPublicKeyHex?: string;
  /**
   * The password of the system user
   */
  systemPassword?: SecureString;
  /**
   * The ID of the system user role object
   */
  systemRoleId?: DefaultBackendIdType;
  /**
   * The ID of the system user's user role object
   */
  systemUserRoleId?: DefaultBackendIdType;
  /**
   * Backup codes for the system user
   */
  systemBackupCodes?: BackupCode[];
  /**
   * HMAC secret for mnemonic encryption
   */
  mnemonicHmacSecret: SecureBuffer;
  /**
   * Encryption key for mnemonics
   */
  mnemonicEncryptionKey: SecureBuffer;
  /**
   * The timezone for the server
   */
  timezone: Timezone;
  /**
   * The default language for the admin interface/CLI
   */
  adminLanguage: StringLanguage;
  /**
   * The number of PBKDF2 iterations for key wrapping
   */
  pbkdf2Iterations: number;
}
