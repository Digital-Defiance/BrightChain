import {
  AppConstants,
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';
import { BrightChainMember } from '../backendMember';
import { Environment } from '../environment';
import { ECIESService } from './ecies';

/**
 * Service to manage the system member's wallet.
 */
export class SystemUserService {
  private static systemUser: BrightChainMember | null = null;
  private static eciesService: ECIESService = new ECIESService();

  /**
   * Initializes and returns the system member's BurnbagMember instance.
   * The mnemonic should be stored securely in environment variables.
   */
  public static getSystemUser(environment: Environment): BrightChainMember {
    if (!SystemUserService.systemUser) {
      if (!environment.systemMnemonic) {
        throw new Error(
          translate(StringName.Admin_EnvNotSetTemplate, {
            NAME: 'SYSTEM_MNEMONIC',
          }),
        );
      }
      const mnemonic: SecureString = environment.systemMnemonic;
      const { wallet } =
        SystemUserService.eciesService.walletAndSeedFromMnemonic(mnemonic);
      const keyPair =
        SystemUserService.eciesService.walletToSimpleKeyPairBuffer(wallet);

      SystemUserService.systemUser = new BrightChainMember(
        SystemUserService.eciesService,
        MemberType.System,
        AppConstants.SystemUser,
        new EmailString(AppConstants.SystemEmail),
        keyPair.publicKey,
        new SecureBuffer(keyPair.privateKey),
        wallet,
      );
      if (
        SystemUserService.systemUser.publicKey.toString('hex') !==
        environment.systemPublicKeyHex
      ) {
        console.warn('System public key does not match environment variable', {
          derived: SystemUserService.systemUser.publicKey.toString('hex'),
          expected: environment.systemPublicKeyHex,
        });
      }
    }
    return SystemUserService.systemUser;
  }

  public static setSystemUser(user: BrightChainMember): void {
    if (
      user.type !== MemberType.System ||
      user.name !== AppConstants.SystemUser
    ) {
      throw new Error(
        'setSystemUser can only be called with a MemberType.System user',
      );
    }
    SystemUserService.systemUser = user;
  }
}
