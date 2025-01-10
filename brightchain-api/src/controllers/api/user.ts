import {
  AccountStatusTypeEnum,
  ApiErrorResponse,
  ApiRequestHandler,
  HandleableError,
  IApiMessageResponse,
  ICreateUserBasics,
  ILoginResponse,
  IRequestUserResponse,
  IStatusCodeResponse,
  ITokenResponse,
  IUserDocument,
  ModelName,
  StringLanguages,
  StringNames,
  TypedHandlers,
  UserNotFoundError,
  ValidationError,
  constants,
  routeConfig,
  translate,
} from '@BrightChain/brightchain-lib';
import { MailService } from '@sendgrid/mail';
import { Request } from 'express';
import { body, query } from 'express-validator';
import moment from 'moment-timezone';
import { IApplication } from '../../interfaces/application';
import { findAuthToken } from '../../middlewares/authenticateToken';
import { JwtService } from '../../services/jwt';
import { RequestUserService } from '../../services/requestUser';
import { UserService } from '../../services/user';
import { BaseController } from '../base';

interface IUserHandlers extends TypedHandlers<any> {
  login: ApiRequestHandler<ILoginResponse | ApiErrorResponse>;
  changePassword: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  tokenVerifiedResponse: ApiRequestHandler<IRequestUserResponse>;
  refreshToken: ApiRequestHandler<ILoginResponse | ApiErrorResponse>;
  register: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  verifyEmailToken: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  resendVerification: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  forgotPassword: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  verifyResetToken: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  resetPassword: ApiRequestHandler<IRequestUserResponse | ApiErrorResponse>;
  setLanguage: ApiRequestHandler<IRequestUserResponse | ApiErrorResponse>;
}

/**
 * Controller for user-related routes
 */
export class UserController extends BaseController<any, IUserHandlers> {
  private readonly jwtService: JwtService;
  private readonly userService: UserService;
  private readonly mailService: MailService;

