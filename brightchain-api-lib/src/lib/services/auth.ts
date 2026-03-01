import {
  EmailString,
  EnergyAccount,
  EnergyAccountStore,
  IRecoveryResponse,
  MemberStore,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { MemberType, SecureString } from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  Member,
  PlatformID,
  SignatureBuffer,
} from '@digitaldefiance/node-ecies-lib';
import { SystemUserService } from '@digitaldefiance/node-express-suite';
import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { SchemaCollection } from '../enumerations/schema-collection';
import { IBrightChainApplication } from '../interfaces/application';
import { IAuthCredentials } from '../interfaces/auth-credentials';
import { IAuthToken } from '../interfaces/auth-token';
import { ITokenPayload } from '../interfaces/token-payload';
import { DefaultBackendIdType } from '../shared-types';
import { BaseService } from './base';
import { BrightChainAuthenticationProvider } from './brightchain-authentication-provider';
import { EmailService } from './email';

const BCRYPT_ROUNDS = 12;

export class AuthService<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseService<TID> {
  private memberStore: MemberStore;
  private energyStore: EnergyAccountStore;
  private emailService: EmailService<TID>;
  private jwtSecret: string;
  private authProvider?: BrightChainAuthenticationProvider<TID>;

  constructor(
    application: IBrightChainApplication<TID>,
    memberStore: MemberStore,
    energyStore: EnergyAccountStore,
    emailService: EmailService<TID>,
    jwtSecret: string,
    authProvider?: BrightChainAuthenticationProvider<TID>,
  ) {
    super(application);
    this.memberStore = memberStore;
    this.energyStore = energyStore;
    this.emailService = emailService;
    this.jwtSecret = jwtSecret;
    this.authProvider = authProvider;
  }

  async register(
    username: string,
    email: string,
    password: SecureString,
    _mnemonic?: SecureString,
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

    const { reference } = await this.memberStore.createMember({
      type: MemberType.User,
      name: username,
      contactEmail: new EmailString(email),
    });

    // Use idProvider for proper serialization round-trip
    const sp = ServiceProvider.getInstance();
    const memberId = sp.idProvider.idToString(reference.id);
    const idRawBytes = sp.idProvider.toBytes(reference.id);
    const memberChecksum = sp.checksumService.calculateChecksum(idRawBytes);

    // Store password hash in member's private profile
    await this.storePasswordHash(reference.id, passwordHash);

    const energyAccount = EnergyAccount.createWithTrialCredits(memberChecksum);
    await this.energyStore.set(memberChecksum, energyAccount);

    await this.sendWelcomeEmail(email, username);

    const token = this.signToken(memberId, username, reference.type);

    return {
      token,
      memberId,
      energyBalance: energyAccount.balance,
    };
  }

