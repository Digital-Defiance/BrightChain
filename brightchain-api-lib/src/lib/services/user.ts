import {
  AccountLockedError,
  AccountStatus,
  AccountStatusError,
  AppConstants,
  CanaryStatus,
  ECIES,
  EmailInUseError,
  EmailString,
  EmailTokenExpiredError,
  EmailTokenSentTooRecentlyError,
  EmailTokenType,
  EmailTokenUsedOrInvalidError,
  HandleableError,
  IBackupCode,
  ICreateUserBasics,
  IECIESConfig,
  IRequestUserDTO,
  IUser,
  IUserDTO,
  InvalidCredentialsError,
  InvalidEmailError,
  InvalidEmailErrorType,
  InvalidNewPasswordError,
  InvalidUsernameError,
  MemberType,
  ModelName,
  PendingEmailVerificationError,
  PrivateKeyRequiredError,
  Role,
  SecureBuffer,
  SecureString,
  SignatureString,
  StringLanguage,
  StringName,
  UserNotFoundError,
  UsernameInUseError,
  UsernameOrEmailRequiredError,
  debugLog,
  translate,
} from '@brightchain/brightchain-lib';
import { Wallet } from '@ethereumjs/wallet';
import { randomBytes } from 'crypto';
import { ClientSession, Document, ProjectionType, Types } from 'mongoose';
import validator from 'validator';
import { BrightChainMember } from '../backendMember';
import { BackupCode } from '../backupCode';
import { IEmailTokenDocument } from '../documents/email-token';
import { IMnemonicDocument } from '../documents/mnemonic';
import { IUserDocument } from '../documents/user';
import { EmailTokenFailedToSendError } from '../errors/email-token-failed-to-send';
import { InvalidChallengeResponseError } from '../errors/invalid-challenge-response';
import { LoginChallengeExpiredError } from '../errors/login-challenge-expired';
import { MongooseValidationError } from '../errors/mongoose-validation';
import { IApplication } from '../interfaces/application';
import { IUserBackendObject } from '../interfaces/backend-objects/user';
import { DefaultBackendIdType, SignatureBuffer } from '../shared-types';
import { BackupCodeService } from './backupCode';
import { BaseService } from './base';
import { DirectLoginTokenService } from './directLoginToken';
import { ECIESService } from './ecies';
import { EmailService } from './email';
import { KeyWrappingService } from './keyWrapping';
import { MnemonicService } from './mnemonic';
import { RequestUserService } from './request-user';
import { RoleService } from './role';
import { SystemUserService } from './system-user';

type ProjectionObject = Record<string, 0 | 1 | -1 | boolean>;

export class UserService extends BaseService {
  private readonly roleService: RoleService;
  private readonly eciesService: ECIESService;
  private readonly keyWrappingService: KeyWrappingService;
  private readonly mnemonicService: MnemonicService;
  private readonly emailService: EmailService;
  private readonly backupCodeService: BackupCodeService;
  private readonly serverUrl: string;
  private readonly disableEmailSend: boolean;

  constructor(
    application: IApplication,
    roleService: RoleService,
    emailService: EmailService,
    keyWrappingService: KeyWrappingService,
    backupCodeService: BackupCodeService,
  ) {
    super(application);
    this.roleService = roleService;
    this.emailService = emailService;
    this.keyWrappingService = keyWrappingService;
    this.backupCodeService = backupCodeService;
    this.serverUrl = application.environment.serverUrl;
    this.disableEmailSend = application.environment.disableEmailSend;
    const config: IECIESConfig = {
      curveName: AppConstants.ECIES.CURVE_NAME,
      primaryKeyDerivationPath: AppConstants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: AppConstants.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: AppConstants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: AppConstants.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: AppConstants.ECIES.SYMMETRIC.MODE,
    };
    this.eciesService = new ECIESService(config);
    const mnemonicModel = application.getModel<IMnemonicDocument>(
      ModelName.Mnemonic,
    );
    this.mnemonicService = new MnemonicService(
      mnemonicModel,
      application.environment.mnemonicHmacSecret,
      this.keyWrappingService,
    );
  }

  /**
   * Given a User Document, make a User DTO
   * @param user a User Document
   * @returns An IUserDTO
   */
  public static userToUserDTO(
    user: IUserDocument | Record<string, unknown>,
  ): IUserDTO {
    return {
      ...(user instanceof Document ? user.toObject() : user),
      _id: (user._id instanceof Types.ObjectId
        ? user._id.toString()
        : user._id) as string,
      createdBy: (user.createdBy instanceof Date
        ? user.createdBy.toString()
        : user.createdBy) as string,
      updatedBy: (user.updatedBy instanceof Date
        ? user.updatedBy.toString()
        : user.updatedBy) as string,
      ...(user.lastLogin
        ? {
            lastLogin: (user.lastLogin instanceof Date
              ? user.lastLogin.toString()
              : user.lastLogin) as string,
          }
        : {}),
      ...(user.deletedBy
        ? {
            deletedBy: (user.deletedBy instanceof Date
              ? user.deletedBy.toString()
              : user.deletedBy) as string,
          }
        : {}),
    } as IUserDTO;
  }

  /**
   * Given a User DTO, reconstitute ids and dates
   * @param user a User DTO
   * @returns An IUserBackendObject
   */
  public hydrateUserDTOToBackend(user: IUserDTO): IUserBackendObject {
    return {
      ...user,
      _id: new Types.ObjectId(user._id),
      ...(user.lastLogin ? { lastLogin: new Date(user.lastLogin) } : {}),
      createdAt: new Date(user.createdAt),
      createdBy: new Types.ObjectId(user.createdBy),
      updatedAt: new Date(user.updatedAt),
      updatedBy: new Types.ObjectId(user.updatedBy),
      ...(user.deletedAt ? { deletedAt: new Date(user.deletedAt) } : {}),
      ...(user.deletedBy
        ? {
            deletedBy: new Types.ObjectId(user.deletedBy),
          }
        : {}),
      ...(user.mnemonicId
        ? { mnemonicId: new Types.ObjectId(user.mnemonicId) }
        : {}),
    } as IUserBackendObject;
  }

