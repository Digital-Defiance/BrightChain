import {
  AccountLockedError,
  AccountStatus,
  AccountStatusError,
  AppConstants,
  DefaultIdType,
  EmailInUseError,
  EmailTokenExpiredError,
  EmailTokenFailedToSendError,
  EmailTokenSentTooRecentlyError,
  EmailTokenType,
  EmailTokenUsedOrInvalidError,
  IApplication,
  ICreateUserBasics,
  IEmailTokenDocument,
  IRequestUserDTO,
  ISuccessMessage,
  IUser,
  IUserBackendObject,
  IUserDTO,
  IUserDocument,
  InvalidCredentialsError,
  InvalidPasswordError,
  InvalidUserIdError,
  InvalidUsernameError,
  ModelNames,
  MongooseValidationError,
  PendingEmailVerificationError,
  StringLanguages,
  StringNames,
  UserNotFoundError,
  UsernameInUseError,
  UsernameOrEmailRequiredError,
  debugLog,
  translate,
} from '@BrightChain/brightchain-lib';
import { MailDataRequired, MailService } from '@sendgrid/mail';
import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { BaseService } from './base';
import { RequestUserService } from './requestUser';
import { RoleService } from './role';

/**
 * Service for managing users
 */
export class UserService extends BaseService {
  private readonly sendgridClient: MailService;
  private readonly roleService: RoleService;
  private readonly emailSender: string;
  private readonly serverUrl: string;
  private readonly disableEmailSend: boolean;
  /**
   * Constructor for the user service
   * @param application The application object
   * @param roleService The role service
   * @param sendgridKey The SendGrid API key
   * @param emailSender The email sender
   * @param serverUrl The server URL
   * @param disableEmailSend Whether to disable email sending
   */
  constructor(
    application: IApplication,
    roleService: RoleService,
    sendgridKey: string,
    emailSender: string,
    serverUrl: string,
    disableEmailSend = false,
  ) {
    super(application);
    this.sendgridClient = new MailService();
    this.sendgridClient.setApiKey(sendgridKey);
    this.roleService = roleService;
    this.emailSender = emailSender;
    this.serverUrl = serverUrl;
    this.disableEmailSend = disableEmailSend;
  }

