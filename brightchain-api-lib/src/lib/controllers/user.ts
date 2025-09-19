/// <reference path="../types.d.ts" />
import {
  AccountStatus,
  AppConstants,
  EmailString,
  EmailTokenType,
  GenericValidationError,
  GlobalActiveContext,
  HandleableError,
  IApiBackupCodesResponse,
  IApiChallengeResponse,
  IApiCodeCountResponse,
  IApiErrorResponse,
  IApiLoginResponse,
  IApiMessageResponse,
  IApiMnemonicResponse,
  IApiRegistrationResponse,
  IApiRequestUserResponse,
  InvalidCredentialsError,
  isValidTimezone,
  ModelName,
  PrivateKeyRequiredError,
  SecureString,
  SignatureString,
  StringLanguage,
  StringName,
  t,
  translate,
  UINT64_SIZE,
  UsernameOrEmailRequiredError,
} from '@brightchain/brightchain-lib';
import { Request } from 'express';
import { z } from 'zod';
// Import types to ensure Express augmentation is available
import { body } from 'express-validator';
import { IUserDocument } from '../documents/user';
import { IApplication } from '../interfaces/application';
import { IStatusCodeResponse } from '../interfaces/status-code-response';
import { findAuthToken } from '../middlewares/authenticate-token';
import { JwtService } from '../services/jwt';
import { RequestUserService } from '../services/request-user';
import { UserService } from '../services/user';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  routeConfig,
} from '../shared-types';

import { BrightChainMember } from '../backendMember';
import { BackupCode } from '../backupCode';
import { MnemonicOrPasswordRequiredError } from '../errors/mnemonic-or-password-required';
import { BackupCodeService } from '../services/backupCode';
import { ECIESService } from '../services/ecies';
import { RoleService } from '../services/role';
import { SystemUserService } from '../services/system-user';
import {
  requireOneOfValidatedFieldsAsync,
  requireValidatedFieldsAsync,
  withTransaction,
} from '../utils';
import { BaseController } from './base';

// Helper to narrow unknown values coming from req.validatedBody
const isString = (v: unknown): v is string => typeof v === 'string';

interface IUserHandlers {
  completeAccountVerfication: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  tokenVerifiedResponse: ApiRequestHandler<
    IApiRequestUserResponse | ApiErrorResponse
  >;
  refreshToken: ApiRequestHandler<IApiLoginResponse | ApiErrorResponse>;
  register: ApiRequestHandler<IApiRegistrationResponse | ApiErrorResponse>;
  resendVerification: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  setLanguage: ApiRequestHandler<IApiRequestUserResponse | ApiErrorResponse>;
  changePassword: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  forgotPassword: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  verifyResetToken: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  resetPassword: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  testCrypto: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  recoverMnemonic: ApiRequestHandler<IApiMnemonicResponse | ApiErrorResponse>;
  useBackupCodeLogin: ApiRequestHandler<IApiLoginResponse | ApiErrorResponse>;
  getBackupCodeCount: ApiRequestHandler<
    IApiCodeCountResponse | ApiErrorResponse
  >;
  resetBackupCodes: ApiRequestHandler<
    IApiBackupCodesResponse | ApiErrorResponse
  >;
  requestEmailLogin: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  emailLoginChallenge: ApiRequestHandler<IApiLoginResponse | ApiErrorResponse>;
  requestDirectLogin: ApiRequestHandler<
    IApiChallengeResponse | ApiErrorResponse
  >;
  directLoginChallenge: ApiRequestHandler<IApiLoginResponse | ApiErrorResponse>;
}

const RegisterSchema = z.object({
  username: z.string(),
  email: z.string(),
  timezone: z.string(),
  password: z.string().min(8).optional(),
});

// Minimal schemas for other handlers
const EmailLoginChallengeSchema = z.object({
  token: z.string(),
  signature: z.string(),
  email: z.string().optional(),
  username: z.string().optional(),
});

const DirectLoginChallengeSchema = z.object({
  challenge: z.string(),
  signature: z.string(),
  email: z.string().optional(),
  username: z.string().optional(),
});

/**
 * Controller for user-related routes
 */
export class UserController extends BaseController<
  IApiMessageResponse | ApiErrorResponse,
  IUserHandlers