  /**
   * Create a new email token to send to the user for email verification
   * @param userDoc The user to create the email token for
   * @param type The type of email token to create
   * @param session The session to use for the query
   * @returns The email token document
   */
  public async createEmailToken(
    userDoc: IUserDocument,
    type: EmailTokenType,
    session?: ClientSession,
  ): Promise<IEmailTokenDocument> {
    const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
      ModelName.EmailToken,
    );
    return await this.withTransaction<IEmailTokenDocument>(
      async (sess: ClientSession | undefined): Promise<IEmailTokenDocument> => {
        // delete any expired tokens
        await EmailTokenModel.deleteMany(
          {
            expiresAt: { $lt: new Date() },
          },
          { session: sess },
        );
        const now = new Date();
        const tokens = await EmailTokenModel.create(
          [
            {
              userId: userDoc._id,
              type: type,
              email: userDoc.email,
              token: randomBytes(AppConstants.EmailTokenLength).toString('hex'),
              createdAt: now,
              updatedAt: now,
              expiresAt: new Date(
                now.getTime() + AppConstants.EmailTokenExpiration,
              ),
            },
          ],
          { session: sess },
        );
        if (!tokens || tokens.length < 1) {
          throw new Error('Failed to create email token');
        }
        return tokens[0];
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  }

  /**
   * Create and send an email token to the user for email verification
   * @param user The user to send the email token to
   * @param type The type of email token to send
   * @param session The session to use for the query
   * @returns The email token document
   */
  public async createAndSendEmailToken(
    user: IUserDocument,
    type: EmailTokenType = EmailTokenType.AccountVerification,
    session?: ClientSession,
    debug = false,
  ): Promise<IEmailTokenDocument> {
    const emailToken = await this.createEmailToken(user, type, session);
    try {
      await this.sendEmailToken(emailToken, session, debug);
    } catch (error) {
      // keep parity with previous behavior: log and continue returning token
      console.error('Error sending verification email:', error);
    }
    return emailToken;
  }

  /**
   * Send an email token to the user for email verification
   * @param emailToken The email token to send
   * @param session The session to use for the query
   * @returns void
   */
  public async sendEmailToken(
    emailToken: IEmailTokenDocument,
    session?: ClientSession,
    debug = false,
  ): Promise<void> {
    if (this.disableEmailSend) {
      debugLog(debug, 'log', 'Email sending disabled for testing');
      // Still update lastSent and expiration to keep token valid during tests
      emailToken.lastSent = new Date();
      emailToken.expiresAt = new Date(
        Date.now() + AppConstants.EmailTokenExpiration,
      );
      await emailToken.save({ session });
      return;
    }

    if (
      emailToken.lastSent &&
      emailToken.lastSent.getTime() + AppConstants.EmailTokenResendInterval >
        Date.now()
    ) {
      throw new EmailTokenSentTooRecentlyError(emailToken.lastSent);
    }

    let subjectString: StringName;
    let bodyString: StringName;
    let url: string;
    switch (emailToken.type) {
      case EmailTokenType.AccountVerification:
        subjectString = StringName.Email_ConfirmationSubjectTemplate;
        bodyString = StringName.Email_ConfirmationBody;
        url = `${this.serverUrl}/verify-email?token=${emailToken.token}`;
        break;
      case EmailTokenType.PasswordReset:
        subjectString = StringName.Email_ResetPasswordSubjectTemplate;
        bodyString = StringName.Email_ResetPasswordBody;
        url = `${this.serverUrl}/forgot-password?token=${emailToken.token}`;
        break;
      case EmailTokenType.LoginRequest:
        subjectString = StringName.Email_LoginRequestSubjectTemplate;
        bodyString = StringName.Email_LoginRequestBody;
        url = `${this.serverUrl}/challenge?token=${emailToken.token}`;
        break;
      case EmailTokenType.MnemonicRecoveryRequest:
      case EmailTokenType.PrivateKeyRequest:
      default:
        throw new Error('Invalid email token type');
    }
    const emailSubject = translate(subjectString);
    const emailText = `${translate(bodyString)}\r\n\r\n${url}`;
    const emailHtml = `<p>${translate(
      bodyString,
    )}</p><br/><p><a href="${url}">${url}</a></p><p>${translate(
      StringName.Email_LinkExpiresInTemplate,
    )}</p>`;

    try {
      // Use the EmailService to send the email
      await this.emailService.sendEmail(
        emailToken.email,
        emailSubject,
        emailText,
        emailHtml,
      );

      // update last sent/expiration
      emailToken.lastSent = new Date();
      emailToken.expiresAt = new Date(
        Date.now() + AppConstants.EmailTokenExpiration,
      );
      await emailToken.save({ session });
    } catch (error) {
      console.error('Error sending email:', error);
      throw new EmailTokenFailedToSendError(emailToken.type);
    }
  }

  /**
   * Find a user by email or username and enforce account status checks
   * @param email Optional email
   * @param username Optional username
   * @param session Optional mongoose session
   * @throws UsernameOrEmailRequiredError if neither provided
   * @throws InvalidCredentialsError if not found or deleted
   * @throws AccountLockedError | PendingEmailVerificationError | AccountStatusError per status
   */
  public async findUser(
    email?: string,
    username?: string,
    session?: ClientSession,
  ): Promise<IUserDocument> {
    if (!email && !username) {
      throw new UsernameOrEmailRequiredError();
    }
    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    let userDoc: IUserDocument | null = null;
    if (email) {
      userDoc = await UserModel.findOne({
        email: email.toLowerCase(),
      }).session(session ?? null);
    } else if (username) {
      userDoc = await UserModel.findOne({ username })
        .collation({ locale: 'en', strength: 2 })
        .session(session ?? null);
    }

    if (!userDoc || userDoc.deletedAt) {
      if (email) {
        throw new InvalidEmailError(InvalidEmailErrorType.Missing);
      }
      throw new InvalidUsernameError();
    }

    switch (userDoc.accountStatus) {
      case AccountStatus.Active:
        break;
      case AccountStatus.AdminLock:
        throw new AccountLockedError();
      case AccountStatus.PendingEmailVerification:
        throw new PendingEmailVerificationError();
      default:
        throw new AccountStatusError(userDoc.accountStatus);
    }

    return userDoc as IUserDocument;
  }

  /**
   * Finds a user record by ID
   * @param userId The user ID
   * @param throwIfNotActive Whether to throw if the user is inactive
   * @param session The active session, if present
   * @returns The user document
   */
  public async findUserById(
    userId: DefaultBackendIdType,
    throwIfNotActive: boolean,
    session?: ClientSession,
    select?: ProjectionType<IUserDocument>,
  ): Promise<IUserDocument> {
    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    const baseQuery = UserModel.findById(userId).session(session ?? null);
    if (select) {
      // Always include fields needed for status checks
      const merged = this.ensureRequiredFieldsInProjection(select, [
        'deletedAt',
        'accountStatus',
      ]);
      baseQuery.select(merged);
    }
    const userDoc = (await baseQuery.exec()) as IUserDocument | null;
    if (!userDoc || userDoc.deletedAt) {
      throw new UserNotFoundError();
    }
    if (throwIfNotActive) {
      switch (userDoc.accountStatus) {
        case AccountStatus.Active:
          break;
        case AccountStatus.AdminLock:
          throw new AccountLockedError();
        case AccountStatus.PendingEmailVerification:
          throw new PendingEmailVerificationError();
        default:
          throw new AccountStatusError(userDoc.accountStatus);
      }
    }
    return userDoc;
  }

  /**
   * Ensure required fields are present in a projection for queries that rely on them.
   * Supports string and object-style projections. For inclusion projections, adds fields.
   * For exclusion projections, ensures required fields are not excluded.
   */
  private ensureRequiredFieldsInProjection(
    select: ProjectionType<IUserDocument>,
    required: string[],
  ): ProjectionType<IUserDocument> {
    if (typeof select === 'string') {
      const parts = select
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const exclusions = new Set(
        parts.filter((p) => p.startsWith('-')).map((p) => p.slice(1)),
      );
      // Remove exclusions on required fields
      for (const r of required) {
        exclusions.delete(r);
      }
      const cleaned = parts.filter((p) => !p.startsWith('-'));
      for (const r of required) {
        if (!cleaned.includes(r)) cleaned.push(r);
      }
      const result = [...cleaned, ...[...exclusions].map((r) => `-${r}`)];
      return result.join(' ');
    }
    if (select && typeof select === 'object') {
      const proj: ProjectionObject = { ...(select as ProjectionObject) };
      const values = Object.values(proj);
      const hasInclusions = values.some((v) => v === 1 || v === true);
      if (hasInclusions) {
        for (const r of required) {
          proj[r] = 1;
        }
      } else {
        for (const r of required) {
          if (proj[r] === 0 || proj[r] === false || proj[r] === -1) {
            delete proj[r];
          }
        }
      }
      return proj as ProjectionType<IUserDocument>;
    }
    return select;
  }

  /**
   * Fill in the default values to a user object
   * @param newUser The user object to fill in
   * @param createdBy The user ID of the user creating the new user
   * @returns The filled in user
   */
  public fillUserDefaults(
    newUser: ICreateUserBasics,
    createdBy: DefaultBackendIdType,
    backupCodes: Array<IBackupCode>,
    encryptedMnemonic: string,
    userId?: DefaultBackendIdType,
  ): IUserBackendObject {
    return {
      ...(userId ? { _id: userId } : {}),
      timezone: 'UTC',
      ...newUser,
      email: newUser.email.toLowerCase(),
      emailVerified: false,
      accountStatus: AccountStatus.PendingEmailVerification,
      duressPasswords: [],
      siteLanguage: StringLanguage.EnglishUS,
      overallCanaryStatus: CanaryStatus.Alive,
      publicKey: '',
      backupCodes,
      mnemonicRecovery: encryptedMnemonic,
      directChallenge: false,
      createdAt: new Date(),
      createdBy: createdBy,
      updatedAt: new Date(),
      updatedBy: createdBy,
    } as IUserBackendObject;
  }

  /**
   * Create a new user document from an IUser and unhashed password
   * @param newUser The user object
   * @returns The new user document
   */
  public async makeUserDoc(newUser: IUser): Promise<IUserDocument> {
    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);

    const newUserDoc: IUserDocument = new UserModel(newUser);

    const validationError = newUserDoc.validateSync();
    if (validationError) {
      throw new MongooseValidationError(validationError.errors);
    }

    return newUserDoc;
  }