  async login(credentials: IAuthCredentials): Promise<IAuthToken> {
    // Look up member by username
    const results = await this.memberStore.queryIndex({
      name: credentials.username,
      limit: 1,
    });

    if (results.length === 0) {
      throw new Error('Invalid credentials');
    }

    const reference = results[0];

    // Retrieve stored password hash and verify
    const storedHash = await this.getPasswordHash(reference.id);
    const passwordValue = credentials.password.value;
    if (!passwordValue) {
      throw new Error('Password value is empty');
    }
    const isValid = await bcrypt.compare(passwordValue, storedHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Use idProvider for proper serialization round-trip
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

  async storePasswordHash(memberId: Uint8Array, hash: string): Promise<void> {
    await this.memberStore.updateMember(memberId, {
      id: memberId,
      privateChanges: {
        passwordHash: hash,
      },
    });
  }

  async getPasswordHash(memberId: Uint8Array): Promise<string> {
    const profile = await this.memberStore.getMemberProfile(memberId);
    const passwordHash = profile.privateProfile?.passwordHash;
    if (!passwordHash) {
      throw new Error('No password hash found for member');
    }
    return passwordHash;
  }

  async changePassword(
    memberId: Uint8Array,
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

    // Authenticate via mnemonic — throws "Invalid credentials" on
    // unknown email or invalid mnemonic (no email enumeration).
    const result = await this.authProvider.authenticateWithMnemonic(
      email,
      mnemonic,
    );

    const memberId = result.userId;
    const member = result.userMember;

    // Sign a JWT for the recovered session
    const token = this.signToken(memberId, member.name, member.type);

    // If a new password was provided, hash and persist it
    if (newPassword) {
      const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await this.storePasswordHash(member.id as Uint8Array, newHash);
    }

    return {
      token,
      memberId,
      passwordReset: !!newPassword,
    };
  }

  /**
   * Verifies a direct login challenge response — mirrors express-suite
   * UserService.verifyDirectLoginChallenge() but without Mongo/transactions.
   *
   * Challenge format (hex): time(8) + nonce(32) + serverSignature(SIGNATURE_SIZE)
   * The client signs the entire challenge buffer with their private key.
   *
   * @throws Error('Invalid challenge') on bad format / expired / bad signatures
   * @throws Error('Invalid credentials') on unknown user
   * @throws Error('Challenge already used') on replay
   */
  async verifyDirectLoginChallenge(
    serverSignedRequest: string,
    signature: string,
    username?: string,
    email?: string,
  ): Promise<{
    member: Member<TID>;
    memberId: string;
    userDTO: IRequestUserDTO | null;
  }> {
    const minBytes = 8 + 32 + this.application.constants.ECIES.SIGNATURE_SIZE;
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
    const serverSignature = requestBuffer.subarray(
      offset,
      this.application.constants.ECIES.SIGNATURE_SIZE + 40,
    );
    offset += this.application.constants.ECIES.SIGNATURE_SIZE;
    const signedDataLength = offset;

    if (offset !== requestBuffer.length) {
      throw new Error('Invalid challenge');
    }

    // 1. Validate challenge is not expired
    const timeMs = time.readBigUInt64BE();
    if (
      new Date().getTime() - Number(timeMs) >
      this.application.constants.LoginChallengeExpiration
    ) {
      throw new Error('Challenge expired');
    }

    // 2. Verify server's signature on time+nonce
    // Member.verify(signature, data) — signature first, data second
    const systemUser = SystemUserService.getSystemUser(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.application.environment as any,
      this.application.constants,
    );
    console.info(
      `[AuthService] verifyDirectLoginChallenge: verifying server signature`,
    );
    if (
      !systemUser.verify(
        serverSignature as SignatureBuffer,
        Buffer.concat([time, nonce]),
      )
    ) {
      console.warn(
        `[AuthService] verifyDirectLoginChallenge: server signature check FAILED`,
      );
      throw new Error('Invalid challenge');
    }

    // 3. Look up user by username or email
    const query = username
      ? { name: username, limit: 1 }
      : { email: email!, limit: 1 };
    const results = await this.memberStore.queryIndex(query);
    if (results.length === 0) {
      console.warn(
        `[AuthService] verifyDirectLoginChallenge: no member found for ${username ? `username="${username}"` : `email="${email}"`}`,
      );
      throw new Error('Invalid credentials');
    }

    const reference = results[0];
    const sp = ServiceProvider.getInstance<TID>();

    // 4. Verify user's signature on the signed portion of the challenge.
    // We get the public key via getMemberPublicKeyHex() which reads from the
    // `users` DB collection (fast path for seeded users whose CBL blocks are
    // not stored) and falls back to getMember() for CBL-backed members.
    const signedData = requestBuffer.subarray(0, signedDataLength);
    const userSigBuf = Buffer.from(signature, 'hex') as SignatureBuffer;
    const nodeEcies = new ECIESService();

    const publicKeyHex = await this.memberStore.getMemberPublicKeyHex(
      reference.id,
    );
    if (!publicKeyHex) {
      console.warn(
        `[AuthService] verifyDirectLoginChallenge: could not resolve public key for id=${sp.idProvider.idToString(reference.id as unknown as TID)}`,
      );
      throw new Error('Invalid credentials');
    }
    const publicKeyBuf = Buffer.from(publicKeyHex, 'hex');
    if (!nodeEcies.verifyMessage(publicKeyBuf, signedData, userSigBuf)) {
      // Diagnostic: log lengths and hex snippets to identify data mismatch
      console.warn(
        `[AuthService] verifyDirectLoginChallenge: FAILED — signedData.length=${signedData.length} sig.length=${userSigBuf.length} pubKey=${publicKeyHex}`,
      );
      console.warn(
        `[AuthService] verifyDirectLoginChallenge: signedData(hex)=${signedData.toString('hex').substring(0, 80)}...`,
      );
      console.warn(
        `[AuthService] verifyDirectLoginChallenge: signature(hex)=${signature.substring(0, 80)}...`,
      );
      // Verify the server can sign+verify with the same key to rule out library issues
      try {
        const { sha256 } = await import('@noble/hashes/sha2');
        const { secp256k1 } = await import('@noble/curves/secp256k1');
        const hash = sha256(signedData);
        const directResult = secp256k1.verify(userSigBuf, hash, publicKeyBuf, { prehash: false });
        console.warn(
          `[AuthService] verifyDirectLoginChallenge: direct secp256k1.verify=${directResult}`,
        );
        // Try recovering the signing public key
        for (let recovery = 0; recovery < 2; recovery++) {
          try {
            const sig = secp256k1.Signature.fromCompact(userSigBuf).addRecoveryBit(recovery);
            const recovered = sig.recoverPublicKey(hash).toHex(true);
            console.warn(
              `[AuthService] verifyDirectLoginChallenge: recovered(${recovery})=${recovered} match=${recovered === publicKeyHex}`,
            );
          } catch { /* skip */ }
        }
      } catch (e) {
        console.warn(`[AuthService] diagnostic error:`, e);
      }
      throw new Error('Invalid credentials');
    }

    // Resolve the Member object for the return value — needed for the JWT
    // and userDTO. For seeded users without CBL blocks, getMember() will
    // throw; in that case we synthesise a minimal shell using only the
    // fields callers actually need (name, type, id, publicKey).
    let member: Member<TID>;
    try {
      member = (await this.memberStore.getMember(
        reference.id,
      )) as unknown as Member<TID>;
    } catch {
      // Seeded users don't have CBL blocks — synthesise a shell.
      // signToken() only needs member.name and member.type; publicKey is
      // already verified above so we can safely expose it here too.
      const resolvedName = username ?? email ?? 'unknown';
      const resolvedEmail = email ?? `${resolvedName}@brightchain.local`;
      const sp2 = ServiceProvider.getInstance<TID>();
      const eciesService = sp2.eciesService as unknown as ECIESService<TID>;
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

    // 5. Replay prevention — store used nonce
    const nonceHex = nonce.toString('hex');
    const memberId = sp.idProvider.idToString(reference.id as unknown as TID);
    const db =
      this.application.services.get<import('@brightchain/db').BrightChainDb>(
        'db',
      );
    const tokenCollection = db.collection<{
      userId: string;
      token: string;
    }>(SchemaCollection.UsedDirectLoginToken);
    const existing = await tokenCollection.findOne({
      userId: memberId,
      token: nonceHex,
    });
    if (existing) {
      throw new Error('Challenge already used');
    }
    await tokenCollection.insertOne({ userId: memberId, token: nonceHex });

    // 6. Build IRequestUserDTO via auth provider
    const userDTO = this.authProvider
      ? await this.authProvider.buildRequestUserDTO(memberId)
      : null;

    return { member, memberId, userDTO };
  }

  private async sendWelcomeEmail(
    email: string,
    username: string,
  ): Promise<void> {
    if (!this.emailService) {
      console.log(
        `[EmailService disabled] Would send welcome email to ${email}`,
      );
      return;
    }

    const subject = 'Welcome to BrightChain';
    const text = `Welcome ${username}!\n\nYour account has been created successfully. You've been credited with 1000 Joules to get started.\n\nBest regards,\nThe BrightChain Team`;
    const html = `
      <h1>Welcome to BrightChain!</h1>
      <p>Hi ${username},</p>
      <p>Your account has been created successfully.</p>
      <p><strong>You've been credited with 1000 Joules to get started.</strong></p>
      <p>Best regards,<br/>The BrightChain Team</p>
    `;

    try {
      await this.emailService.sendEmail(email, subject, text, html);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }
}