> {
  /**
   * Controller for user-related routes
   */
  protected readonly userService: UserService;
  protected readonly jwtService: JwtService;
  protected readonly backupCodeService: BackupCodeService;
  protected readonly roleService: RoleService;
  protected readonly eciesService: ECIESService;
  protected readonly systemUser: BrightChainMember;

  /**
   * Constructor for the user controller
   * @param application The application object
   */
  constructor(
    application: IApplication,
    jwtService: JwtService,
    userService: UserService,
    backupCodeService: BackupCodeService,
    roleService: RoleService,
    eciesService: ECIESService,
  ) {
    super(application);
    this.jwtService = jwtService;
    this.userService = userService;
    this.backupCodeService = backupCodeService;
    this.roleService = roleService;
    this.eciesService = eciesService;
    this.systemUser = SystemUserService.getSystemUser(application.environment);
    this.handlers = {
      tokenVerifiedResponse: this.tokenVerifiedResponse,
      refreshToken: this.refreshToken,
      register: this.register,
      completeAccountVerfication: this.completeAccountVerfication,
      resendVerification: this.resendVerification,
      setLanguage: this.setLanguage,
      changePassword: this.changePassword,
      forgotPassword: this.forgotPassword,
      verifyResetToken: this.verifyResetToken,
      resetPassword: this.resetPassword,
      testCrypto: this.testCrypto,
      recoverMnemonic: this.recoverMnemonic,
      useBackupCodeLogin: this.useBackupCodeLogin,
      getBackupCodeCount: this.getBackupCodeCount,
      resetBackupCodes: this.resetBackupCodes,
      requestEmailLogin: this.requestEmailLogin,
      emailLoginChallenge: this.emailLoginChallenge,
      requestDirectLogin: this.requestDirectLogin,
      directLoginChallenge: this.directLoginChallenge,
    };
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig<IUserHandlers>('post', '/register', {
        handlerKey: 'register',
        validation: (validationLanguage: StringLanguage) => [
          body('username')
            .matches(AppConstants.UsernameRegex)
            .withMessage(
              translate(
                StringName.Validation_UsernameRegexErrorTemplate,
                undefined,
                validationLanguage,
              ),
            ),
          body('email')
            .isEmail()
            .withMessage(
              translate(
                StringName.Validation_InvalidEmail,
                undefined,
                validationLanguage,
              ),
            ),
          body('timezone')
            .isString()
            .custom((value, {}) => isValidTimezone(value))
            .withMessage(
              translate(
                StringName.Validation_TimezoneInvalid,
                undefined,
                validationLanguage,
              ),
            ),
          body('password')
            .optional()
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters'),
        ],
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('get', '/refresh-token', {
        handlerKey: 'refreshToken',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/account-verification', {
        handlerKey: 'completeAccountVerfication',
        validation: (validationLanguage: StringLanguage) => [
          body('token')
            .not()
            .isEmpty()
            .withMessage(
              translate(
                StringName.Validation_TokenRequired,
                undefined,
                validationLanguage,
              ),
            )
            .matches(
              new RegExp(`^[a-f0-9]{${AppConstants.EmailTokenLength * 2}}$`),
            )
            .withMessage(
              translate(
                StringName.Validation_InvalidToken,
                undefined,
                validationLanguage,
              ),
            ),
        ],
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('get', '/verify', {
        handlerKey: 'tokenVerifiedResponse',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/resend-verification', {
        handlerKey: 'resendVerification',
        validation: (validationLanguage: StringLanguage) => [
          body().custom((value, { req }) => {
            if (!req.body.username && !req.body.email) {
              throw new UsernameOrEmailRequiredError();
            }
            return true;
          }),
          body('username')
            .optional()
            .isString()
            .matches(AppConstants.UsernameRegex)
            .withMessage(
              translate(
                StringName.Validation_UsernameRegexErrorTemplate,
                undefined,
                validationLanguage,
              ),
            ),
          body('email').optional().isEmail(),
        ],
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/language', {
        handlerKey: 'setLanguage',
        validation: (validationLanguage: StringLanguage) => [
          body('language')
            .isString()
            .withMessage(
              translate(
                StringName.Validation_InvalidLanguage,
                undefined,
                validationLanguage,
              ),
            )
            .isIn(Object.values(StringLanguage))
            .withMessage(
              translate(
                StringName.Validation_InvalidLanguage,
                undefined,
                validationLanguage,
              ),
            ),
        ],
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/change-password', {
        handlerKey: 'changePassword',
        validation: (validationLanguage: StringLanguage) => [
          body('currentPassword')
            .notEmpty()
            .withMessage(
              translate(
                StringName.Validation_Required,
                undefined,
                validationLanguage,
              ),
            ),
          body('newPassword')
            .matches(AppConstants.PasswordRegex)
            .withMessage(t(StringName.Validation_PasswordRegexErrorTemplate))
            .notEmpty()
            .withMessage(
              translate(
                StringName.Validation_Required,
                undefined,
                validationLanguage,
              ),
            ),
        ],
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/forgot-password', {
        handlerKey: 'forgotPassword',
        validation: (validationLanguage: StringLanguage) => [
          body('email')
            .isEmail()
            .withMessage(
              translate(
                StringName.Validation_InvalidEmail,
                undefined,
                validationLanguage,
              ),
            ),
        ],
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('get', '/verify-reset-token', {
        handlerKey: 'verifyResetToken',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/reset-password', {
        handlerKey: 'resetPassword',
        validation: (validationLanguage: StringLanguage) => [
          body('token')
            .not()
            .isEmpty()
            .withMessage(
              translate(
                StringName.Validation_TokenRequired,
                undefined,
                validationLanguage,
              ),
            )
            .matches(
              new RegExp(`^[a-f0-9]{${AppConstants.EmailTokenLength * 2}}$`),
            )
            .withMessage(
              translate(
                StringName.Validation_InvalidToken,
                undefined,
                validationLanguage,
              ),
            ),
          // Accept either newPassword (preferred) or legacy password field; enforce presence in handler
          body('newPassword')
            .optional()
            .isLength({ min: AppConstants.PasswordMinLength })
            .withMessage(
              translate(
                StringName.Validation_PasswordMinLengthTemplate,
                undefined,
                validationLanguage,
              ),
            )
            .matches(AppConstants.PasswordRegex)
            .withMessage(
              translate(
                StringName.Validation_PasswordRegexErrorTemplate,
                undefined,
                validationLanguage,
              ),
            ),
          body('password')
            .optional()
            .isLength({ min: AppConstants.PasswordMinLength })
            .withMessage(
              translate(
                StringName.Validation_PasswordMinLengthTemplate,
                undefined,
                validationLanguage,
              ),
            )
            .matches(AppConstants.PasswordRegex)
            .withMessage(
              translate(
                StringName.Validation_PasswordRegexErrorTemplate,
                undefined,
                validationLanguage,
              ),
            ),
          // Include optional credential fields so they are present on validatedBody
          body('currentPassword').optional().isString(),
          body('mnemonic').optional().isString(),
          // currentPassword or mnemonic will be validated in the handler to allow either-or
        ],
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/recover-mnemonic', {
        handlerKey: 'recoverMnemonic',
        validation: (validationLanguage: StringLanguage) => [
          body('password')
            .isString()
            .withMessage(
              translate(
                StringName.Validation_CurrentPasswordRequired,
                undefined,
                validationLanguage,
              ),
            ),
        ],
        useAuthentication: true,
        useCryptoAuthentication: true,
      }),
      routeConfig<IUserHandlers>('post', '/backup-code', {
        handlerKey: 'useBackupCodeLogin',
        validation: (validationLanguage: StringLanguage) => [
          body('email').optional().isEmail(),
          body('username')
            .optional()
            .matches(AppConstants.UsernameRegex)
            .withMessage(
              translate(
                StringName.Validation_UsernameRegexErrorTemplate,
                undefined,
                validationLanguage,
              ),
            ),
          body('code')
            .custom((value) => {
              const normalized = BackupCode.normalizeCode(value);
              return (
                AppConstants.BACKUP_CODES.DisplayRegex.test(value) ||
                AppConstants.BACKUP_CODES.NormalizedHexRegex.test(normalized)
              );
            })
            .withMessage(
              translate(
                StringName.Validation_InvalidBackupCode,
                undefined,
                validationLanguage,
              ),
            ),
          body('recoverMnemonic').isBoolean().optional(),
          body('newPassword')
            .optional()
            .matches(AppConstants.PasswordRegex)
            .withMessage(
              translate(
                StringName.Validation_PasswordRegexErrorTemplate,
                undefined,
                validationLanguage,
              ),
            ),
        ],
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('get', '/backup-codes', {
        handlerKey: 'getBackupCodeCount',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/backup-codes', {
        handlerKey: 'resetBackupCodes',
        validation: (validationLanguage: StringLanguage) => [
          body().custom((value, { req }) => {
            if (!req.body?.password && !req.body?.mnemonic) {
              throw new MnemonicOrPasswordRequiredError();
            }
            return true;
          }),
          body('password')
            .optional()
            .notEmpty()
            .withMessage(
              translate(
                StringName.Validation_CurrentPasswordRequired,
                undefined,
                validationLanguage,
              ),
            ),
          body('mnemonic')
            .optional()
            .notEmpty()
            .withMessage(
              translate(
                StringName.Validation_MnemonicRequired,
                undefined,
                validationLanguage,
              ),
            )
            .matches(AppConstants.MnemonicRegex)
            .withMessage(translate(StringName.Validation_MnemonicRegex)),
        ],
        useAuthentication: true,
        useCryptoAuthentication: true,
      }),
      routeConfig<IUserHandlers>('post', '/request-email-login', {
        handlerKey: 'requestEmailLogin',
        validation: (validationLanguage: StringLanguage) => [
          body().custom((value, { req }) => {
            if (!req.body.username && !req.body.email) {
              throw new UsernameOrEmailRequiredError();
            }
            return true;
          }),
          body('username')
            .optional()
            .matches(AppConstants.UsernameRegex)
            .withMessage(
              translate(
                StringName.Validation_UsernameRegexErrorTemplate,
                undefined,
                validationLanguage,
              ),
            ),
          body('email')
            .optional()
            .isEmail()
            .withMessage(
              translate(
                StringName.Validation_InvalidEmail,
                undefined,
                validationLanguage,
              ),
            ),
        ],
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/request-direct-login', {
        handlerKey: 'requestDirectLogin',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/direct-challenge', {
        handlerKey: 'directLoginChallenge',
        validation: (validationLanguage: StringLanguage) => [
          body('challenge')
            .not()
            .isEmpty()
            .withMessage(
              translate(
                StringName.Validation_InvalidChallenge,
                undefined,
                validationLanguage,
              ),
            )
            .matches(
              new RegExp(
                `^[a-f0-9]{${
                  (UINT64_SIZE + 32 + AppConstants.ECIES.SIGNATURE_SIZE) * 2
                }}$`,
              ),
            )
            .withMessage(
              translate(
                StringName.Validation_InvalidChallenge,
                undefined,
                validationLanguage,
              ),
            ),
          body('signature')
            .not()
            .isEmpty()
            .withMessage(translate(StringName.Validation_InvalidSignature))
            .matches(
              new RegExp(
                `^[a-f0-9]{${AppConstants.ECIES.SIGNATURE_SIZE * 2}}$`,
              ),
            )
            .withMessage(StringName.Validation_InvalidSignature),
          body().custom((value, { req }) => {
            if (!req.body.username && !req.body.email) {
              throw new UsernameOrEmailRequiredError();
            }
            return true;
          }),
          body('username')
            .optional()
            .matches(AppConstants.UsernameRegex)
            .withMessage(
              translate(
                StringName.Validation_UsernameRegexErrorTemplate,
                undefined,
                validationLanguage,
              ),
            ),
          body('email')
            .optional()
            .isEmail()
            .withMessage(
              translate(
                StringName.Validation_InvalidEmail,
                undefined,
                validationLanguage,
              ),
            ),
        ],
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig<IUserHandlers>('post', '/email-challenge', {
        handlerKey: 'emailLoginChallenge',
        validation: (validationLanguage: StringLanguage) => [
          body('token')
            .not()
            .isEmpty()
            .withMessage(
              translate(
                StringName.Validation_TokenRequired,
                undefined,
                validationLanguage,
              ),
            )
            .matches(
              new RegExp(`^[a-f0-9]{${AppConstants.EmailTokenLength * 2}}$`),
            )
            .withMessage(
              translate(
                StringName.Validation_InvalidToken,
                undefined,
                validationLanguage,
              ),
            ),
          body('signature')
            .not()
            .isEmpty()
            .withMessage(translate(StringName.Validation_InvalidSignature))
            .matches(
              new RegExp(
                `^[a-f0-9]{${AppConstants.ECIES.SIGNATURE_SIZE * 2}}$`,
              ),
            )
            .withMessage(StringName.Validation_InvalidSignature),
          body().custom((value, { req }) => {
            if (!req.body.username && !req.body.email) {
              throw new UsernameOrEmailRequiredError();
            }
            return true;
          }),
          body('username')
            .optional()
            .matches(AppConstants.UsernameRegex)
            .withMessage(
              translate(
                StringName.Validation_UsernameRegexErrorTemplate,
                undefined,
                validationLanguage,
              ),
            ),
          body('email')
            .optional()
            .isEmail()
            .withMessage(
              translate(
                StringName.Validation_InvalidEmail,
                undefined,
                validationLanguage,
              ),
            ),
        ],
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
    ];
  }

  /**
   * Send the verify token response after authenticateToken middleware
   * @param req - Request
   */
  public tokenVerifiedResponse: ApiRequestHandler<
    IApiRequestUserResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<
    IStatusCodeResponse<IApiRequestUserResponse | ApiErrorResponse>
  > => {
    // If we've reached this point, the token is valid
    if (!req.user) {
      throw new HandleableError(translate(StringName.Common_NoUserOnRequest), {
        statusCode: 401,
      });
    }
    return {
      statusCode: 200,
      response: {
        message: translate(StringName.Validation_TokenValid),
        user: req.user,
      },
    };
  };

  /**
   * Refresh the JWT token
   * @param req - Request
   */
  private refreshToken: ApiRequestHandler<
    IApiLoginResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>> => {
    const token = findAuthToken(req.headers);
    if (!token) {
      throw new GenericValidationError(
        translate(StringName.Validation_TokenMissing),
      );
    }

    const tokenUser = await this.jwtService.verifyToken(token);
    if (!tokenUser) {
      throw new GenericValidationError(
        translate(StringName.Validation_TokenInvalid),
      );
    }

    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    const userDoc = await UserModel.findById(tokenUser.userId, {
      password: 0,
    });
    if (!userDoc || userDoc.accountStatus !== AccountStatus.Active) {
      throw new GenericValidationError(
        translate(StringName.Validation_UserNotFound),
      );
    }
    const { token: newToken, roles } = await this.jwtService.signToken(
      userDoc,
      this.application.environment.jwtSecret,
      (req.user?.siteLanguage as StringLanguage) ??
        GlobalActiveContext.language,
    );

    return {
      statusCode: 200,
      response: {
        message: translate(StringName.TokenRefreshed),
        user: RequestUserService.makeRequestUserDTO(userDoc, roles),
        token: newToken,
        serverPublicKey: this.application.environment.systemPublicKeyHex ?? '',
      },
      headers: {
        Authorization: `Bearer ${newToken}`,
      },
    };
  };

  /**
   * Register a new user
   * @param req - Request
   */
  public register: ApiRequestHandler<
    IApiRegistrationResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<
    IStatusCodeResponse<IApiRegistrationResponse | ApiErrorResponse>
  > => {
        return await requireValidatedFieldsAsync<
          typeof RegisterSchema,
          IStatusCodeResponse<IApiRegistrationResponse | ApiErrorResponse>
        >(
          req,
          RegisterSchema,
          async ({ username, email, timezone, password }) => {
            if (
              !isString(username) ||
              !isString(email) ||
              !isString(timezone)
            ) {
              throw new GenericValidationError(
                translate(StringName.Validation_MissingValidatedData),
              );
            }
            if (password !== undefined && !isString(password)) {
              throw new GenericValidationError(
                translate(StringName.Validation_MissingValidatedData),
              );
            }
            // create a user id to be used for the new user's id and created/updated by
            const { user, mnemonic, backupCodes } =
              await this.userService.newUser(
                this.systemUser,
                {
                  username: username.trim(),
                  email: email.trim(),
                  timezone: timezone,
                },
                undefined,
                undefined,
                sess,
                this.application.environment.debug,
                password as string | undefined,
              );
            // Ensure a verification token exists (email sending disabled in tests)
            await this.userService.createAndSendEmailToken(
              user,
              EmailTokenType.AccountVerification,
              sess,
              this.application.environment.debug,
            );
            return {
              statusCode: 201,
              response: {
                message: translate(StringName.Registration_Success, {
                  MNEMONIC: mnemonic,
                }),
                mnemonic,
                backupCodes,
              },
            };
          },
        );
      }
  };

  /**
   * Verify an email token
   * @param req - Request
   */
  public completeAccountVerfication: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    if (req.validatedBody?.['token'] === undefined) {
      throw new GenericValidationError(
        translate(StringName.Validation_TokenMissing),
      );
    }
    const emailToken = Array.isArray(req.validatedBody['token'])
      ? req.validatedBody['token'][0]
      : req.validatedBody['token'];

    if (
      typeof emailToken !== 'string' ||
      emailToken.length !== AppConstants.EmailTokenLength * 2
    ) {
      throw new GenericValidationError(
        translate(StringName.Validation_InvalidToken),
      );
    }

    return await withTransaction<
      IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>
    >(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        await this.userService.verifyAccountTokenAndComplete(emailToken, sess);

        return {
          statusCode: 200,
          response: {
            message: translate(StringName.EmailVerification_Success),
          },
        };
      },
      {
        // Registration performs multiple DB writes + crypto; allow more time
        timeoutMs: this.application.environment.mongo.transactionTimeout * 30,
      },
    );
  };

  /**
   * Resend the verification email
   * @param req - Request
   */
  public resendVerification: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return await withTransaction<
      IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>
    >(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { username, email } = req.validatedBody!;

        // Find the user
        const UserModel = this.application.getModel<IUserDocument>(
          ModelName.User,
        );
        let query: { username?: string; email?: string } = {};
        if (isString(username)) query.username = username;
        else if (isString(email)) query.email = email;
        else {
          throw new GenericValidationError(
            translate(StringName.Validation_MissingValidatedData),
          );
        }
        const user = await UserModel.findOne(query).session(sess ?? null);
        if (!user) {
          throw new GenericValidationError(
            translate(StringName.Validation_UserNotFound),
            { statusCode: 404 },
          );
        }

        // Resend the email token
        await this.userService.resendEmailToken(
          user._id.toString(),
          EmailTokenType.AccountVerification,
          sess,
          this.application.environment.debug,
        );

        return {
          statusCode: 200,
          response: {
            message: translate(StringName.EmailVerification_Resent),
          },
        };
      },
      {
        // Email verification updates user, deletes token; allow extra time in CI
        timeoutMs: this.application.environment.mongo.transactionTimeout * 10,
      },
    );
  };

  /**
   * Set the user's language
   * @param req The request
   * @returns void
   */
  public setLanguage: ApiRequestHandler<
    IApiRequestUserResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<
    IStatusCodeResponse<IApiRequestUserResponse | ApiErrorResponse>
  > => {
    return await withTransaction<
      IStatusCodeResponse<IApiRequestUserResponse | ApiErrorResponse>
    >(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { language } = req.validatedBody!;
        if (!req.user) {
          throw new HandleableError(
            translate(StringName.Common_NoUserOnRequest),
            {
              statusCode: 401,
            },
          );
        }
        const userId = req.user.id;
        if (
          !isString(language) ||
          !Object.values(StringLanguage).includes(
            language as unknown as StringLanguage,
          )
        ) {
          throw new GenericValidationError(
            translate(StringName.Validation_InvalidLanguage),
          );
        }
        const user = await this.userService.updateSiteLanguage(
          userId,
          language as StringLanguage,
          sess,
        );
        return {
          statusCode: 200,
          response: {
            message: translate(StringName.LanguageUpdate_Success),
            user,
          },
        };
      },
      {
        // Resend just finds token and updates lastSent; modest bump
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  };

  /**
   * Change user's password
   * @param req The request
   * @returns Success message or error
   */
  public changePassword: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return await withTransaction<
      IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>
    >(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { currentPassword, newPassword } = req.validatedBody!;
        if (!req.user) {
          throw new HandleableError(
            translate(StringName.Common_NoUserOnRequest),
            { statusCode: 401 },
          );
        }

        if (!isString(currentPassword) || !isString(newPassword)) {
          throw new GenericValidationError(
            translate(StringName.Validation_MissingValidatedData),
          );
        }
        await this.userService.changePassword(
          req.user.id,
          currentPassword,
          newPassword,
          sess,
        );

        return {
          statusCode: 200,
          response: {
            message: 'Password changed successfully',
          },
        };
      },
      {
        // Simple update but includes key ops; give cushion
        timeoutMs: this.application.environment.mongo.transactionTimeout * 10,
      },
    );
  };

  /**
   * Send forgot password email
   * @param req The request
   * @returns Success message or error
   */
  public forgotPassword: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return await withTransaction<
      IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>
    >(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { email } = req.validatedBody!;

        const UserModel = this.application.getModel<IUserDocument>(
          ModelName.User,
        );
        if (!isString(email)) {
          throw new GenericValidationError(
            translate(StringName.Validation_MissingValidatedData),
          );
        }
        const user = await UserModel.findOne({
          email: email.toLowerCase(),
        }).session(sess ?? null);

        if (!user || !user.passwordWrappedPrivateKey) {
          // Don't reveal if user exists or not
          return {
            statusCode: 200,
            response: {
              message: translate(StringName.PasswordReset_Success),
            },
          };
        }

        await this.userService.createAndSendEmailToken(
          user,
          EmailTokenType.PasswordReset,
          sess,
          this.application.environment.debug,
        );

        return {
          statusCode: 200,
          response: {
            message: translate(StringName.PasswordReset_Success),
          },
        };
      },
      {
        // Token creation + email send (disabled in tests) but still IO; bump
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  };

  /**
   * Verify reset token
   * @param req The request
   * @returns Success message or error
   */
  public verifyResetToken: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    const token = req.query['token'] as string;
    if (!token) {
      throw new GenericValidationError(
        translate(StringName.Validation_TokenMissing),
      );
    }

    return await withTransaction<
      IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>
    >(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        await this.userService.verifyEmailToken(
          token,
          EmailTokenType.PasswordReset,
          sess,
        );

        return {
          statusCode: 200,
          response: {
            message: 'Token is valid',
          },
        };
      },
      {
        // Token lookup only; small bump
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  };

  /**
   * Reset password using token
   * @param req The request
   * @returns Success message or error
   */
  public resetPassword: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return await withTransaction<
      IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>
    >(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { token, newPassword, password, currentPassword, mnemonic } =
          req.validatedBody! as Record<string, unknown>;
        const selectedNewPassword = (newPassword ?? password) as
          | string
          | undefined;
        if (!isString(token) || !isString(selectedNewPassword)) {
          throw new GenericValidationError(
            translate(StringName.Validation_MissingValidatedData),
          );
        }
        // Require either currentPassword or mnemonic
        const credential =
          (mnemonic as string | undefined) ??
          (currentPassword as string | undefined);
        if (!isString(credential)) {
          throw new GenericValidationError(
            translate(StringName.Validation_MissingValidatedData),
          );
        }

        await this.userService.resetPasswordWithToken(
          token as string,
          selectedNewPassword,
          credential,
          sess,
        );

        return {
          statusCode: 200,
          response: {
            message: translate(StringName.PasswordChange_Success),
          },
        };
      },
      {
        // Reset wraps keys and writes user + deletes token; allow extra time
        timeoutMs: this.application.environment.mongo.transactionTimeout * 10,
      },
    );
  };

  /**
   * Recover the user's mnemonic given a logged in user and a password
   * @param req The request
   * @returns The response containing the user's mnemonic
   */
  public recoverMnemonic: ApiRequestHandler<
    IApiMnemonicResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMnemonicResponse | ApiErrorResponse>> => {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        if (!req.user) {
          throw new HandleableError(
            translate(StringName.Validation_InvalidCredentials),
            {
              statusCode: 401,
            },
          );
        } else if (!req.burnbagUser) {
          throw new HandleableError(
            translate(StringName.Validation_MnemonicOrPasswordRequired),
            {
              statusCode: 401,
            },
          );
        }
        const { password } = req.validatedBody! as Record<string, unknown>;
        if (!isString(password)) {
          throw new GenericValidationError(
            translate(StringName.Validation_MissingValidatedData),
          );
        }

        const userDoc = await this.userService.findUserById(
          new Types.ObjectId(req.user.id),
          true,
          sess,
        );
        const mnemonic = await this.userService.recoverMnemonic(
          req.burnbagUser,
          userDoc.mnemonicRecovery,
        );

        return {
          statusCode: 200,
          response: {
            message: translate(StringName.MnemonicRecovery_Success),
            mnemonic: mnemonic.notNullValue,
          },
        };
      },
      {
        // Recovery wraps keys and writes user; allow extra time
        timeoutMs: this.application.environment.mongo.transactionTimeout * 10,
      },
    );
  };

  /**
   * Log in a user and optionally set/reset their password using a backup code
   * @param req The Request
   * @returns The response containing the user's information
   */
  public useBackupCodeLogin: ApiRequestHandler<
    IApiLoginResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>> => {
    return await withTransaction<
      IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>
    >(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        return await requireOneOfValidatedFieldsAsync(
          req,
          ['email', 'username'],
          async () => {
            const { code, newPassword } = req.validatedBody! as Record<
              string,
              unknown
            >;
            if (!code) {
              throw new GenericValidationError(
                translate(StringName.Validation_MissingValidatedData),
              );
            }
            const recoverMnemonic =
              req.validatedBody?.['recoverMnemonic'] === 'true' ||
              req.validatedBody?.['recoverMnemonic'] === true;
            const userDoc = await this.userService.findUser(
              req.validatedBody?.['email'] as string,
              req.validatedBody?.['username'] as string,
              sess,
            );
            const {
              user,
              userDoc: updatedUserDoc,
              codeCount,
            } = await this.backupCodeService.recoverKeyWithBackupCode(
              userDoc,
              code as string,
              newPassword ? new SecureString(newPassword as string) : undefined,
              sess,
            );
            let mnemonic: SecureString | undefined;
            if (recoverMnemonic) {
              // Create a fresh BurnbagMember for mnemonic recovery to avoid disposed keys
              const memberType = await this.roleService.getMemberType(
                updatedUserDoc,
                sess,
              );
              const freshUser = new BrightChainMember(
                this.eciesService,
                memberType,
                updatedUserDoc.username,
                new EmailString(updatedUserDoc.email),
                Buffer.from(updatedUserDoc.publicKey, 'hex'),
                user.privateKey,
                undefined,
                updatedUserDoc._id,
                new Date(updatedUserDoc.createdAt),
                new Date(updatedUserDoc.updatedAt),
              );
              mnemonic = await this.userService.recoverMnemonic(
                freshUser,
                updatedUserDoc.mnemonicRecovery,
              );
            }
            const { token, roles } = await this.jwtService.signToken(
              userDoc,
              this.application.environment.jwtSecret,
              (req.user?.siteLanguage as StringLanguage) ??
                GlobalActiveContext.language,
            );

            // Update lastLogin immediately but outside the transaction context to avoid write conflicts
            this.userService
              .updateLastLogin(updatedUserDoc._id)
              .catch((err: Error) => {
                console.error(
                  translate(
                    StringName.Error_FailedToUpdateLastLoginTemplate,
                    { userId: userDoc._id.toString() },
                    undefined,
                    'admin',
                  ),
                  err,
                );
              });

            return {
              statusCode: 200,
              response: {
                user: RequestUserService.makeRequestUserDTO(userDoc, roles),
                token: token,
                message: translate(StringName.BackupCodeRecovery_Success),
                codeCount,
                ...(recoverMnemonic && mnemonic
                  ? { mnemonic: mnemonic.value }
                  : {}),
                serverPublicKey:
                  this.application.environment.systemPublicKeyHex ?? '',
              },
            };
          },
        );
      },
    );
  };

  /**
   * Generates new backup codes for a user
   * @param req The request, with user credentials
   * @returns The backup code response
   */
  public resetBackupCodes: ApiRequestHandler<
    IApiBackupCodesResponse | IApiErrorResponse
  > = async (req) => {
    if (!req.user) {
      throw new InvalidCredentialsError();
    }
    if (!req.burnbagUser) {
      throw new InvalidCredentialsError();
    }
    if (!req.burnbagUser.hasPrivateKey) {
      throw new PrivateKeyRequiredError();
    }
    const newBackupCodes = await this.userService.resetUserBackupCodes(
      req.burnbagUser,
      this.systemUser,
    );
    const codes = newBackupCodes.map((c) => c.notNullValue);
    newBackupCodes.forEach((c) => c.dispose());

    return {
      statusCode: 200,
      response: {
        message: translate(StringName.BackupCodeRecovery_YourNewCodes),
        backupCodes: codes,
      },
    };
  };

  /**
   * Gets the number of backup codes the user has remaining
   * @param req The request
   * @returns A response containing the backup code count
   */
  public getBackupCodeCount: ApiRequestHandler<
    IApiCodeCountResponse | IApiErrorResponse
  > = async (req) => {
    if (!req.user) {
      throw new InvalidCredentialsError();
    }
    const userDoc = await this.userService.findUserById(
      new ObjectId(req.user.id),
      true,
    );
    const codeCount = userDoc.backupCodes.length;
    return {
      statusCode: 200,
      response: {
        message: translate(
          StringName.BackupCodeRecovery_CodesRemainingTemplate,
          { count: codeCount },
        ),
        codeCount,
      },
    };
  };

  /**
   * Test crypto operations with re-authentication
   * @param req The request
   * @returns Success message or error
   */
  public testCrypto: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse> =
    async (
      req: Request,
    ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
      // TODO: Implement crypto testing once type declarations are working
      if (!req.user) {
        throw new InvalidCredentialsError();
      }
      if (!req.burnbagUser) {
        throw new InvalidCredentialsError();
      }
      if (!req.burnbagUser.hasPrivateKey) {
        throw new PrivateKeyRequiredError();
      }
      return {
        statusCode: 200,
        response: {
          message: 'Crypto test endpoint - implementation pending',
        },
      };
    };

  /**
   * Sends an email login token to the user for added security
   * @param req The request, with user credentials
   * @returns The email login token response
   */
  public requestEmailLogin: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return await withTransaction<
      IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>
    >(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        return await requireOneOfValidatedFieldsAsync<
          IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>
        >(req, ['email', 'username'], async () => {
          const { username, email } = req.validatedBody!;

          try {
            const userDoc = await this.userService.findUser(
              email as string,
              username as string,
              sess,
            );
            await this.userService.createAndSendEmailToken(
              userDoc,
              EmailTokenType.LoginRequest,
              sess,
              this.application.environment.debug,
            );
          } catch {}
          // Always return success even if user not found
          return {
            statusCode: 200,
            response: {
              message: translate(StringName.Email_TokenSent),
            },
          };
        });
      },
      {
        // Email token creation can have conflicts; moderate retries
        retryAttempts: 3,
        timeoutMs: this.application.environment.mongo.transactionTimeout * 2,
      },
    );
  };

  /**
   * Generate an encrypted challenge for client-side authentication
   * @param req - Request
   */
  public emailLoginChallenge: ApiRequestHandler<
    IApiLoginResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>> => {
    return await requireValidatedFieldsAsync<
      typeof EmailLoginChallengeSchema,
      IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>
    >(
      req,
      EmailLoginChallengeSchema,
      async ({ token, signature, email, username }) => {
        return await requireOneOfValidatedFieldsAsync<
          IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>
        >(req, ['email', 'username'], async () => {
          return await withTransaction<
            IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>
          >(
            this.application.db.connection,
            this.application.environment.mongo.useTransactions,
            undefined,
            async (sess) => {
              let identifier: string | undefined;
              if (isString(username)) identifier = username;
              else if (isString(email)) identifier = email;
              if (!identifier) {
                throw new GenericValidationError(
                  translate(StringName.Validation_MissingValidatedData),
                );
              }

              const userDoc =
                await this.userService.validateEmailLoginTokenChallenge(
                  String(token) ?? '',
                  (String(signature) ?? '') as SignatureString,
                  sess,
                );

              const { token: jwtToken, roles } =
                await this.jwtService.signToken(
                  userDoc,
                  this.application.environment.jwtSecret,
                  (req.user?.siteLanguage as StringLanguage) ??
                    GlobalActiveContext.language,
                );

              return {
                statusCode: 200,
                response: {
                  user: RequestUserService.makeRequestUserDTO(userDoc, roles),
                  token: jwtToken,
                  serverPublicKey:
                    this.application.environment.systemPublicKeyHex ?? '',
                  message: translate(StringName.LoggedIn_Success),
                },
              };
            },
            {
              timeoutMs: this.application.environment.mongo.transactionTimeout,
            },
          );
        });
      },
    );
  };

  /**
   * Produces a login challenge nonce for client-side authentication
   * @returns The challenge response
   */
  public requestDirectLogin: ApiRequestHandler<
    IApiChallengeResponse | ApiErrorResponse
  > = async (): Promise<
    IStatusCodeResponse<IApiChallengeResponse | ApiErrorResponse>
  > => {
    const challenge = this.userService.generateDirectLoginChallenge();
    return {
      statusCode: 200,
      response: {
        challenge: challenge,
        message: translate(StringName.Login_ChallengeGenerated),
        serverPublicKey: this.application.environment.systemPublicKeyHex ?? '',
      },
    };
  };

  public directLoginChallenge: ApiRequestHandler<
    IApiLoginResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>> => {
    return await requireValidatedFieldsAsync<
      typeof DirectLoginChallengeSchema,
      IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>
    >(
      req,
      DirectLoginChallengeSchema,
      async ({ username, email, challenge, signature }) => {
        return await requireOneOfValidatedFieldsAsync<
          IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>
        >(req, ['email', 'username'], async () => {
          return await withTransaction<
            IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>
          >(
            this.application.db.connection,
            this.application.environment.mongo.useTransactions,
            undefined,
            async (sess) => {
              const { userDoc } =
                await this.userService.verifyDirectLoginChallenge(
                  String(challenge),
                  String(signature) as SignatureString,
                  username ? String(username) : undefined,
                  email ? String(email) : undefined,
                  sess,
                );

              const { token: jwtToken, roles } =
                await this.jwtService.signToken(
                  userDoc,
                  this.application.environment.jwtSecret,
                  (req.user?.siteLanguage as StringLanguage) ??
                    GlobalActiveContext.language,
                );

              return {
                statusCode: 200,
                response: {
                  user: RequestUserService.makeRequestUserDTO(userDoc, roles),
                  token: jwtToken,
                  serverPublicKey:
                    this.application.environment.systemPublicKeyHex ?? '',
                  message: translate(StringName.LoggedIn_Success),
                },
              };
            },
            {
              timeoutMs: this.application.environment.mongo.transactionTimeout,
            },
          );
        });
      },
    );
  };
}