  /**
   * Create a new user.
   * Do not set createdBy to a new (non-existing) ObjectId unless you also set newUserId to it.
   * If newUserId is not set, one will be generated.
   * @param systemUser The system user performing the operation
   * @param userData Username, email, password in a ICreateUserBasics object
   * @param createdBy The user id of the user creating the user
   * @param newUserId the user id of the new user object- usually the createdBy user id.
   * @param session The session to use for the query
   * @param debug Whether to log debug information
   * @param password The password to use for the new user (optional, if not provided, mnemonic will be used)
   * @returns The new user document
   */
  public async newUser(
    systemUser: BrightChainMember,
    userData: ICreateUserBasics,
    createdBy?: DefaultBackendIdType,
    newUserId?: DefaultBackendIdType,
    session?: ClientSession,
    debug = false,
    password?: string,
  ): Promise<{
    user: IUserDocument;
    mnemonic: string;
    backupCodes: Array<string>;
    password?: string;
  }> {
    const _newUserId = newUserId ?? new Types.ObjectId();
    if (!AppConstants.UsernameRegex.test(userData.username)) {
      throw new InvalidUsernameError();
    }
    if (password && !AppConstants.PasswordRegex.test(password)) {
      throw new InvalidNewPasswordError();
    }

    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    return await this.withTransaction<{
      user: IUserDocument;
      backupCodes: Array<string>;
      mnemonic: string;
    }>(
      async (sess: ClientSession | undefined) => {
        const existingEmail: IUserDocument | null = await UserModel.findOne({
          email: userData.email.toLowerCase(),
        }).session(sess ?? null);
        if (existingEmail) {
          throw new EmailInUseError();
        }
        const existingUsername: IUserDocument | null = await UserModel.findOne({
          username: { $regex: new RegExp(`^${userData.username}$`, 'i') },
        }).session(sess ?? null);
        if (existingUsername) {
          throw new UsernameInUseError();
        }

        let mnemonic: SecureString | undefined;
        let member: BrightChainMember | undefined;
        while (!mnemonic || !member) {
          try {
            const { member: newMember, mnemonic: newMnemonic } =
              BrightChainMember.newMember(
                this.eciesService,
                MemberType.User,
                userData.username,
                new EmailString(userData.email),
                undefined,
                createdBy,
              );
            // make sure the new mnemonic is not already in the database

            const mnemonicExists = await this.mnemonicService.mnemonicExists(
              newMnemonic,
              sess,
            );
            if (!mnemonicExists) {
              member = newMember;
              mnemonic = newMnemonic;
            }
          } catch {
            // If we fail to create a new member, we will retry until we succeed.
            // This is to ensure that we do not end up with duplicate mnemonics.
            debugLog(
              debug,
              'warn',
              'Failed to create a new member, retrying...',
            );
          }
        }

        const backupCodes = BackupCode.generateBackupCodes();
        const encryptedBackupCodes = await BackupCode.encryptBackupCodes(
          member,
          systemUser,
          backupCodes,
        );
        const encryptedMnemonic = member
          .encryptData(Buffer.from(mnemonic.value ?? '', 'utf-8'))
          .toString('hex');

        const newUserDoc = new UserModel({
          ...this.fillUserDefaults(
            userData,
            createdBy ?? _newUserId,
            encryptedBackupCodes,
            encryptedMnemonic,
            _newUserId,
          ),
          publicKey: member.publicKey.toString('hex'),
        });

        const validationError = newUserDoc.validateSync();
        if (validationError) {
          throw new MongooseValidationError(validationError.errors);
        }

        // Always add HMAC-only mnemonic doc
        const newMnemonicDoc = await this.mnemonicService.addMnemonic(
          mnemonic,
          sess,
        );
        if (newMnemonicDoc) {
          newUserDoc.mnemonicId = newMnemonicDoc._id;
        }

        // If password provided, wrap the ECIES private key with the password (Option B)
        if (password) {
          const passwordSecure = new SecureString(password);
          try {
            const priv = new SecureBuffer(member.privateKey!.value);
            try {
              const wrapped = this.keyWrappingService.wrapSecret(
                priv,
                passwordSecure,
              );
              newUserDoc.passwordWrappedPrivateKey = wrapped;
            } finally {
              priv.dispose();
            }
          } finally {
            passwordSecure.dispose();
          }
        }

        const savedUserDoc = await newUserDoc.save({ session: sess });

        const memberRoleId = await this.roleService.getRoleIdByName(
          AppConstants.MemberRole as Role,
          sess,
        );

        if (!memberRoleId) {
          throw new Error(
            translate(StringName.Error_FailedToLookupRoleTemplate, {
              ROLE: translate(StringName.Common_Member),
            }),
          );
        }

        await this.roleService.addUserToRole(
          memberRoleId,
          savedUserDoc._id,
          _newUserId,
          sess,
        );

        return {
          user: savedUserDoc,
          mnemonic: mnemonic.value ?? '',
          backupCodes: backupCodes.map((code: BackupCode) => code.value ?? ''),
          ...(password ? { password } : {}),
        };
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 10,
      },
    );
  }

