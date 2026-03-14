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
   * Verify a direct-login challenge: validate the server signature, look up
   * the user by username/email, verify the user's signature, and return the
   * member + JWT-ready data.
   *
   * This is the base implementation that works with MemberStore alone.
   * Subclasses in brightchain-api-lib add replay prevention and richer
   * user DTO building.
   */
  async verifyDirectLoginChallenge(
    serverSignedRequest: string,
    signature: string,
    username?: string,
    email?: string,
  ): Promise<{
    member: Member<TID>;
    memberId: string;
    userDTO: import('@digitaldefiance/suite-core-lib').IRequestUserDTO | null;
  }> {
    const SIGNATURE_SIZE = this.application.constants.ECIES.SIGNATURE_SIZE;
    const minBytes = 8 + 32 + SIGNATURE_SIZE;
    if (serverSignedRequest.length < minBytes * 2) {
      throw new Error('Invalid challenge');
    }

    const requestBuffer = Buffer.from(serverSignedRequest, 'hex');

    // Parse: time(8) + nonce(32) + serverSignature(SIGNATURE_SIZE)
    let offset = 0;
    const time = requestBuffer.subarray(offset, 8);
    offset += 8;
    const nonce = requestBuffer.subarray(offset, 40);
    offset += 32;
    const serverSignature = requestBuffer.subarray(offset, SIGNATURE_SIZE + 40);
    offset += SIGNATURE_SIZE;
    const signedDataLength = offset;

    if (offset !== requestBuffer.length) {
      throw new Error('Invalid challenge');
    }

    // 1. Validate challenge is not expired
    const timeMs = time.readBigUInt64BE();
    const elapsed = new Date().getTime() - Number(timeMs);
    const expiration = this.application.constants.LoginChallengeExpiration;
    if (elapsed > expiration) {
      throw new Error('Challenge expired');
    }

    // 2. Verify server's signature on time+nonce
    const systemUser = SystemUserService.getSystemUser(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.application.environment as any,
      this.application.constants,
    );
    const serverSigValid = systemUser.verify(
      serverSignature as import('@digitaldefiance/node-ecies-lib').SignatureBuffer,
      Buffer.concat([time, nonce]),
    );
    if (!serverSigValid) {
      throw new Error('Invalid challenge');
    }

    // 3. Look up user by username or email
    const query = username
      ? { name: username, limit: 1 }
      : { email: email!, limit: 1 };
    const results = await this.memberStore.queryIndex(query);
    if (results.length === 0) {
      throw new Error('Invalid credentials');
    }

    const reference = results[0];
    const sp = ServiceProvider.getInstance<TID>();

    // 4. Verify user's signature on the signed portion of the challenge
    const signedData = requestBuffer.subarray(0, signedDataLength);
    const userSigBuf = Buffer.from(signature, 'hex') as import('@digitaldefiance/node-ecies-lib').SignatureBuffer;
    const nodeEcies = new ECIESService();

    const publicKeyHex = await this.memberStore.getMemberPublicKeyHex(
      reference.id,
    );
    if (!publicKeyHex) {
      throw new Error('Invalid credentials');
    }
    const publicKeyBuf = Buffer.from(publicKeyHex, 'hex');
    const userSigValid = nodeEcies.verifyMessage(publicKeyBuf, signedData, userSigBuf);
    if (!userSigValid) {
      throw new Error('Invalid credentials');
    }

    // 5. Resolve the Member object — for seeded users without CBL blocks,
    //    getMember() will throw; synthesise a minimal shell in that case.
    let member: Member<TID>;
    try {
      member = (await this.memberStore.getMember(
        reference.id,
      )) as unknown as Member<TID>;
    } catch {
      const resolvedName = username ?? email ?? 'unknown';
      const resolvedEmail = email ?? `${resolvedName}@brightchain.local`;
      const eciesService =
        sp.eciesService as unknown as ECIESService<TID>;
      const { member: shell } = Member.newMember<TID>(
        eciesService,
        reference.type,
        resolvedName,
        new EmailString(resolvedEmail),
      );
      const verifiedPublicKey = Buffer.from(publicKeyHex, 'hex');
      Object.defineProperties(shell, {
        id: { get: () => reference.id, configurable: true },
        publicKey: { get: () => verifiedPublicKey, configurable: true },
      });
      member = shell as unknown as Member<TID>;
    }

    // 6. Replay prevention — store used nonce in the document store
    const nonceHex = nonce.toString('hex');
    const memberId = sp.idProvider.idToString(reference.id as unknown as TID);
    const tokenCollection = this.application.db.collection<{
      _id?: string;
      userId: string;
      token: string;
    }>('used_direct_login_tokens');
    const existing = await tokenCollection.findOne({
      userId: memberId,
      token: nonceHex,
    } as Partial<{ _id?: string; userId: string; token: string }>).exec();
    if (existing) {
      throw new Error('Challenge already used');
    }
    await tokenCollection.create({ userId: memberId, token: nonceHex } as { _id?: string; userId: string; token: string });

    // 7. Build user DTO via auth provider if available
    const userDTO = this.authProvider
      ? await this.authProvider.buildRequestUserDTO(memberId)
      : null;

    return { member, memberId, userDTO };
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
