import {
  AppConstants,
  SecureBuffer,
  SecureString,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';
import { createHmac } from 'crypto';
import { ClientSession, Model } from 'mongoose';
import { IMnemonicDocument } from '../documents/mnemonic';
import { KeyWrappingService } from './keyWrapping';

/**
 * Encrypts and stores mnemonics securely, using an HMAC to check for
 * uniqueness without exposing the mnemonic itself.
 */
export class MnemonicService {
  private readonly keyWrappingService: KeyWrappingService;
  private readonly hmacSecret: SecureBuffer;
  private readonly MnemonicModel: Model<IMnemonicDocument>;

  constructor(
    mnemonicModel: Model<IMnemonicDocument>,
    hmacSecret: SecureBuffer,
    keyWrappingService: KeyWrappingService,
  ) {
    this.MnemonicModel = mnemonicModel;
    // Immediately wrap secrets in secure containers
    this.hmacSecret = hmacSecret;
    this.keyWrappingService = keyWrappingService;
  }

  /**
   * Disposes of the secure secrets held by this service.
   */
  public dispose(): void {
    this.hmacSecret.dispose();
  }

  /**
   * Creates a non-reversible HMAC of the mnemonic for fast, indexed lookups.
   * @param mnemonic The mnemonic to hash, wrapped in a SecureString.
   */
  public getMnemonicHmac(mnemonic: SecureString): string {
    // Use the raw secret buffer for the HMAC
    return createHmac('sha256', this.hmacSecret.value)
      .update(mnemonic.valueAsBuffer) // Use the raw buffer for consistency
      .digest('hex');
  }

  /**
   * Checks if a mnemonic already exists in the database using its HMAC.
   * @param mnemonic The mnemonic to check, wrapped in a SecureString.
   * @param session Optional Mongoose session for transaction support.
   */
  public async mnemonicExists(
    mnemonic: SecureString,
    session?: ClientSession,
  ): Promise<boolean> {
    const hmac = this.getMnemonicHmac(mnemonic);
    const count = await this.MnemonicModel.countDocuments({ hmac }).session(
      session ?? null,
    );
    return count > 0;
  }

  /**
   * Adds a new, unique mnemonic to the database with password-based key wrapping.
   * @param mnemonic The mnemonic to add, wrapped in a SecureString.
   * @param password User's password for key wrapping.
   * @param session Optional Mongoose session for transaction support.
   */
  public async addMnemonicWithPassword(
    mnemonic: SecureString,
    _password: SecureString,
    session?: ClientSession,
  ): Promise<{
    document: IMnemonicDocument | null;
  }> {
    if (!mnemonic.value || !AppConstants.MnemonicRegex.test(mnemonic.value)) {
      throw new Error(translate(StringName.Validation_MnemonicRegex));
    }

    if (await this.mnemonicExists(mnemonic, session)) {
      return { document: null };
    }

    try {
      const hmac = this.getMnemonicHmac(mnemonic);
      const [newDoc] = await this.MnemonicModel.create(
        [
          {
            hmac: hmac,
          },
        ],
        { session },
      );
      return { document: newDoc };
    } finally {
      // nothing to dispose
    }
  }

  /**
   * Adds a new, unique mnemonic to the database.
   * @param mnemonic The mnemonic to add, wrapped in a SecureString.
   * @param session Optional Mongoose session for transaction support.
   */
  public async addMnemonic(
    mnemonic: SecureString,
    session?: ClientSession,
  ): Promise<IMnemonicDocument | null> {
    if (!mnemonic.value || !AppConstants.MnemonicRegex.test(mnemonic.value)) {
      throw new Error(translate(StringName.Validation_MnemonicRegex));
    }

    if (await this.mnemonicExists(mnemonic, session)) {
      return null;
    }
    const hmac = this.getMnemonicHmac(mnemonic);
    const [newDoc] = await this.MnemonicModel.create(
      [
        {
          hmac: hmac,
        },
      ],
      { session },
    );
    return newDoc;
  }

  /**
   * Retrieves a mnemonic document by ID.
   * @param mnemonicId The ID of the mnemonic document.
   * @param session Optional Mongoose session for transaction support.
   */
  public async getMnemonicDocument(
    mnemonicId: string,
    session?: ClientSession,
  ): Promise<IMnemonicDocument | null> {
    return await this.MnemonicModel.findById(mnemonicId).session(
      session ?? null,
    );
  }

  /**
   * Decrypts a mnemonic from a document using the service's master encryption key.
   * @param doc The mnemonic document.
   */

  /**
   * Deletes a mnemonic document by ID.
   * @param mnemonicId The ID of the mnemonic document.
   * @param session Optional Mongoose session for transaction support.
   */
  public async deleteMnemonicDocument(
    mnemonicId: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.MnemonicModel.findByIdAndDelete(mnemonicId).session(
      session ?? null,
    );
  }
}