  /**
   * Get the backup codes for a user.
   * Requires the user not be deleted or inactive
   */
  public async getEncryptedUserBackupCodes(
    userId: DefaultBackendIdType,
    session?: ClientSession,
  ): Promise<Array<IBackupCode>> {
    const userWithCodes = await this.findUserById(userId, true, session, {
      backupCodes: 1,
    });
    return userWithCodes.backupCodes;
  }

  /**
   * Resets the given user's backup codes
   * @param backupUser The user to generate codes for
   * @param session The current session, if any
   * @returns A promise of an array of backup codes
   */
  public async resetUserBackupCodes(
    backupUser: BrightChainMember,
    systemUser: BrightChainMember,
    session?: ClientSession,
  ): Promise<Array<BackupCode>> {
    if (!backupUser.hasPrivateKey) {
      throw new PrivateKeyRequiredError();
    }
    const backupCodes = BackupCode.generateBackupCodes();
    const encryptedBackupCodes = await BackupCode.encryptBackupCodes(
      backupUser,
      systemUser,
      backupCodes,
    );
    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    return await this.withTransaction<Array<BackupCode>>(
      async (sess: ClientSession | undefined) => {
        await UserModel.updateOne(
          { _id: backupUser.id },
          { $set: { backupCodes: encryptedBackupCodes } },
          { session: sess },
        );
        return backupCodes;
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout,
      },
    );
  }

  /**
   * Recover a user's mnemonic from an encrypted mnemonic
   * @param user The user whose mnemonic to recover
   * @param encryptedMnemonic The encrypted mnemonic
   * @returns The recovered mnemonic
   */
  public recoverMnemonic(
    user: BrightChainMember,
    encryptedMnemonic: string,
  ): SecureString {
    if (!encryptedMnemonic) {
      throw new HandleableError(
        translate(StringName.MnemonicRecovery_Missing),
        {
          statusCode: 400,
        },
      );
    }

    return new SecureString(
      user.decryptData(Buffer.from(encryptedMnemonic, 'hex')).toString('utf-8'),
    );
  }

  /**
   * Make a BurnbagMember from a user document and optional private key
   * @param userDoc The user document
   * @param privateKey Optional private key to load the wallet
   * @param publicKey Optional public key to override the userDoc public key
   * @param session The current session, if any
   * @returns A promise containing the created BurnbagMember
   */
  public async makeBurnbagUserFromUserDoc(
    userDoc: IUserDocument,
    privateKey?: SecureBuffer,
    publicKey?: Buffer,
    mnemonic?: SecureString,
    wallet?: Wallet,
    session?: ClientSession,
  ): Promise<BrightChainMember> {
    const memberType = await this.roleService.getMemberType(userDoc, session);
    const user = new BrightChainMember(
      this.eciesService,
      memberType,
      userDoc.username,
      new EmailString(userDoc.email),
      publicKey ?? Buffer.from(userDoc.publicKey, 'hex'),
      privateKey,
      wallet,
      userDoc._id,
      new Date(userDoc.createdAt),
      new Date(userDoc.updatedAt),
      userDoc.createdBy,
    );
    if ((privateKey?.originalLength ?? -1) > 0 && user.hasPrivateKey) {
      user.loadWallet(
        mnemonic ?? this.recoverMnemonic(user, userDoc.mnemonicRecovery),
      );
    }
    return user;
  }

  /**
   * Challenges a given userDoc with a given mnemonic, returns a system and user BurnbagMember
   * @param userDoc The userDoc in question
   * @param mnemonic The mnemonic to challenge against
   * @returns A promise containing the user and system BurnbagMembers
   * @throws InvalidCredentialsError if the challenge fails
   * @throws AccountLockedError if the account is locked
   * @throws PendingEmailVerificationError if the email is not verified
   * @throws AccountStatusError if the account status is invalid
   */
  public async challengeUserWithMnemonic(
    userDoc: IUserDocument,
    mnemonic: SecureString,
    session?: ClientSession,
  ): Promise<{
    userMember: BrightChainMember;
    adminMember: BrightChainMember;
  }> {
    try {
      // Verify provided mnemonic corresponds to the stored mnemonic HMAC (no password required)
      // This prevents any valid mnemonic from authenticating as another user.
      const MnemonicModel = this.application.getModel<IMnemonicDocument>(
        ModelName.Mnemonic,
      );
      if (!userDoc.mnemonicId) {
        throw new InvalidCredentialsError();
      }
      const mnemonicDoc = await MnemonicModel.findById(userDoc.mnemonicId)
        .select('hmac')
        .session(session ?? null)
        .lean()
        .exec();
      if (!mnemonicDoc) {
        throw new InvalidCredentialsError();
      }
      const computedHmac = this.mnemonicService.getMnemonicHmac(mnemonic);
      console.log('Debug mnemonic auth:', {
        userDocId: userDoc._id.toString(),
        userDocEmail: userDoc.email,
        userDocUsername: userDoc.username,
        mnemonicDocId: mnemonicDoc._id?.toString(),
        storedHmac: mnemonicDoc.hmac,
        computedHmac,
        mnemonicsMatch: computedHmac === mnemonicDoc.hmac,
      });
      if (computedHmac !== mnemonicDoc.hmac) {
        throw new InvalidCredentialsError();
      }

      // Create a BurnbagMember from the provided mnemonic to get the keys
      const { wallet } = this.eciesService.walletAndSeedFromMnemonic(mnemonic);
      const privateKey = wallet.getPrivateKey();
      const publicKey = wallet.getPublicKey();
      const publicKeyWithPrefix = Buffer.concat([
        Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
        publicKey,
      ]);
      const userMember = await this.makeBurnbagUserFromUserDoc(
        userDoc,
        new SecureBuffer(privateKey),
        publicKeyWithPrefix,
        mnemonic,
        wallet,
        session,
      );

      // Verify the public key matches the stored userDoc public key
      if (userMember.publicKey.toString('hex') !== userDoc.publicKey) {
        throw new InvalidCredentialsError();
      }

      // Generate a nonce challenge to verify they can decrypt with their key
      const adminMember = SystemUserService.getSystemUser(
        this.application.environment,
      );
      const nonce = randomBytes(32);
      const signature = adminMember.sign(nonce);
      const payload = Buffer.concat([nonce, signature]);

      const encryptedPayload = userMember.encryptData(payload);
      const decryptedPayload = userMember.decryptData(encryptedPayload);

      // Verify the server's signature on the nonce
      const decryptedNonce = decryptedPayload.subarray(0, 32);
      const decryptedSignature = decryptedPayload.subarray(32);

      const isSignatureValid = adminMember.verify(
        decryptedSignature as SignatureBuffer,
        decryptedNonce,
      );

      if (!isSignatureValid || !nonce.equals(decryptedNonce)) {
        throw new InvalidCredentialsError();
      }

      return {
        userMember,
        adminMember: adminMember,
      };
    } catch (error) {
      if (
        error instanceof InvalidCredentialsError ||
        error instanceof AccountLockedError ||
        error instanceof PendingEmailVerificationError ||
        error instanceof AccountStatusError
      ) {
        throw error;
      }
      throw new InvalidCredentialsError();
    }
  }