  /**
   * Given a User Document, make a User DTO
   * @param user a User Document
   * @returns An IUserDTO
   */
  public static userToUserDTO(
    user: IUserDocument | Record<string, any>,
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
      ModelNames.EmailToken,
    );
    return await this.withTransaction<IEmailTokenDocument>(
      async (sess: ClientSession | undefined): Promise<IEmailTokenDocument> => {
        // delete any expired tokens for the same user and email to avoid index collisions
        await EmailTokenModel.deleteMany(
          {
            userId: userDoc.id,
            email: userDoc.email,
            expiresAt: { $lt: new Date() },
          },
          { session: sess },
        );
        const now = new Date();
        const tokens = await EmailTokenModel.create(
          [
            {
              userId: userDoc.id,
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
      return;
    }

    if (
      emailToken.lastSent &&
      emailToken.lastSent.getTime() + AppConstants.EmailTokenResendInterval >
        Date.now()
    ) {
      throw new EmailTokenSentTooRecentlyError(emailToken.lastSent);
    }
    const verifyUrl = `${this.serverUrl}/verify-email?token=${emailToken.token}`;
    const passwordUrl = `${this.serverUrl}/forgot-password?token=${emailToken.token}`;
    let msg: MailDataRequired;
    switch (emailToken.type) {
      case EmailTokenType.AccountVerification:
        msg = {
          to: emailToken.email,
          from: this.emailSender,
          subject: translate(StringNames.Email_ConfirmationSubject),
          text: `${translate(StringNames.Email_ConfirmationBody)}\r\n\r\n${verifyUrl}`,
          html: `<p>${translate(StringNames.Email_ConfirmationBody)}</p><br/><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Link expires in ${AppConstants.EmailTokenResendInterval / 1000} minutes.</p>`,
        };
        break;
      case EmailTokenType.PasswordReset:
        msg = {
          to: emailToken.email,
          from: this.emailSender,
          subject: translate(StringNames.Email_ResetPasswordSubject),
          text: `${translate(StringNames.Email_ResetPasswordBody)}.\r\n\r\n${passwordUrl}`,
          html: `<p>${translate(StringNames.Email_ResetPasswordBody)}</p><br/><p><a href="${passwordUrl}">${passwordUrl}</a></p><p>Link expires in ${AppConstants.EmailTokenResendInterval / 1000} minutes.</p>`,
        };
        break;
      default:
        throw new Error('Invalid email token type');
    }
    try {
      await this.sendgridClient.send(msg);
      console.log(`Email token sent to ${emailToken.email}`);
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
   * Find a user by their email or username and password.
   * @param password The user's password
   * @param email The user's email
   * @param username The user's username
   * @param session The session to use for the query
   * @returns The user document
   */
  public async findUser(
    password: string,
    email?: string,
    username?: string,
    session?: ClientSession,
  ): Promise<IUserDocument> {
    let userDoc: IUserDocument | null;
    const UserModel = this.application.getModel<IUserDocument>(ModelNames.User);

    if (username) {
      userDoc = await UserModel.findOne({
        username: { $regex: new RegExp(`^${username}$`, 'i') },
      }).session(session ?? null);
    } else if (email) {
      userDoc = await UserModel.findOne({ email: email.toLowerCase() }).session(
        session ?? null,
      );
    } else {
      // This should never happen due to our validation, but it's good to have as a fallback
      throw new UsernameOrEmailRequiredError();
    }

    if (!userDoc || userDoc.deletedAt) {
      throw new InvalidCredentialsError();
    }

    const isMatch = await compare(password, userDoc.password);
    if (!isMatch) {
      throw new InvalidCredentialsError();
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

    return userDoc;
  }

  /**
   * Fill in the default values to a user object
   * @param newUser The user object to fill in
   * @param createdBy The user ID of the user creating the new user
   * @returns The filled in user
   */
  public fillUserDefaults(
    newUser: ICreateUserBasics,
    createdBy: DefaultIdType,
  ): IUser {
    return {
      timezone: 'UTC',
      ...newUser,
      email: newUser.email.toLowerCase(),
      emailVerified: false,
      accountStatus: AccountStatus.PendingEmailVerification,
      createdAt: new Date(),
      createdBy: createdBy,
      updatedAt: new Date(),
      updatedBy: createdBy,
    } as IUser;
  }

  /**
   * Create a new user document from an IUser and unhashed password
   * @param newUser The user object
   * @param password Unhashed password
   * @returns The new user document
   */
  public async makeUserDoc(
    newUser: IUser,
    password: string,
  ): Promise<IUserDocument> {
    const hashedPassword = await hash(password, AppConstants.BcryptRounds);
    const newUserWithpassword: IUser = {
      ...newUser,
      password: hashedPassword,
    } as IUser;
    const UserModel = this.application.getModel<IUserDocument>(ModelNames.User);

    const newUserDoc: IUserDocument = new UserModel(newUserWithpassword);

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
   * @param userData Username, email, password in a ICreateUserBasics object
   * @param password The user's password
   * @param createdBy The user id of the user creating the user
   * @param newUserId the user id of the new user object- usually the createdBy user id.
   * @param session The session to use for the query
   * @returns The new user document
   */
  public async newUser(
    userData: ICreateUserBasics,
    password: string,
    createdBy: DefaultIdType,
    newUserId?: DefaultIdType,
    session?: ClientSession,
    debug = false,
  ): Promise<IUserDocument> {
    const _newUserId = newUserId ?? new Types.ObjectId();
    if (!AppConstants.UsernameRegex.test(userData.username)) {
      throw new InvalidUsernameError();
    }

    if (!AppConstants.PasswordRegex.test(password)) {
      throw new InvalidPasswordError();
    }

    const UserModel = this.application.getModel<IUserDocument>(ModelNames.User);
    return await this.withTransaction<IUserDocument>(async (sess) => {
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

      /* new user id must not already exist.
       * created by can be any user id, or the new user id (optionally)
       * created by must either exist or match the new user id
       */
      const createdByUser: IUserDocument | null = await UserModel.findById(
        createdBy,
      ).session(sess ?? null);
      const newUserIdUser: IUserDocument | null = await UserModel.findById(
        _newUserId,
      ).session(sess ?? null);
      if (newUserIdUser) {
        throw new InvalidUserIdError(StringNames.Validation_UserIdMustNotExist);
      } else if (
        createdBy.toString() !== _newUserId.toString() &&
        !createdByUser
      ) {
        // This condition handles two scenarios:
        // 1. Normal case: createdBy should be an existing user
        // 2. Edge case: Allow bootstrapping where createdBy is the same as the new user

        // Check if createdBy is different from the new user ID
        // AND if the createdBy user doesn't exist in the database
        throw new InvalidUserIdError(StringNames.Validation_CreatedUserIdError);
      }

      const newUser: IUserDocument = await this.makeUserDoc(
        {
          ...this.fillUserDefaults(userData, createdBy),
          _id: _newUserId,
        } as IUser,
        password,
      );

      await newUser.save({ session: sess });
      await this.createAndSendEmailToken(
        newUser,
        EmailTokenType.AccountVerification,
        sess,
        debug,
      );
      return newUser;
    }, session);
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
    session?: ClientSession,
    debug = false,
  ): Promise<void> {
    const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
      ModelNames.EmailToken,
    );
    return await this.withTransaction<void>(async (sess) => {
      // look up the most recent email token for a given user, then send it
      const emailToken: IEmailTokenDocument | null =
        await EmailTokenModel.findOne({
          userId,
          expiresAt: { $gt: new Date() },
        })
          .session(sess ?? null)
          .sort({ createdAt: -1 })
          .limit(1);

      if (!emailToken) {
        throw new EmailTokenUsedOrInvalidError();
      }

      await this.sendEmailToken(emailToken, sess, debug);
    }, session);
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
    return await this.withTransaction<void>(async (sess) => {
      const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
        ModelNames.EmailToken,
      );
      const UserModel = this.application.getModel<IUserDocument>(
        ModelNames.User,
      );

      const token: IEmailTokenDocument | null = await EmailTokenModel.findOne({
        token: emailToken,
        type: EmailTokenType.AccountVerification,
      }).session(sess ?? null);

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
      await EmailTokenModel.deleteOne({ _id: token._id }).session(sess ?? null);
    }, session);
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
    return await this.withTransaction<void>(async (ses) => {
      const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
        ModelNames.EmailToken,
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
    }, session);
  }

  /**
   * Change the user's password
   * @param userId The user ID
   * @param currentPassword The current password
   * @param newPassword The new password
   * @param session The session to use for the query
   * @returns void
   * @throws UserNotFoundError
   * @throws InvalidCredentialsError
   * @throws InvalidPasswordError
   */
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    session?: ClientSession,
  ): Promise<void> {
    return await this.withTransaction<void>(async (sess) => {
      const UserModel = this.application.getModel<IUserDocument>(
        ModelNames.User,
      );

      const user = await UserModel.findById(userId).session(sess ?? null);
      if (!user || user.deletedAt) {
        throw new UserNotFoundError();
      }

      const isMatch = await compare(currentPassword, user.password);
      if (!isMatch) {
        throw new InvalidCredentialsError();
      }

      if (!AppConstants.PasswordRegex.test(newPassword)) {
        throw new InvalidPasswordError();
      }

      user.password = await hash(newPassword, AppConstants.BcryptRounds);
      await user.save({ session: sess });
    }, session);
  }

  /**
   * Initiate the password reset process
   * @param email The email address to send the reset link to
   * @param session The session to use for the query
   * @returns The result of the operation
   */
  public async initiatePasswordReset(
    email: string,
    session?: ClientSession,
    debug = false,
  ): Promise<ISuccessMessage> {
    return await this.withTransaction<ISuccessMessage>(async (sess) => {
      const UserModel = this.application.getModel<IUserDocument>(
        ModelNames.User,
      );
      const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
        ModelNames.EmailToken,
      );

      try {
        const user = await UserModel.findOne({
          email: email.toLowerCase(),
        }).session(sess ?? null);
        if (!user || user.deletedAt) {
          // We don't want to reveal whether an email exists in our system
          return {
            success: true,
            message: translate(StringNames.PasswordReset_Success),
          };
        }

        // Check if the user's email is not verified
        if (!user.emailVerified) {
          return {
            success: false,
            message: translate(StringNames.PasswordReset_EmailNotVerified),
          };
        }

        // check for existing email token
        const emailToken = await EmailTokenModel.findOne({
          userId: user._id,
          type: EmailTokenType.PasswordReset,
          expiresAt: { $gt: new Date() },
        }).session(sess ?? null);
        if (emailToken) {
          return {
            success: false,
            message: translate(StringNames.PasswordReset_AlreadySent),
          };
        }

        // Create and send password reset token
        const newEmailToken = await this.createEmailToken(
          user,
          EmailTokenType.PasswordReset,
          sess,
        );
        await this.sendEmailToken(newEmailToken, sess, debug);

        return {
          success: true,
          message: translate(StringNames.PasswordReset_Success),
        };
      } catch (error) {
        console.error('Error in initiatePasswordReset:', error);
        return {
          success: false,
          message: translate(StringNames.Common_UnexpectedError),
        };
      }
    }, session);
  }

  /**
   * Reset the user's password
   * @param token - The password reset token
   * @param password - The new password
   * @param session - The session
   * @returns The updated user document
   * @throws EmailTokenUsedOrInvalidError
   * @throws UserNotFoundError
   */
  public async verifyResetTokenAndComplete(
    token: string,
    password: string,
    session?: ClientSession,
  ): Promise<IUserDocument> {
    const UserModel = this.application.getModel<IUserDocument>(ModelNames.User);
    const EmailTokenModel = this.application.getModel<IEmailTokenDocument>(
      ModelNames.EmailToken,
    );
    return await this.withTransaction<IUserDocument>(async (sess) => {
      const emailToken = await EmailTokenModel.findOne({
        token,
        type: EmailTokenType.PasswordReset,
        expiresAt: { $gt: new Date() },
      }).session(sess ?? null);

      if (!emailToken) {
        throw new EmailTokenUsedOrInvalidError();
      }

      const user = await UserModel.findById(emailToken.userId).session(
        session ?? null,
      );

      if (!user || user.deletedAt) {
        throw new UserNotFoundError();
      }

      // Update the user's password with the hashed password
      user.password = await hash(password, AppConstants.BcryptRounds);
      await user.save({ session });

      // Delete the used token
      await EmailTokenModel.deleteOne({ _id: emailToken._id }).session(
        session ?? null,
      );

      return user;
    }, session);
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
    newLanguage: StringLanguages,
    session?: ClientSession,
  ): Promise<IRequestUserDTO> {
    return await this.withTransaction<IRequestUserDTO>(async (sess) => {
      const UserModel = this.application.getModel<IUserDocument>(
        ModelNames.User,
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
      return RequestUserService.makeRequestUserDTO(userDoc, roles);
    }, session);
  }
}
