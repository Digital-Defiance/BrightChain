import {
  Checksum,
  EmailString,
  EnergyAccount,
  EnergyAccountStore,
  MemberStore,
} from '@brightchain/brightchain-lib';
import { MemberType, SecureString } from '@digitaldefiance/ecies-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import * as jwt from 'jsonwebtoken';
import { IBrightChainApplication } from '../interfaces/application';
import { IAuthCredentials } from '../interfaces/auth-credentials';
import { IAuthToken } from '../interfaces/auth-token';
import { ITokenPayload } from '../interfaces/token-payload';
import { DefaultBackendIdType } from '../shared-types';
import { BaseService } from './base';
import { EmailService } from './email';

export class AuthService<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseService<TID> {
  private memberStore: MemberStore;
  private energyStore: EnergyAccountStore;
  private emailService: EmailService<TID>;
  private jwtSecret: string;

  constructor(
    application: IBrightChainApplication<TID>,
    memberStore: MemberStore,
    energyStore: EnergyAccountStore,
    emailService: EmailService<TID>,
    jwtSecret: string,
  ) {
    super(application);
    this.memberStore = memberStore;
    this.energyStore = energyStore;
    this.emailService = emailService;
    this.jwtSecret = jwtSecret;
  }

  async register(
    username: string,
    email: string,
    _mnemonic?: SecureString,
  ): Promise<IAuthToken> {
    const { reference } = await this.memberStore.createMember({
      type: MemberType.User,
      name: username,
      contactEmail: new EmailString(email),
    });

    const memberId = reference.id.toString();
    const memberChecksum = Checksum.fromUint8Array(reference.id as Uint8Array);

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
    const results = await this.memberStore.queryIndex({ limit: 1 });

    if (results.length === 0) {
      throw new Error('Invalid credentials');
    }

    const reference = results[0];
    const memberId = reference.id.toString();
    const memberChecksum = Checksum.fromUint8Array(reference.id as Uint8Array);

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