  /**
   * Validates a login challenge response
   * @param challengeResponse The challenge response bytes in hex
   * @param email The email address of the user
   * @param username The username of the user
   * @param session The mongo session for the query
   * @returns A promise that resolves to the user document, user member, and system member
   */
  public async loginWithChallengeResponse(
    challengeResponse: string,
    email?: string,
    username?: string,
    session?: ClientSession,
  ): Promise<{
    userDoc: IUserDocument;
    userMember: BrightChainMember;
    adminMember: BrightChainMember;
  }> {
    const challengeBuffer = Buffer.from(challengeResponse, 'hex');
    // validate the expected challenge response length (8 + 32 + 64 = 104 bytes)
    if (challengeBuffer.length != AppConstants.DirectLoginChallengeLength) {
      throw new InvalidChallengeResponseError();
    }
    // disassemble the challengeResponse into time, nonce, signature
    //
    const time = challengeBuffer.subarray(0, 8); // 16 hex characters
    const nonce = challengeBuffer.subarray(8, 40); // 64 hex characters
    const signature = challengeBuffer.subarray(40); // 65 * 2 hex characters

    const timeMs = parseInt(time.toString('hex'), 16);
    if (new Date().getTime() - timeMs > AppConstants.LoginChallengeExpiration) {
      throw new LoginChallengeExpiredError();
    }

    const userDoc = await this.findUser(email, username, session);
    if (!userDoc && email) {
      throw new InvalidEmailError(InvalidEmailErrorType.Missing);
    } else if (!userDoc) {
      throw new InvalidUsernameError();
    }
    // re-sign the time + nonce and check if the signature matches
    const adminMember = SystemUserService.getSystemUser(
      this.application.environment,
    );
    const timeAndNonce = Buffer.concat([time, nonce]);
    const expectedSignature = adminMember.sign(timeAndNonce);
    if (expectedSignature.toString('hex') !== signature.toString('hex')) {
      throw new InvalidChallengeResponseError();
    }

    const userMember = await this.makeBurnbagUserFromUserDoc(
      userDoc,
      undefined,
      undefined,
      undefined,
      undefined,
      session,
    );

    return {
      userDoc,
      userMember,
      adminMember: adminMember,
    };
  }

  /**
   * Authenticate a user with client-verified challenge (skips server-side challenge)
   * @returns The authenticated user document.
   */
  public async loginWithClientVerifiedChallenge(
    usernameOrEmail: string,
    mnemonic: SecureString,
    session?: ClientSession,
  ): Promise<{
    userDoc: IUserDocument;
    userMember: BrightChainMember;
    adminMember: BrightChainMember;
  }> {
    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    const userQuery = validator.isEmail(usernameOrEmail)
      ? UserModel.findOne({ email: usernameOrEmail.toLowerCase() }).select(
          '_id username email accountStatus deletedAt mnemonicId publicKey passwordWrappedPrivateKey',
        )
      : UserModel.findOne({ username: usernameOrEmail })
          .collation({ locale: 'en', strength: 2 })
          .select(
            '_id username email accountStatus deletedAt mnemonicId publicKey passwordWrappedPrivateKey',
          );
    const userDoc = await userQuery.lean().session(session ?? null);

    if (!userDoc || userDoc.deletedAt) {
      throw new InvalidCredentialsError();
    }

    // Check account status
    switch (userDoc.accountStatus) {
      case AccountStatus.Active:
        break;
      case AccountStatus.AdminLock:
        throw new AccountLockedError();
      case AccountStatus.PendingEmailVerification:
        throw new PendingEmailVerificationError();
      default:
        throw new AccountStatusError(userDoc.accountStatus);
    }

    // Verify mnemonic matches user (simplified verification)
    try {
      const MnemonicModel = this.application.getModel<IMnemonicDocument>(
        ModelName.Mnemonic,
      );
      if (!userDoc.mnemonicId) {
        throw new InvalidCredentialsError();
      }
      const mnemonicDoc = await MnemonicModel.findById(userDoc.mnemonicId)
        .select('hmac')
        .session(session ?? null)
        .lean()
        .exec();
      if (!mnemonicDoc) {
        throw new InvalidCredentialsError();
      }
      const computedHmac = this.mnemonicService.getMnemonicHmac(mnemonic);
      if (computedHmac !== mnemonicDoc.hmac) {
        throw new InvalidCredentialsError();
      }

      // Create BurnbagMember from mnemonic
      const { wallet } = this.eciesService.walletAndSeedFromMnemonic(mnemonic);
      const privateKey = wallet.getPrivateKey();
      const publicKey = wallet.getPublicKey();
      const publicKeyWithPrefix = Buffer.concat([
        Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
        publicKey,
      ]);
      const userMember = await this.makeBurnbagUserFromUserDoc(
        userDoc,
        new SecureBuffer(privateKey),
        publicKeyWithPrefix,
        mnemonic,
        wallet,
        session,
      );

      // Verify public key matches
      if (userMember.publicKey.toString('hex') !== userDoc.publicKey) {
        throw new InvalidCredentialsError();
      }

      const adminMember = SystemUserService.getSystemUser(
        this.application.environment,
      );

      return {
        userMember,
        adminMember,
        userDoc,
      };
    } catch (error) {
      if (
        error instanceof InvalidCredentialsError ||
        error instanceof AccountLockedError ||
        error instanceof PendingEmailVerificationError ||
        error instanceof AccountStatusError
      ) {
        throw error;
      }
      throw new InvalidCredentialsError();
    }
  }

  /**
   * Authenticate a user with their mnemonic.
   * @returns The authenticated user document.
   */
  public async loginWithMnemonic(
    usernameOrEmail: string,
    mnemonic: SecureString,
    session?: ClientSession,
  ): Promise<{
    userDoc: IUserDocument;
    userMember: BrightChainMember;
    adminMember: BrightChainMember;
  }> {
    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    const userQuery = validator.isEmail(usernameOrEmail)
      ? UserModel.findOne({ email: usernameOrEmail.toLowerCase() }).select(
          '_id username email accountStatus deletedAt mnemonicId publicKey passwordWrappedPrivateKey',
        )
      : UserModel.findOne({ username: usernameOrEmail })
          .collation({ locale: 'en', strength: 2 })
          .select(
            '_id username email accountStatus deletedAt mnemonicId publicKey passwordWrappedPrivateKey',
          );
    const userDoc = await userQuery.lean().session(session ?? null);

    if (!userDoc || userDoc.deletedAt) {
      throw new InvalidCredentialsError();
    }

    // Check account status
    switch (userDoc.accountStatus) {
      case AccountStatus.Active:
        break;
      case AccountStatus.AdminLock:
        throw new AccountLockedError();
      case AccountStatus.PendingEmailVerification:
        throw new PendingEmailVerificationError();
      default:
        throw new AccountStatusError(userDoc.accountStatus);
    }

    const challengeResponse = await this.challengeUserWithMnemonic(
      userDoc,
      mnemonic,
      session,
    );
    return { ...challengeResponse, userDoc };
  }

