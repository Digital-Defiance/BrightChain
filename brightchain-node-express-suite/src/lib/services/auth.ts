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
import type { SuiteCoreStringKeyValue } from '@digitaldefiance/suite-core-lib';
import {
  EmailTokenType,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import * as bcrypt from 'bcrypt';
import { createHmac, randomBytes, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { SchemaCollection } from '../enumerations/schema-collection';
import type { IAuthCredentials } from '../interfaces/auth-credentials';
import type { IAuthToken } from '../interfaces/auth-token';
import type { IBrightDbApplication } from '../interfaces/bright-db-application';
import type { ITokenPayload } from '../interfaces/token-payload';
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
    displayName?: string,
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
    let mnemonicHmac: string | undefined;

    if (mnemonic?.value) {
      // ── User-provided mnemonic path ──────────────────────────────────
      const trimmed = mnemonic.value.trim();

      // Defense-in-depth: validate format even though controller already checked
      if (!BaseConstants.MnemonicRegex.test(trimmed)) {
        throw new Error('Invalid mnemonic format');
      }

      // HMAC uniqueness check
      const hmacSecretHex = this.application.environment.get(
        'MNEMONIC_HMAC_SECRET',
      );
      if (!hmacSecretHex) {
        throw new Error('MNEMONIC_HMAC_SECRET is not configured');
      }
      const hmac = createHmac('sha256', Buffer.from(hmacSecretHex, 'hex'))
        .update(Buffer.from(trimmed, 'utf-8'))
        .digest('hex');

      // Check if the HMAC already exists in the mnemonic collection
      const mnemonicsCollection = this.application.db.collection<
        Record<string, unknown> & { _id?: string }
      >(SchemaCollection.Mnemonic);
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
      mnemonicHmac = hmac;
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
      const eciesService = sp.eciesService as unknown as ECIESService<
        typeof reference.id
      >;
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

    // ── Transactional DB writes ────────────────────────────────────────
    // Wrap all collection-level mutations in a transaction so a failure
    // in any step rolls back the entire registration.
    const storeId = sp.idProvider.idFromString(memberId);
    const energyAccount = EnergyAccount.createWithTrialCredits(memberChecksum);

    const doDbWrites = async () => {
      // 1. Update member with password hash, wrapped key, encrypted mnemonic
      await this.memberStore.updateMember(storeId, {
        id: storeId,
        privateChanges: {
          passwordHash,
          passwordWrappedPrivateKey,
          mnemonicRecovery,
        },
      });

      // 2. Create energy account
      await this.energyStore.set(memberChecksum, energyAccount);

      // 3. Store mnemonic HMAC (user-provided mnemonic path only)
      if (mnemonicHmac) {
        const mnemonicsCollection = this.application.db.collection<
          Record<string, unknown> & { _id?: string }
        >(SchemaCollection.Mnemonic);
        await mnemonicsCollection.create({
          _id: randomUUID(),
          hmac: mnemonicHmac,
        } as never);
      }

      // 4. Upsert user document for admin visibility
      const usersCol = this.application.db.collection<
        Record<string, unknown> & { _id?: string }
      >(SchemaCollection.User);
      const now = new Date().toISOString();
      const publicKeyHex = liveMember.publicKey
        ? Buffer.from(liveMember.publicKey).toString('hex')
        : '';
      const userDoc: Record<string, unknown> = {
        _id: memberId,
        username,
        email,
        publicKey: publicKeyHex,
        mnemonicRecovery: mnemonicRecovery,
        backupCodes: [],
        accountStatus: 'PendingEmailVerification',
        emailVerified: false,
        directChallenge: false,
        timezone: 'UTC',
        siteLanguage: 'en-US',
        darkMode: false,
        createdBy: memberId,
        updatedBy: memberId,
        createdAt: now,
        updatedAt: now,
      };
      if (passwordWrappedPrivateKey) {
        userDoc['passwordWrappedPrivateKey'] = passwordWrappedPrivateKey;
      }
      if (displayName) {
        userDoc['displayName'] = displayName;
      }
      try {
        await usersCol.create(userDoc as never);
      } catch {
        // If the doc already exists (e.g. seeded user), update it instead.
        // Always update publicKey so the ECIES key cache can find it.
        const updateFields: Record<string, unknown> = {
          updatedAt: now,
          publicKey: publicKeyHex,
        };
        if (displayName) {
          updateFields['displayName'] = displayName;
        }
        await usersCol.updateOne(
          { _id: memberId } as never,
          updateFields as never,
        );
      }
    };

    try {
      if (this.application.db.withTransaction) {
        await this.application.db.withTransaction(doDbWrites);
      } else {
        await doDbWrites();
      }
    } catch (txError) {
      // Transaction failed — all collection writes are rolled back.
      // Clean up the member index entry that createMember() wrote
      // (outside the transaction, since memberStore doesn't support sessions).
      try {
        await this.memberStore.deleteMember(storeId);
      } catch {
        // Best-effort cleanup
      }
      throw txError;
    }

    await this.sendWelcomeEmail(email, username, memberId);

    const token = this.signToken(memberId, username, MemberType.User);

    // Capture the mnemonic value before disposing the member.
    // Only include it in the response when server-generated (user didn't
    // provide their own) so the frontend can display it once.
    const returnMnemonic =
      !mnemonic?.value && resultMnemonic.value
        ? resultMnemonic.value
        : undefined;

    // Dispose the live member to zero out private key material
    liveMember.dispose();

    return {
      token,
      memberId,
      energyBalance: energyAccount.balance,
      ...(returnMnemonic ? { mnemonic: returnMnemonic } : {}),
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

    const storedHash = await this.getPasswordHash(
      reference.id as unknown as TID,
    );
    const passwordValue = credentials.password.value;
    if (!passwordValue) {
      throw new Error('Password value is empty');
    }
    const isValid = await bcrypt.compare(passwordValue, storedHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Check account status — reject locked or non-active accounts
    const sp = ServiceProvider.getInstance();
    const memberId = sp.idProvider.idToString(reference.id);

    try {
      const usersCol = this.application.db.collection<{
        _id?: string;
        accountStatus?: string;
      }>(SchemaCollection.User);
      const idHex = sp.idProvider.toString(reference.id, 'hex');
      let userDoc = await usersCol.findOne({ _id: idHex } as never);
      if (!userDoc) {
        const dashed = idHex.replace(
          /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
          '$1-$2-$3-$4-$5',
        );
        userDoc = await usersCol.findOne({ _id: dashed } as never);
      }
      if (userDoc?.accountStatus && userDoc.accountStatus !== 'Active') {
        if (userDoc.accountStatus === 'PendingEmailVerification') {
          throw new Error('Email not verified');
        }
        throw new Error('Account is locked');
      }
    } catch (err) {
      // Re-throw account-locked and email-not-verified errors; swallow DB lookup failures
      if (
        err instanceof Error &&
        (err.message === 'Account is locked' ||
          err.message === 'Email not verified')
      ) {
        throw err;
      }
      // DB unavailable — allow login (fail-open for DB-less setups)
    }

    const idRawBytes = sp.idProvider.toBytes(reference.id);
    const memberChecksum = sp.checksumService.calculateChecksum(idRawBytes);

    const energyAccount = await this.energyStore.getOrCreate(memberChecksum);

    // Look up RBAC roles from user-roles + roles collections so the JWT
    // carries the correct role even when an admin has promoted/demoted the
    // user via the admin panel (which only updates the junction table).
    let roles: string[] | undefined;
    try {
      const userRolesCol = this.application.db.collection<{
        _id?: string;
        userId?: string;
        roleId?: string;
      }>(SchemaCollection.UserRole);
      const rolesCol = this.application.db.collection<{
        _id?: string;
        name?: string;
      }>(SchemaCollection.Role);

      const idHex = sp.idProvider.toString(reference.id, 'hex');
      const dashed = idHex.replace(
        /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
        '$1-$2-$3-$4-$5',
      );

      // Try both ID formats (hex and dashed GUID)
      let userRoleDocs = await userRolesCol
        .find({ userId: idHex } as never)
        .exec();
      if (!userRoleDocs || userRoleDocs.length === 0) {
        userRoleDocs = await userRolesCol
          .find({ userId: dashed } as never)
          .exec();
      }
      if (!userRoleDocs || userRoleDocs.length === 0) {
        userRoleDocs = await userRolesCol
          .find({ userId: memberId } as never)
          .exec();
      }

      if (userRoleDocs && userRoleDocs.length > 0) {
        const roleIds = userRoleDocs
          .map((ur) => ur.roleId)
          .filter(Boolean) as string[];
        if (roleIds.length > 0) {
          const resolvedRoles: string[] = [];
          for (const roleId of roleIds) {
            const roleDoc = await rolesCol
              .findOne({ _id: roleId } as never)
              .exec();
            if (roleDoc?.name) {
              // Map role names to the 'admin' role string the middleware expects
              if (roleDoc.name === 'Admin' || roleDoc.name === 'System') {
                resolvedRoles.push('admin');
              }
            }
          }
          if (resolvedRoles.length > 0) {
            roles = resolvedRoles;
          }
        }
      }
    } catch {
      // RBAC lookup failed — fall back to MemberType-based role derivation
    }

    const token = this.signToken(
      memberId,
      credentials.username,
      reference.type,
      roles,
    );

    return {
      token,
      memberId,
      energyBalance: energyAccount.balance,
    };
  }

  signToken(
    memberId: string,
    username: string,
    type: MemberType,
    roles?: string[],
  ): string {
    const payload: Omit<ITokenPayload, 'iat' | 'exp'> = {
      memberId,
      username,
      type,
      ...(roles && roles.length > 0 ? { roles } : {}),
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
    const profile = await this.memberStore.getMemberProfile(
      memberId as unknown as Uint8Array,
    );
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
    const userSigBuf = Buffer.from(
      signature,
      'hex',
    ) as import('@digitaldefiance/node-ecies-lib').SignatureBuffer;
    const nodeEcies = new ECIESService();

    const publicKeyHex = await this.memberStore.getMemberPublicKeyHex(
      reference.id,
    );
    if (!publicKeyHex) {
      throw new Error('Invalid credentials');
    }
    const publicKeyBuf = Buffer.from(publicKeyHex, 'hex');
    const userSigValid = nodeEcies.verifyMessage(
      publicKeyBuf,
      signedData,
      userSigBuf,
    );
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
      const eciesService = sp.eciesService as unknown as ECIESService<TID>;
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
    }>(SchemaCollection.UsedDirectLoginToken);
    const existing = await tokenCollection
      .findOne({
        userId: memberId,
        token: nonceHex,
      } as Partial<{ _id?: string; userId: string; token: string }>)
      .exec();
    if (existing) {
      throw new Error('Challenge already used');
    }
    await tokenCollection.create({ userId: memberId, token: nonceHex } as {
      _id?: string;
      userId: string;
      token: string;
    });

    // 7. Check account status — reject locked or unverified accounts
    //    (mirrors the check in the password-based login flow)
    try {
      const usersCol = this.application.db.collection<{
        _id?: string;
        accountStatus?: string;
      }>(SchemaCollection.User);
      const idHex = sp.idProvider.toString(reference.id as TID, 'hex');
      let userDoc = await usersCol.findOne({ _id: idHex } as never);
      if (!userDoc) {
        const dashed = idHex.replace(
          /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
          '$1-$2-$3-$4-$5',
        );
        userDoc = await usersCol.findOne({ _id: dashed } as never);
      }
      if (userDoc?.accountStatus && userDoc.accountStatus !== 'Active') {
        if (userDoc.accountStatus === 'PendingEmailVerification') {
          throw new Error('Email not verified');
        }
        throw new Error('Account is locked');
      }
    } catch (err) {
      // Re-throw account-locked and email-not-verified errors; swallow DB lookup failures
      if (
        err instanceof Error &&
        (err.message === 'Account is locked' ||
          err.message === 'Email not verified')
      ) {
        throw err;
      }
      // DB unavailable — allow login (fail-open for DB-less setups)
    }

    // 8. Build user DTO via auth provider if available
    const userDTO = this.authProvider
      ? await this.authProvider.buildRequestUserDTO(memberId)
      : null;

    return { member, memberId, userDTO };
  }

  /**
   * Generate a cryptographically random email verification token, store it
   * in the email_tokens collection, and return the token string.
   */
  async generateEmailVerificationToken(
    memberId: string,
    email: string,
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const emailTokensCol = this.application.db.collection<{
      _id?: string;
      userId: string;
      type: string;
      token: string;
      email: string;
      lastSent: string;
      expiresAt: string;
    }>(SchemaCollection.EmailToken);

    await emailTokensCol.create({
      _id: randomUUID(),
      userId: memberId,
      type: EmailTokenType.AccountVerification,
      token,
      email,
      lastSent: new Date().toISOString(),
      expiresAt,
    } as never);

    return token;
  }

  /**
   * Resend the verification email for a user who hasn't verified yet.
   * Generates a new token and calls sendWelcomeEmail.
   */
  async resendVerificationEmail(
    memberId: string,
    email: string,
    username: string,
  ): Promise<void> {
    await this.sendWelcomeEmail(email, username, memberId);
  }

  /**
   * Verify an email verification token: validate it exists, is not expired,
   * then flip emailVerified → true and accountStatus → Active.
   *
   * @returns The user ID associated with the verified token.
   * @throws Error('Invalid or expired verification token') on bad/expired tokens.
   */
  async verifyEmailToken(token: string): Promise<string> {
    const emailTokensCol = this.application.db.collection<{
      _id?: string;
      userId: string;
      type: string;
      token: string;
      email: string;
      expiresAt: string;
    }>(SchemaCollection.EmailToken);

    const tokenDoc = await emailTokensCol.findOne({
      token,
      type: EmailTokenType.AccountVerification,
    } as never);

    if (!tokenDoc) {
      throw new Error('Invalid or expired verification token');
    }

    // Check expiration
    if (new Date(tokenDoc.expiresAt) < new Date()) {
      throw new Error('Invalid or expired verification token');
    }

    const userId = tokenDoc.userId;

    // Update user: emailVerified → true, accountStatus → Active
    const usersCol = this.application.db.collection<
      Record<string, unknown> & { _id?: string }
    >(SchemaCollection.User);

    await usersCol.updateOne(
      { _id: userId } as never,
      {
        emailVerified: true,
        accountStatus: 'Active',
        updatedAt: new Date().toISOString(),
      } as never,
    );

    // Delete the used token
    try {
      await emailTokensCol.deleteOne({ _id: tokenDoc._id } as never);
    } catch {
      // Best-effort cleanup — token is single-use by virtue of the
      // emailVerified + accountStatus flip above.
    }

    return userId;
  }

  /**
   * Override in subclasses to send a welcome/verification email via your
   * preferred service. Default implementation logs to console.
   *
   * @param email    - Recipient email address
   * @param username - Display name / username
   * @param memberId - The new user's member ID (used to generate verification token)
   */
  protected async sendWelcomeEmail(
    email: string,
    username: string,
    _memberId?: string,
  ): Promise<void> {
    console.log(
      `[BrightDbAuthService] Would send welcome email to ${email} for ${username}`,
    );
  }
}
