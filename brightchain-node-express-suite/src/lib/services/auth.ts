/**
 * @fileoverview Base AuthService for BrightDB-backed applications.
 *
 * Handles core user authentication: register, login, JWT signing/verification,
 * password change, and mnemonic recovery. Uses MemberStore + EnergyAccountStore
 * from brightchain-lib, bcrypt for password hashing, and jsonwebtoken for JWTs.
 *
 * Domain-specific extensions (e.g. BrightHub profile creation, additional
 * controllers) are added by subclasses in consuming libraries.
 *
 * @module services/auth
 */

import {
  Checksum,
  EmailString,
  EnergyAccount,
  EnergyAccountStore,
  IRecoveryResponse,
  MemberStore,
  ServiceProvider,
  type IPasswordWrappedPrivateKey,
} from '@brightchain/brightchain-lib';
import {
  Constants as BaseConstants,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  Member,
  PlatformID,
} from '@digitaldefiance/node-ecies-lib';
import {
  KeyWrappingService,
  SystemUserService,
} from '@digitaldefiance/node-express-suite';
import {
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import type { SuiteCoreStringKeyValue } from '@digitaldefiance/suite-core-lib';
import * as bcrypt from 'bcrypt';
import { createHmac, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { IAuthCredentials } from '../interfaces/auth-credentials';
import type { IAuthToken } from '../interfaces/auth-token';
import type { ITokenPayload } from '../interfaces/token-payload';
import type { IBrightDbApplication } from '../interfaces/bright-db-application';
import type { BrightDbAuthenticationProvider } from './bright-db-authentication-provider';

const BCRYPT_ROUNDS = 12;

/**
 * Base authentication service for BrightDB-backed applications.
 *
 * Provides register, login, JWT sign/verify, password change, and
 * mnemonic recovery. Subclasses can override methods to add domain-specific
 * behavior (e.g. creating social profiles on registration).
 */
export class BrightDbAuthService<TID extends PlatformID = Buffer> {
  protected memberStore: MemberStore;
  protected energyStore: EnergyAccountStore;
  protected jwtSecret: string;
  protected authProvider?: BrightDbAuthenticationProvider<TID>;
  protected readonly application: IBrightDbApplication<TID>;

  constructor(
    application: IBrightDbApplication<TID>,
    memberStore: MemberStore,
    energyStore: EnergyAccountStore,
    jwtSecret: string,
    authProvider?: BrightDbAuthenticationProvider<TID>,
  ) {
    this.application = application;
    this.memberStore = memberStore;
    this.energyStore = energyStore;
    this.jwtSecret = jwtSecret;
    this.authProvider = authProvider;
  }

  async register(
    username: string,
    email: string,
    password: SecureString,
    mnemonic?: SecureString,
  ): Promise<IAuthToken> {
    // Check for duplicate email
    const existing = await this.memberStore.queryIndex({ email });
    if (existing.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password before member creation
    const passwordValue = password.value;
    if (!passwordValue) {
      throw new Error('Password value is empty');
    }
    const passwordHash = await bcrypt.hash(passwordValue, BCRYPT_ROUNDS);

    const sp = ServiceProvider.getInstance();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let liveMember: Member<any>;
    let resultMnemonic: SecureString;
    let memberId: string;
    let memberChecksum: Checksum;

    if (mnemonic?.value) {
      // ── User-provided mnemonic path ──────────────────────────────────
      const trimmed = mnemonic.value.trim();

      // Defense-in-depth: validate format even though controller already checked
      if (!BaseConstants.MnemonicRegex.test(trimmed)) {
        throw new Error('Invalid mnemonic format');
      }

      // HMAC uniqueness check
      const hmacSecretHex =
        this.application.environment.get('MNEMONIC_HMAC_SECRET');
      if (!hmacSecretHex) {
        throw new Error('MNEMONIC_HMAC_SECRET is not configured');
      }
      const hmac = createHmac('sha256', Buffer.from(hmacSecretHex, 'hex'))
        .update(Buffer.from(trimmed, 'utf-8'))
        .digest('hex');

      // Check if the HMAC already exists in the mnemonic collection
      const mnemonicsCollection = this.application.db.collection<
        Record<string, unknown> & { _id?: string }
      >('mnemonics');
      const existingHmac = await mnemonicsCollection.findOne({
        hmac,
      } as never);
      if (existingHmac) {
        throw new TranslatableSuiteError(
          'validation_mnemonicInUse' as SuiteCoreStringKeyValue,
        );
      }

      // Create member with user-provided mnemonic via memberStore so it gets
      // properly indexed (same flow as the server-generated path).
      const { reference: mnemonicRef, mnemonic: returnedMnemonic } =
        await this.memberStore.createMember({
          type: MemberType.User,
          name: username,
          contactEmail: new EmailString(email),
          forceMnemonic: new SecureString(trimmed),
        });
      resultMnemonic = returnedMnemonic;

      const idRawBytes = sp.idProvider.toBytes(mnemonicRef.id);
      memberId = sp.idProvider.idToString(mnemonicRef.id);
      memberChecksum = sp.checksumService.calculateChecksum(idRawBytes);

      // Reconstruct the live member from the mnemonic so we have the private key
      // for key wrapping. createMember() only returns a reference.
      const eciesService = sp.eciesService as unknown as ECIESService<TID>;
      const { member: reconstructed } = Member.newMember(
        eciesService,
        MemberType.User,
        username,
        new EmailString(email),
        new SecureString(trimmed),
      );
      liveMember = reconstructed;

      // Store the HMAC in the mnemonic collection for uniqueness tracking
      await mnemonicsCollection.create({
        _id: randomUUID(),
        hmac,
      } as never);
    } else {
      // ── Server-generated mnemonic path (existing flow) ───────────────
      const { reference, mnemonic: generatedMnemonic } =
        await this.memberStore.createMember({
          type: MemberType.User,
          name: username,
          contactEmail: new EmailString(email),
        });

      const idRawBytes = sp.idProvider.toBytes(reference.id);
      memberId = sp.idProvider.idToString(reference.id);
      memberChecksum = sp.checksumService.calculateChecksum(idRawBytes);

      // Reconstruct the member from the mnemonic so we have the private key.
      // createMember() generates the keypair internally but only returns a
      // reference — we need the live Member with private key to wrap it.
      const eciesService =
        sp.eciesService as unknown as ECIESService<typeof reference.id>;
      const { member: reconstructed } = Member.newMember(
        eciesService,
        MemberType.User,
        username,
        new EmailString(email),
        generatedMnemonic,
      );
      liveMember = reconstructed;
      resultMnemonic = generatedMnemonic;
    }

    // ── Shared code: wrap key, encrypt mnemonic, store user, sign JWT ──

    // Password-wrap the private key (AES-256-GCM + PBKDF2)
    let passwordWrappedPrivateKey: IPasswordWrappedPrivateKey | undefined;
    if (liveMember.privateKey) {
      const keyWrappingService = new KeyWrappingService();
      const wrapped = keyWrappingService.wrapSecret(
        liveMember.privateKey,
        password,
        this.application.constants,
      );
      passwordWrappedPrivateKey = {
        salt: wrapped.salt,
        iv: wrapped.iv,
        authTag: wrapped.authTag,
        ciphertext: wrapped.ciphertext,
        iterations: wrapped.iterations,
      };
    }

    // Encrypt the mnemonic with the system user's ECIES public key for
    // server-side recovery (backup code generation, key rotation, etc.)
    const systemUser = SystemUserService.getSystemUser(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.application.environment as any,
      this.application.constants,
    );
    const mnemonicRecovery = (
      await systemUser.encryptData(
        Buffer.from(resultMnemonic.value ?? '', 'utf-8'),
      )
    ).toString('hex');

    // Store password hash, wrapped private key, and encrypted mnemonic.
    // Use the ID that was registered in the memberStore index.
    // In the server-generated mnemonic path, createMember() stores the member
    // under reference.id, but the reconstructed liveMember has a different
    // random ID. In the user-provided mnemonic path, liveMember.id is the
    // canonical ID (though that path needs createMember support — see below).
    // We captured the correct memberId string above for each branch, so derive
    // the store-lookup ID from that.
    const storeId = sp.idProvider.idFromString(memberId);
    await this.memberStore.updateMember(storeId, {
      id: storeId,
      privateChanges: {
        passwordHash,
        passwordWrappedPrivateKey,
        mnemonicRecovery,
      },
    });

    const energyAccount = EnergyAccount.createWithTrialCredits(memberChecksum);
    await this.energyStore.set(memberChecksum, energyAccount);

    await this.sendWelcomeEmail(email, username);

    const token = this.signToken(memberId, username, MemberType.User);

    // Dispose the live member to zero out private key material
    liveMember.dispose();

    return {
      token,
      memberId,
      energyBalance: energyAccount.balance,
    };
  }

  async login(credentials: IAuthCredentials): Promise<IAuthToken> {
    const results = await this.memberStore.queryIndex({
      name: credentials.username,
      limit: 1,
    });

    if (results.length === 0) {
      throw new Error('Invalid credentials');
    }

    const reference = results[0];

    const storedHash = await this.getPasswordHash(reference.id as unknown as TID);
    const passwordValue = credentials.password.value;
    if (!passwordValue) {
      throw new Error('Password value is empty');
    }
    const isValid = await bcrypt.compare(passwordValue, storedHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const sp = ServiceProvider.getInstance();
    const memberId = sp.idProvider.idToString(reference.id);
    const idRawBytes = sp.idProvider.toBytes(reference.id);
    const memberChecksum = sp.checksumService.calculateChecksum(idRawBytes);

    const energyAccount = await this.energyStore.getOrCreate(memberChecksum);

    const token = this.signToken(
      memberId,
      credentials.username,
      reference.type,
    );

    return {
      token,
      memberId,
      energyBalance: energyAccount.balance,
    };
  }

  signToken(memberId: string, username: string, type: MemberType): string {
    const payload: Omit<ITokenPayload, 'iat' | 'exp'> = {
      memberId,
      username,
      type,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '7d',
    });
  }

  async verifyToken(token: string): Promise<ITokenPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as ITokenPayload;
      return decoded;
    } catch {
      throw new Error('Invalid token');
    }
  }

  async storePasswordHash(memberId: TID, hash: string): Promise<void> {
    await this.memberStore.updateMember(memberId as unknown as Uint8Array, {
      id: memberId as unknown as Uint8Array,
      privateChanges: {
        passwordHash: hash,
      },
    });
  }

  async getPasswordHash(memberId: TID): Promise<string> {
    const profile = await this.memberStore.getMemberProfile(memberId as unknown as Uint8Array);
    const passwordHash = profile.privateProfile?.passwordHash;
    if (!passwordHash) {
      throw new Error('No password hash found for member');
    }
    return passwordHash;
  }

  async changePassword(
    memberId: TID,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const storedHash = await this.getPasswordHash(memberId);
    const isValid = await bcrypt.compare(currentPassword, storedHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.storePasswordHash(memberId, newHash);
  }

  async recoverWithMnemonic(
    email: string,
    mnemonic: SecureString,
    newPassword?: string,
  ): Promise<IRecoveryResponse<string>> {
    if (!this.authProvider) {
      throw new Error('Authentication provider not configured');
    }

    const result = await this.authProvider.authenticateWithMnemonic(
      email,
      mnemonic,
    );

    const memberId = result.userId;
    const member = result.userMember;

    const token = this.signToken(memberId, member.name, member.type);

    if (newPassword) {
      const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await this.storePasswordHash(member.id, newHash);
    }

    return {
      token,
      memberId,
      passwordReset: !!newPassword,
    };
  }

  /**
   * Override in subclasses to send a welcome email via your preferred service.
   * Default implementation logs to console.
   */
  protected async sendWelcomeEmail(
    email: string,
    username: string,
  ): Promise<void> {
    console.log(
      `[BrightDbAuthService] Would send welcome email to ${email} for ${username}`,
    );
  }
}