  /**
   * Authenticate a user with their password (for key-wrapped accounts).
   * @returns The authenticated user document.
   */
  public async loginWithPassword(
    usernameOrEmail: string,
    password: string,
    session?: ClientSession,
  ): Promise<{
    userDoc: IUserDocument;
    userMember: BrightChainMember;
    adminMember: BrightChainMember;
  }> {
    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    const query = validator.isEmail(usernameOrEmail)
      ? UserModel.findOne({ email: usernameOrEmail.toLowerCase() })
      : UserModel.findOne({ username: usernameOrEmail }).collation({
          locale: 'en',
          strength: 2,
        });

    const userDoc: IUserDocument | null = await query
      .session(session ?? null)
      .exec();

    if (!userDoc || userDoc.deletedAt) {
      throw new InvalidCredentialsError();
    }

    // Check account status
    switch (userDoc.accountStatus) {
      case AccountStatus.Active:
        break;
      case AccountStatus.AdminLock:
        throw new AccountLockedError();
      case AccountStatus.PendingEmailVerification:
        throw new PendingEmailVerificationError();
      default:
        throw new AccountStatusError(userDoc.accountStatus);
    }

    // Check if user has password-based authentication set up (Option B requires passwordWrappedPrivateKey)
    if (!userDoc.passwordWrappedPrivateKey || !userDoc.mnemonicId) {
      throw new InvalidCredentialsError();
    }
    // Unwrap password-wrapped private key and complete challenge with possession of private key
    const unwrapped = await this.keyWrappingService.unwrapSecretAsync(
      userDoc.passwordWrappedPrivateKey!,
      password,
    );

    // Build user member with unwrapped private key to decrypt challenge
    // Note: userMember now owns the unwrapped SecureBuffer, so we don't dispose it here
    const userMember = await this.makeBurnbagUserFromUserDoc(
      userDoc,
      unwrapped,
      undefined,
      undefined,
      undefined,
      session,
    );

    // Generate a nonce challenge signed by system
    const adminMember = SystemUserService.getSystemUser(
      this.application.environment,
    );
    const nonce = randomBytes(32);
    const signature = adminMember.sign(nonce);
    const payload = Buffer.concat([nonce, signature]);

    const encryptedPayload = userMember.encryptData(payload);
    const decryptedPayload = userMember.decryptData(encryptedPayload);

    const decryptedNonce = decryptedPayload.subarray(0, 32);
    const decryptedSignature = decryptedPayload.subarray(32);

    const isSignatureValid = adminMember.verify(
      decryptedSignature as SignatureBuffer,
      decryptedNonce,
    );
    if (!isSignatureValid || !nonce.equals(decryptedNonce)) {
      throw new InvalidCredentialsError();
    }
    return { userDoc, userMember, adminMember: adminMember };
  }