  constructor(application: IApplication) {
    super(application);
    this.jwtService = new JwtService(application);
    this.mailService = new MailService();
    this.userService = new UserService(application, this.mailService);
    this.handlers = {
      login: this.login,
      changePassword: this.changePassword,
      tokenVerifiedResponse: this.tokenVerifiedResponse,
      refreshToken: this.refreshToken,
      register: this.register,
      verifyEmailToken: this.verifyEmailToken,
      resendVerification: this.resendVerification,
      forgotPassword: this.forgotPassword,
      verifyResetToken: this.verifyResetToken,
      resetPassword: this.resetPassword,
      setLanguage: this.setLanguage,
    };
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig<IApiMessageResponse | ApiErrorResponse, IUserHandlers>(
        'post',
        '/change-password',
        {
          handlerKey: 'changePassword',
          useAuthentication: true,
          validation: [
            body('currentPassword')
              .notEmpty()
              .withMessage('Current password is required'),
            body('newPassword')
              .matches(constants.PASSWORD_REGEX)
              .withMessage(
                translate(StringNames.Validation_PasswordRegexErrorTemplate),
              ),
          ],
        },
      ),
      routeConfig<IApiMessageResponse | ApiErrorResponse, IUserHandlers>(
        'post',
        '/register',
        {
          handlerKey: 'register',
          validation: [
            body('username')
              .matches(constants.USERNAME_REGEX)
              .withMessage(
                translate(StringNames.Validation_UsernameRegexErrorTemplate),
              ),
            body('displayname')
              .matches(constants.USER_DISPLAY_NAME_REGEX)
              .withMessage(
                translate(StringNames.Validation_DisplayNameRegexErrorTemplate),
              ),
            body('email')
              .isEmail()
              .withMessage(translate(StringNames.Validation_InvalidEmail)),
            body('password')
              .matches(constants.PASSWORD_REGEX)
              .withMessage(
                translate(StringNames.Validation_PasswordRegexErrorTemplate),
              ),
            body('timezone')
              .optional()
              .isIn(moment.tz.names())
              .withMessage(translate(StringNames.Validation_InvalidTimezone)),
          ],
          useAuthentication: false,
        },
      ),
      routeConfig<ITokenResponse | ApiErrorResponse, IUserHandlers>(
        'post',
        '/login',
        {
          handlerKey: 'login',
          validation: [
            body().custom((value, { req }) => {
              if (!req.body.username && !req.body.email) {
                throw new Error(
                  translate(StringNames.Login_UsernameOrEmailRequired),
                );
              }
              return true;
            }),
            body('username')
              .optional()
              .matches(constants.USERNAME_REGEX)
              .withMessage(
                translate(StringNames.Validation_UsernameRegexErrorTemplate),
              ),
            body('email')
              .optional()
              .isEmail()
              .withMessage(translate(StringNames.Validation_InvalidEmail)),
            body('password')
              .matches(constants.PASSWORD_REGEX)
              .withMessage(
                translate(StringNames.Validation_PasswordRegexErrorTemplate),
              ),
          ],
          useAuthentication: false,
        },
      ),
      routeConfig<IRequestUserResponse | ApiErrorResponse, IUserHandlers>(
        'get',
        '/refresh-token',
        {
          handlerKey: 'refreshToken',
          useAuthentication: true,
        },
      ),
      routeConfig<IApiMessageResponse | ApiErrorResponse, IUserHandlers>(
        'get',
        '/verify-email',
        {
          handlerKey: 'verifyEmailToken',
          validation: [
            query('token')
              .not()
              .isEmpty()
              .withMessage(translate(StringNames.Validation_Required)),
            query('token')
              .isLength({
                min: constants.EMAIL_TOKEN_LENGTH * 2,
                max: constants.EMAIL_TOKEN_LENGTH * 2,
              })
              .withMessage(translate(StringNames.Validation_InvalidToken)),
          ],
          useAuthentication: false,
        },
      ),
      routeConfig<IRequestUserResponse, IUserHandlers>('get', '/verify', {
        handlerKey: 'tokenVerifiedResponse',
        useAuthentication: true,
      }),
      routeConfig<IApiMessageResponse | ApiErrorResponse, IUserHandlers>(
        'post',
        '/resend-verification',
        {
          handlerKey: 'resendVerification',
          validation: [
            body().custom((value, { req }) => {
              if (!req.body.username && !req.body.email) {
                throw new Error(
                  translate(StringNames.Login_UsernameOrEmailRequired),
                );
              }
              return true;
            }),
            body('username').optional().isString(),
            body('email').optional().isEmail(),
          ],
          useAuthentication: false,
        },
      ),
      routeConfig<IApiMessageResponse | ApiErrorResponse, IUserHandlers>(
        'post',
        '/forgot-password',
        {
          handlerKey: 'forgotPassword',
          validation: [
            body('email')
              .isEmail()
              .normalizeEmail()
              .withMessage(translate(StringNames.Validation_InvalidEmail)),
          ],
          useAuthentication: false,
        },
      ),
      routeConfig<IApiMessageResponse | ApiErrorResponse, IUserHandlers>(
        'get',
        '/verify-reset-token',
        {
          handlerKey: 'verifyResetToken',
          validation: [
            query('token')
              .not()
              .isEmpty()
              .withMessage(translate(StringNames.Validation_Required)),
            query('token')
              .isLength({
                min: constants.EMAIL_TOKEN_LENGTH * 2,
                max: constants.EMAIL_TOKEN_LENGTH * 2,
              })
              .withMessage(translate(StringNames.Validation_InvalidToken)),
          ],
          useAuthentication: false,
        },
      ),
      routeConfig<IRequestUserResponse | ApiErrorResponse, IUserHandlers>(
        'post',
        '/reset-password',
        {
          handlerKey: 'resetPassword',
          validation: [
            body('token').notEmpty(),
            body('password')
              .matches(constants.PASSWORD_REGEX)
              .withMessage(
                translate(StringNames.Validation_PasswordRegexErrorTemplate),
              ),
          ],
          useAuthentication: false,
        },
      ),
      routeConfig<IRequestUserResponse | ApiErrorResponse, IUserHandlers>(
        'post',
        '/language',
        {
          handlerKey: 'setLanguage',
          validation: (validationLanguage: StringLanguages) => [
            body('language')
              .isString()
              .withMessage(
                translate(
                  StringNames.Validation_InvalidLanguage,
                  validationLanguage,
                ),
              )
              .isIn(Object.values(StringLanguages))
              .withMessage(
                translate(
                  StringNames.Validation_InvalidLanguage,
                  validationLanguage,
                ),
              ),
          ],
          useAuthentication: true,
        },
      ),
    ];
  }

  /**
   * Change the user's password
   * @param req The request object
   * @returns
   */
  public changePassword: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    const { currentPassword, newPassword } = req.validatedBody;
    const userId = req.user?.id;
    if (!userId) {
      throw new HandleableError(translate(StringNames.Common_Unauthorized), {
        statusCode: 401,
      });
    }

    await this.userService.changePassword(userId, currentPassword, newPassword);
    return {
      statusCode: 200,
      response: {
        message: translate(StringNames.ChangePassword_Success),
      },
    };
  };

  /**
   * Send the verify token response after authenticateToken middleware
   * @param req The request object
   */
  public tokenVerifiedResponse: ApiRequestHandler<IRequestUserResponse> =
    async (
      req: Request,
    ): Promise<IStatusCodeResponse<IRequestUserResponse>> => {
      return {
        statusCode: 200,
        response: {
          message: translate(StringNames.Common_TokenValid),
          user: req.user,
        },
      };
    };

  /**
   * Refresh the JWT token
   * @param req The request
   * @returns
   */
  private refreshToken: ApiRequestHandler<ILoginResponse | ApiErrorResponse> =
    async (
      req: Request,
    ): Promise<IStatusCodeResponse<ILoginResponse | ApiErrorResponse>> => {
      const UserModel = this.application.getModel<IUserDocument>(
        ModelName.User,
      );
      const token = findAuthToken(req.headers);
      if (!token) {
        throw new HandleableError(
          translate(StringNames.Validation_InvalidToken),
          {
            statusCode: 422,
          },
        );
      }

      const tokenUser = await this.jwtService.verifyToken(token);

      const userDoc = await UserModel.findById(tokenUser.userId, {
        password: 0,
      });
      if (
        !userDoc ||
        userDoc.accountStatusType !== AccountStatusTypeEnum.Active
      ) {
        throw new UserNotFoundError();
      }
      const { token: newToken } = await this.jwtService.signToken(userDoc);

      return {
        statusCode: 200,
        response: {
          message: translate(StringNames.Common_TokenRefreshed),
          user: RequestUserService.makeRequestUser(userDoc),
          token: newToken,
        },
        headers: { Authorization: `Bearer ${newToken}` },
      };
    };

  /**
   * Register a new user
   * @param req The request object
   * @returns
   */
  public register: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse> =
    async (
      req: Request,
    ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
      const { username, displayname, email, password, timezone } =
        req.validatedBody;

      await this.userService.newUser(
        {
          username: username.trim(),
          usernameLower: username.toLowerCase().trim(),
          displayName: displayname.trim(),
          email: email.trim(),
          timezone: timezone,
        } as ICreateUserBasics,
        password,
      );
      return {
        statusCode: 201,
        response: {
          message: translate(StringNames.Register_Success),
        },
      };
    };

  /**
   * Log in a user
   * @param req The request object
   * @returns
   */
  public login: ApiRequestHandler<ILoginResponse | ApiErrorResponse> = async (
    req: Request,
  ): Promise<IStatusCodeResponse<ILoginResponse | ApiErrorResponse>> => {
    const { username, email, password } = req.validatedBody;

    const userDoc = await this.userService.findUser(password, email, username);

    const { token } = await this.jwtService.signToken(userDoc);

    userDoc.lastLogin = new Date();
    await userDoc.save();

    return {
      statusCode: 200,
      response: {
        message: translate(StringNames.Common_Success),
        token,
        user: RequestUserService.makeRequestUser(userDoc),
      },
    };
  };

  /**
   * Verify an email token
   * @param req The request object
   * @returns
   */
  public verifyEmailToken: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    const emailToken = Array.isArray(req.query.token)
      ? req.query.token[0]
      : req.query.token;

    if (
      typeof emailToken !== 'string' ||
      emailToken.length !== constants.EMAIL_TOKEN_LENGTH * 2
    ) {
      throw new ValidationError(translate(StringNames.Validation_InvalidToken));
    }

    await this.userService.verifyEmailTokenAndFinalize(emailToken);

    return {
      statusCode: 200,
      response: {
        message: translate(StringNames.Common_Success),
      },
    };
  };

  /**
   * Resend the verification email
   * @param req The request object
   */
  public resendVerification: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    const { username, email } = req.validatedBody;

    // Find the user
    const user = await UserModel.findOne(username ? { username } : { email });
    if (!user) {
      throw new UserNotFoundError();
    }

    // Resend the email token
    await this.userService.resendEmailToken(user._id.toString());

    return {
      statusCode: 200,
      response: {
        message: translate(StringNames.VerifyEmail_Success),
      },
    };
  };

  /**
   * Send a password reset email
   * @param req The request object
   * @returns
   */
  public forgotPassword: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    const { email } = req.validatedBody;
    const result = await this.userService.initiatePasswordReset(email);

    return {
      statusCode: result.success ? 200 : 400,
      response: { message: result.message },
    };
  };

  /**
   * Verify the password reset token
   * @param req The request object
   */
  public verifyResetToken: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    const { token } = req.query;
    await this.userService.verifyEmailToken(token as string);
    return {
      statusCode: 200,
      response: {
        message: translate(StringNames.Common_TokenValid),
      },
    };
  };

  /**
   * Reset the user's password
   * @param req The request object
   */
  public resetPassword: ApiRequestHandler<
    IRequestUserResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IRequestUserResponse | ApiErrorResponse>> => {
    const { token, password } = req.validatedBody;
    const user = await this.userService.resetPassword(token, password);

    // Generate a new JWT token for the user
    const { token: newToken } = await this.jwtService.signToken(user);
    return {
      statusCode: 200,
      response: {
        message: translate(StringNames.ResetPassword_Success),
        user: RequestUserService.makeRequestUser(user),
      },
      headers: {
        Authorization: `Bearer ${newToken}`,
      },
    };
  };

  /**
   * Set the user's language
   * @param req The request
   * @returns void
   */
  public setLanguage: ApiRequestHandler<
    IRequestUserResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IRequestUserResponse | ApiErrorResponse>> => {
    return await this.withTransaction<
      IStatusCodeResponse<IRequestUserResponse | ApiErrorResponse>
    >(async (sess) => {
      const { language } = req.validatedBody;
      const userId = req.user.id;
      if (!Object.values(StringLanguages).includes(language)) {
        throw new ValidationError(
          translate(StringNames.Validation_InvalidLanguage),
        );
      }
      const requestUser = await this.userService.updateSiteLanguage(
        userId,
        language as StringLanguages,
        sess,
      );
      return {
        statusCode: 200,
        response: {
          message: translate(StringNames.LanguageUpdate_Success),
          user: requestUser,
        },
      };
    });
  };
}