  /**
   * Re-send a previously sent email token
   * @param userId The user id
   * @param session The session to use for the query
   * @returns void
   * @throws EmailTokenUsedOrInvalidError
   */
  public async resendEmailToken(
    userId: string,
    type: EmailTokenType,
    session?: ClientSession,
    debug = false,
  ): Promise<void> {
    const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
      ModelName.EmailToken,
    );
    return await this.withTransaction<void>(
      async (sess: ClientSession | undefined) => {
        // look up the most recent email token for a given user, then send it
        const emailToken: IEmailTokenDocument | null =
          await EmailTokenModel.findOne({
            userId,
            type,
            expiresAt: { $gt: new Date() },
          })
            .session(sess ?? null)
            .sort({ createdAt: -1 })
            .limit(1);

        if (!emailToken) {
          throw new EmailTokenUsedOrInvalidError();
        }

        await this.sendEmailToken(emailToken, sess, debug);
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  }

  /**
   * Verify the email token and update the user's account status
   * @param emailToken The email token to verify
   * @param session The session to use for the query
   * @returns void
   * @throws EmailTokenUsedOrInvalidError
   * @throws EmailTokenExpiredError
   * @throws EmailVerifiedError
   * @throws UserNotFoundError
   */
  public async verifyAccountTokenAndComplete(
    emailToken: string,
    session?: ClientSession,
  ): Promise<void> {
    return await this.withTransaction<void>(
      async (sess: ClientSession | undefined) => {
        const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
          ModelName.EmailToken,
        );
        const UserModel = this.application.getModel<IUserDocument>(
          ModelName.User,
        );
        const token: IEmailTokenDocument | null = await this.findEmailToken(
          emailToken,
          EmailTokenType.AccountVerification,
          sess,
        );

        if (!token) {
          throw new EmailTokenUsedOrInvalidError();
        }

        if (token.expiresAt < new Date()) {
          await EmailTokenModel.deleteOne({ _id: token._id }).session(
            sess ?? null,
          );
          throw new EmailTokenExpiredError();
        }

        const user: IUserDocument | null = await UserModel.findById(
          token.userId,
        ).session(sess ?? null);

        if (!user || user.deletedAt) {
          throw new UserNotFoundError();
        }

        // set user email to token email and mark as verified
        user.email = token.email;
        user.emailVerified = true;
        user.accountStatus = AccountStatus.Active;
        user.updatedBy = user._id;
        await user.save({ session: sess });

        // Delete the token after successful verification
        await EmailTokenModel.deleteOne({ _id: token._id }).session(
          sess ?? null,
        );

        // add the user to the member role
        const memberRoleId = await this.roleService.getRoleIdByName(
          AppConstants.MemberRole as Role,
          sess,
        );
        if (memberRoleId) {
          await this.roleService.addUserToRole(
            memberRoleId,
            user._id,
            user._id,
            sess,
          );
        } else {
          throw new Error('Member role not found');
        }
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  }

  /**
   * Validate the email token
   * @param token The token to validate
   * @param restrictType The type of email token to validate (or throw)
   * @param session The session to use for the query
   * @returns void
   * @throws EmailTokenUsedOrInvalidError
   */
  public async validateEmailToken(
    token: string,
    restrictType?: EmailTokenType,
    session?: ClientSession,
  ): Promise<void> {
    return await this.withTransaction<void>(
      async (ses: ClientSession | undefined) => {
        const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
          ModelName.EmailToken,
        );
        const emailToken = await EmailTokenModel.findOne({
          token,
          ...(restrictType ? { type: EmailTokenType.PasswordReset } : {}),
        }).session(ses ?? null);

        if (!emailToken) {
          throw new EmailTokenUsedOrInvalidError();
        } else if (emailToken.expiresAt < new Date()) {
          await EmailTokenModel.deleteOne({ _id: emailToken._id }).session(
            ses ?? null,
          );
          throw new EmailTokenExpiredError();
        }

        // nothing else to do here, token is valid
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  }

  /**
   * Updates the user's language
   * @param userId - The ID of the user
   * @param newLanguage - The new language
   * @param session - The session to use for the query
   * @returns The updated user
   */
  public async updateSiteLanguage(
    userId: string,
    newLanguage: StringLanguage,
    session?: ClientSession,
  ): Promise<IRequestUserDTO> {
    return await this.withTransaction<IRequestUserDTO>(
      async (sess: ClientSession | undefined) => {
        const UserModel = this.application.getModel<IUserDocument>(
          ModelName.User,
        );
        const userDoc = await UserModel.findByIdAndUpdate(
          new Types.ObjectId(userId),
          {
            siteLanguage: newLanguage,
          },
          { new: true },
        ).session(sess ?? null);
        if (!userDoc) {
          throw new UserNotFoundError();
        }
        const roles = await this.roleService.getUserRoles(userDoc._id);
        const tokenRoles = this.roleService.rolesToTokenRoles(roles);
        return RequestUserService.makeRequestUserDTO(userDoc, tokenRoles);
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  }

  /**
   * Changes the user's password by re-wrapping their master key
   * @param userId - The ID of the user
   * @param currentPassword - The current password
   * @param newPassword - The new password
   * @param session - The session to use for the query
   * @returns void
   */
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    session?: ClientSession,
  ): Promise<void> {
    return await this.withTransaction<void>(
      async (sess: ClientSession | undefined) => {
        const UserModel = this.application.getModel<IUserDocument>(
          ModelName.User,
        );
        const userDoc = await UserModel.findById(userId).session(sess ?? null);
        if (!userDoc || !userDoc.passwordWrappedPrivateKey) {
          throw new UserNotFoundError();
        }

        if (!AppConstants.PasswordRegex.test(newPassword)) {
          throw new InvalidNewPasswordError();
        }

        const currentPasswordSecure = new SecureString(currentPassword);
        const newPasswordSecure = new SecureString(newPassword);

        try {
          // Unwrap existing private key and rewrap under new password
          const priv = this.keyWrappingService.unwrapSecret(
            userDoc.passwordWrappedPrivateKey,
            currentPasswordSecure,
          );
          try {
            const wrapped = this.keyWrappingService.wrapSecret(
              priv,
              newPasswordSecure,
            );
            userDoc.passwordWrappedPrivateKey = wrapped;
            await userDoc.save({ session: sess });
          } finally {
            priv.dispose();
          }
        } catch (error: unknown) {
          // Re-throw original error so controller can map it properly
          // Re-throw original error so controller can map it properly
          throw error as Error;
        } finally {
          currentPasswordSecure.dispose();
          newPasswordSecure.dispose();
        }
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  }

  /**
   * Retrieve an email token by its token string and type
   * @param token - The token string
   * @param type - The type of the email token
   * @param session - The session to use for the query
   * @returns The email token document or null if not found
   */
  public async findEmailToken(
    token: string,
    type?: EmailTokenType,
    session?: ClientSession,
  ): Promise<IEmailTokenDocument | null> {
    const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
      ModelName.EmailToken,
    );
    return await EmailTokenModel.findOne({
      token: token.toLowerCase().trim(),
      ...(type ? { type } : {}),
      expiresAt: { $gt: new Date() },
    }).session(session ?? null);
  }

  /**
   * Verify email token is valid
   * @param token - The email token
   * @param session - The session to use for the query
   * @returns void
   */
  public async verifyEmailToken(
    token: string,
    type: EmailTokenType,
    session?: ClientSession,
  ): Promise<void> {
    return await this.withTransaction<void>(
      async (sess: ClientSession | undefined) => {
        // Find and validate the token
        const emailToken = await this.findEmailToken(token, type, sess);

        if (!emailToken) {
          throw new EmailTokenUsedOrInvalidError();
        }
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  }

  /**
   * Reset password using email token
   * @param token - The email token
   * @param newPassword - The new password
   * @param session - The session to use for the query
   * @returns void
   */
  public async resetPasswordWithToken(
    token: string,
    newPassword: string,
    credential?: string, // either mnemonic or current password; required
    session?: ClientSession,
  ): Promise<void> {
    if (!AppConstants.PasswordRegex.test(newPassword)) {
      throw new InvalidNewPasswordError();
    }
    if (!credential) {
      throw new EmailTokenUsedOrInvalidError();
    }

    return await this.withTransaction<void>(
      async (sess: ClientSession | undefined) => {
        const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
          ModelName.EmailToken,
        );
        const UserModel = this.application.getModel<IUserDocument>(
          ModelName.User,
        );

        // Find and validate the token
        const emailToken = await this.findEmailToken(
          token,
          EmailTokenType.PasswordReset,
          sess,
        );

        if (!emailToken) {
          throw new EmailTokenUsedOrInvalidError();
        }

        // Find the user
        const userDoc = await UserModel.findById(emailToken.userId).session(
          sess ?? null,
        );
        if (!userDoc) {
          throw new UserNotFoundError();
        }
        // Update password-wrapped secrets based on credential type (Option B)
        const newPasswordSecure = new SecureString(newPassword);
        try {
          if (AppConstants.MnemonicRegex.test(credential)) {
            // Credential is mnemonic: verify it belongs to this user via public key
            const providedMnemonic = new SecureString(credential);
            try {
              const { wallet } =
                this.eciesService.walletAndSeedFromMnemonic(providedMnemonic);
              const pub = Buffer.concat([
                Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
                wallet.getPublicKey(),
              ]);
              if (pub.toString('hex') !== userDoc.publicKey) {
                throw new InvalidCredentialsError();
              }

              // Derive private key from mnemonic and wrap it with new password
              const privateKey = wallet.getPrivateKey();
              const priv = new SecureBuffer(privateKey);
              try {
                const wrappedPriv = this.keyWrappingService.wrapSecret(
                  priv,
                  newPasswordSecure,
                );
                userDoc.passwordWrappedPrivateKey = wrappedPriv;
                await userDoc.save({ session: sess });
              } finally {
                priv.dispose();
              }
            } finally {
              providedMnemonic.dispose();
            }
          } else {
            // Credential is current password: unwrap existing master key
            if (!userDoc.passwordWrappedPrivateKey) {
              throw new InvalidCredentialsError();
            }
            const privateKeyBuf =
              await this.keyWrappingService.unwrapSecretAsync(
                userDoc.passwordWrappedPrivateKey!,
                credential,
              );
            try {
              // Re-wrap the existing private key under the new password
              const wrappedPriv = this.keyWrappingService.wrapSecret(
                privateKeyBuf,
                newPasswordSecure,
              );
              userDoc.passwordWrappedPrivateKey = wrappedPriv;
              await userDoc.save({ session: sess });
            } finally {
              privateKeyBuf.dispose();
            }
          }

          // Delete the used token
          await EmailTokenModel.deleteOne({ _id: emailToken._id }).session(
            sess ?? null,
          );

          // Dispose temporary master key
        } finally {
          newPasswordSecure.dispose();
        }
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  }

  /**
   * Generate a login challenge for the client to sign
   * @returns The login challenge in hex
   */
  public generateDirectLoginChallenge(): string {
    const adminMember = SystemUserService.getSystemUser(
      this.application.environment,
    );
    const time = Buffer.alloc(8);
    time.writeBigUInt64BE(BigInt(new Date().getTime()));
    const nonce = randomBytes(32);
    const signature = adminMember.sign(Buffer.concat([time, nonce]));
    return Buffer.concat([time, nonce, signature]).toString('hex');
  }

  /**
   * Verifies a direct login challenge response
   * @param serverSignedRequest The login challenge response in hex
   * @param session The mongoose session, if provided
   * @returns A promise with the user document and user member object
   */
  public async verifyDirectLoginChallenge(
    serverSignedRequest: string,
    signature: SignatureString,
    username?: string,
    email?: string,
    session?: ClientSession,
  ): Promise<{ userDoc: IUserDocument; userMember: BrightChainMember }> {
    return await this.withTransaction<{
      userDoc: IUserDocument;
      userMember: BrightChainMember;
    }>(
      async (sess) => {
        // serverSignedRequest is:
        // time (8) +
        // nonce (32) +
        // server signature (64) +
        // signature (64)
        if (
          serverSignedRequest.length <
          (8 + 32 + AppConstants.ECIES.SIGNATURE_SIZE) * 2
        ) {
          throw new InvalidChallengeResponseError();
        }
        // get signed request into a buffer
        const requestBuffer = Buffer.from(serverSignedRequest, 'hex');
        // start tracking offset
        let offset = 0;
        // get the time
        const time = requestBuffer.subarray(offset, 8);
        offset += 8;
        // get the nonce
        const nonce = requestBuffer.subarray(offset, 40);
        offset += 32;
        // get the server signature
        const serverSignature = requestBuffer.subarray(
          offset,
          AppConstants.ECIES.SIGNATURE_SIZE + 40,
        );
        offset += AppConstants.ECIES.SIGNATURE_SIZE;
        const signedDataLength = offset;
        if (offset !== requestBuffer.length) {
          throw new InvalidChallengeResponseError();
        }
        // validate time is within acceptable range
        const timeMs = time.readBigUInt64BE();
        if (
          new Date().getTime() - Number(timeMs) >
          AppConstants.LoginChallengeExpiration
        ) {
          throw new LoginChallengeExpiredError();
        }
        // validate the server's signature on the time + nonce portion
        const adminMember = SystemUserService.getSystemUser(
          this.application.environment,
        );
        if (
          !adminMember.verify(
            serverSignature as SignatureBuffer,
            Buffer.concat([time, nonce]),
          )
        ) {
          throw new InvalidChallengeResponseError();
        }
        // locate the user by email or username
        const userDoc = await this.findUser(email, username, sess);
        if (!userDoc) {
          throw new InvalidChallengeResponseError();
        }
        // get the user's member object
        const user = await this.makeBurnbagUserFromUserDoc(
          userDoc,
          undefined,
          undefined,
          undefined,
          undefined,
          sess,
        );
        // get the signed portion of the response
        const signedData = requestBuffer.subarray(0, signedDataLength);
        // verify the user's signature on the signed portion
        if (
          !user.verify(
            Buffer.from(signature, 'hex') as SignatureBuffer,
            signedData,
          )
        ) {
          throw new InvalidChallengeResponseError();
        }

        // if the user is valid, try to use the token (prevents replay attacks)
        await DirectLoginTokenService.useToken(
          this.application,
          userDoc._id,
          nonce.toString('hex'),
        );

        // if successful, update lastLogin
        await this.updateLastLogin(userDoc._id);

        // return the user document and member object
        return { userDoc, userMember: user };
      },
      session,
      { timeoutMs: this.application.environment.mongo.transactionTimeout },
    );
  }

  /**
   * Request a login link via email
   * @param email Email address
   * @param username Username
   * @param session Existing session, if any
   * @returns void
   */
  public async requestEmailLogin(
    email?: string,
    username?: string,
    session?: ClientSession,
  ): Promise<void> {
    return this.withTransaction<void>(
      async (sess) => {
        const userDoc = await this.findUser(email, username, sess);
        if (!userDoc) {
          return;
        }
        await this.createAndSendEmailToken(
          userDoc,
          EmailTokenType.LoginRequest,
          sess,
          this.application.environment.debug,
        );
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout,
      },
    );
  }

  /**
   * Validate an email login token challenge
   * @param token The token to challenge
   * @param signature The signature of the token by the user's private key
   * @param session The session to use for the query
   * @returns The user document if the challenge is valid
   */
  public async validateEmailLoginTokenChallenge(
    token: string,
    signature: SignatureString,
    session?: ClientSession,
  ): Promise<IUserDocument> {
    return this.withTransaction<IUserDocument>(
      async (sess) => {
        const emailToken = await this.findEmailToken(
          token,
          EmailTokenType.LoginRequest,
          sess,
        );
        if (!emailToken) {
          throw new EmailTokenUsedOrInvalidError();
        }
        const userDoc = await this.findUser(emailToken.email, undefined, sess);
        if (!userDoc) {
          throw new UserNotFoundError();
        }
        const burnbagUser = await this.makeBurnbagUserFromUserDoc(
          userDoc,
          undefined,
          undefined,
          undefined,
          undefined,
          sess,
        );
        const result = burnbagUser.verify(
          Buffer.from(signature, 'hex') as SignatureBuffer,
          Buffer.from(token, 'hex'),
        );
        if (!result) {
          throw new InvalidChallengeResponseError();
        }
        await emailToken.deleteOne({ session: sess ?? null });
        await this.updateLastLogin(userDoc._id);
        return userDoc;
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout,
      },
    );
  }

  /**
   * Updates the user's last login time atomically
   * @param userId - The ID of the user
   * @returns void
   */
  public async updateLastLogin(userId: Types.ObjectId): Promise<void> {
    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    try {
      // Check if the database connection is still open
      const connection = this.application.db.connection;
      if (connection.readyState !== 1) {
        // Connection is not open (0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting)
        return; // Silently return if connection is not available
      }

      // Use atomic update to avoid conflicts and ensure we only update lastLogin
      // Use a separate session to avoid interfering with any ongoing transactions
      await UserModel.updateOne(
        { _id: userId },
        {
          $set: { lastLogin: new Date() },
          $setOnInsert: {}, // Prevent any unintended document creation
        },
        {
          upsert: false, // Never create a new document
          runValidators: false, // Skip validation for performance since we're only updating lastLogin
          // Don't use any session to avoid transaction conflicts
        },
      );
    } catch (error) {
      // Check if the error is due to client being closed
      if (
        error instanceof Error &&
        (error.message.includes('client was closed') ||
          error.message.includes('MongoClientClosedError') ||
          error.name === 'MongoClientClosedError')
      ) {
        // This is expected during shutdown, don't log it as an error
        return;
      }

      // If this fails, it's not critical for login functionality. Log it and move on.
      console.error(
        `Failed to update last login for user ${userId.toString()}`,
        error,
      );
    }
  }
}
