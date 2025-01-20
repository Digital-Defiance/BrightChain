import {
  ApiErrorResponse,
  ApiResponse,
  DefaultLanguage,
  ExpressValidationError,
  FlexibleValidationChain,
  GlobalLanguageContext,
  HandleableError,
  IRequestUser,
  IUserDocument,
  ModelName,
  RouteConfig,
  SendFunction,
  StringLanguages,
  StringNames,
  TransactionCallback,
  translate,
  TypedHandlers,
  UserNotFoundError,
} from '@BrightChain/brightchain-lib';
import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';
import {
  matchedData,
  ValidationChain,
  validationResult,
} from 'express-validator';
import { IApplication } from '../interfaces/application';
import { authenticateToken } from '../middlewares/authenticateToken';
import { setGlobalContextLanguageFromRequest } from '../middlewares/setGlobalContextLanguage';
import {
  handleError,
  sendApiMessageResponse,
  sendRawJsonResponse,
} from '../utils';

export abstract class BaseController<
  T extends ApiResponse,
  H extends TypedHandlers<T>,
> {
  public readonly router: Router;
  private activeRequest: Request | null = null;
  private activeResponse: Response | null = null;
  public readonly application: IApplication;
  protected routeDefinitions: RouteConfig<T, H>[] = [];
  protected handlers: H;

  public constructor(application: IApplication) {
    this.application = application;
    this.router = Router();
    this.handlers = {} as H;
    this.initRouteDefinitions();
    this.initializeRoutes();
  }

  protected abstract initRouteDefinitions(): void;

  private getAuthenticationMiddleware(
    route: RouteConfig<T, H>,
  ): RequestHandler[] {
    if (route.useAuthentication) {
      return [
        async (req, res, next) => {
          try {
            await this.authenticateRequest(route, req, res, next);
          } catch (err) {
            next(err);
          }
        },
      ];
    } else {
      return [];
    }
  }

  private getValidationMiddleware(route: RouteConfig<T, H>): RequestHandler[] {
    if (Array.isArray(route.validation) && route.validation.length > 0) {
      return [
        ...route.validation,
        this.createValidationHandler(route.validation),
      ];
    } else if (typeof route.validation === 'function') {
      return [this.createDynamicValidationHandler(route.validation)];
    }
    return [];
  }

  private createValidationHandler(
    validation: ValidationChain[],
  ): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        this.checkRequestValidationAndThrow(req, res, next, validation);
      } catch (error) {
        next(error);
      }
    };
  }

  private createDynamicValidationHandler(
    validationFn: (lang: StringLanguages) => ValidationChain[],
  ): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validationArray = validationFn(GlobalLanguageContext.language);
        await Promise.all(validationArray.map((v) => v.run(req)));
        await this.checkRequestValidationAndThrow(
          req,
          res,
          next,
          validationArray,
        );
      } catch (error) {
        next(error);
      }
    };
  }

  private createRequestHandler(config: RouteConfig<T, H>): RequestHandler {
    return async (req: Request, res: Response<T>, next: NextFunction) => {
      this.activeRequest = req;
      this.activeResponse = res;

      if (config.useAuthentication && !this.activeRequest?.user) {
        handleError(
          new HandleableError(translate(StringNames.Common_Unauthorized), {
            statusCode: 401,
          }),
          res as Response<ApiResponse>,
          sendApiMessageResponse,
          next,
        );
        return;
      }

      try {
        const handler = this.handlers[config.handlerKey];
        const sendFunc: SendFunction<T> = config.rawJsonHandler
          ? sendRawJsonResponse.bind(this)
          : sendApiMessageResponse.bind(this);

        const { statusCode, response, headers } = await handler(
          req,
          ...(config.handlerArgs ?? []),
        );
        if (headers) {
          res.set(headers);
        }
        sendFunc(statusCode, response, res);
      } catch (error) {
        handleError(
          error,
          res as Response<ApiErrorResponse>,
          sendApiMessageResponse,
          next,
        );
      }
    };
  }

  /**
   * Initializes the routes for the controller.
   */
  private initializeRoutes(): void {
    Object.values(this.routeDefinitions).forEach(
      (config: RouteConfig<T, H>) => {
        this.router[config.method](
          config.path,
          ...[
            ...this.getAuthenticationMiddleware(config),
            setGlobalContextLanguageFromRequest,
            ...this.getValidationMiddleware(config),
            ...(config.middleware ?? []),
            this.createRequestHandler(config),
          ],
        );
      },
    );
  }

  /**
   * Authenticates the request by checking the token. Also populates the request with the user object.
   * @param route The route config
   * @param req The request object
   * @param res The response object
   * @param next The next function
   */
  protected async authenticateRequest(
    route: RouteConfig<T, H>,
    req: Request,
    res: Response<T>,
    next: NextFunction,
  ): Promise<void> {
    await authenticateToken(this.application, req, res, (err) => {
      if (err || !req.user) {
        handleError(
          new HandleableError(translate(StringNames.Common_Unauthorized), {
            statusCode: route.authFailureStatusCode ?? 401,
            cause: err,
          }),
          res as Response<ApiErrorResponse>,
          sendApiMessageResponse,
          next,
        );
        return;
      }
    });
    next();
  }

  private handleBooleanFields(
    validationArray: ValidationChain[],
    validatedBody: Record<string, any>,
  ): Record<string, any> {
    // false booleans will be missing from validatedBody, so we need to add them
    validationArray.forEach((validation: ValidationChain) => {
      const fieldChains = validation.builder.build().fields;

      fieldChains.forEach((field: string) => {
        const hasBooleanValidator = validation.builder
          .build()
          .stack.some((item: any) => {
            return (
              item.validator &&
              typeof item.validator === 'function' &&
              item.validator.name === 'isBoolean' &&
              !item.negated
            );
          });

        // If the field has a boolean validator and it's not in the validated body, add it
        if (hasBooleanValidator && !(field in validatedBody)) {
          validatedBody[field] = false;
        }
      });
    });
    return validatedBody;
  }

  /**
   * If express-validator flagged any errors, throw an error.
   * @param req The request object
   * @param res The response object
   * @param next The next function
   * @param validationArray An array of express validation chains that were applied to the request.
   * @returns
   */
  protected checkRequestValidationAndThrow(
    req: Request,
    res: Response,
    next: NextFunction,
    validationArray: FlexibleValidationChain = [],
  ): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      handleError(
        new ExpressValidationError(errors),
        res,
        sendApiMessageResponse,
        next,
      );
      return;
    }
    // Create an object with only the validated fields
    const validatedBody = matchedData(req, {
      locations: ['body'], // Only match data from request body
      includeOptionals: false, // Exclude fields that weren't validated
    });

    const language = GlobalLanguageContext.language ?? DefaultLanguage;

    // If validationArray is a function, call it with the language
    const valArray =
      typeof validationArray === 'function'
        ? validationArray(language)
        : validationArray;

    // false booleans will be missing from validatedBody, so we need to add them
    // Attach the validated fields to the request object
    req.validatedBody = this.handleBooleanFields(valArray, validatedBody);

    next();
  }

  public get user(): IRequestUser {
    if (!this.activeRequest) {
      throw new Error('No active request');
    }
    if (!this.activeRequest.user) {
      throw new Error('No user on request');
    }
    return this.activeRequest.user;
  }

  public get validatedBody(): Record<string, any> {
    if (!this.activeRequest) {
      throw new Error('No active request');
    }
    if (!this.activeRequest.validatedBody) {
      throw new Error('No validated body on request');
    }
    return this.activeRequest.validatedBody;
  }

  public get req(): Request {
    if (!this.activeRequest) {
      throw new Error('No active request');
    }
    return this.activeRequest;
  }

  public get res(): Response {
    if (!this.activeResponse) {
      throw new Error('No active response');
    }
    return this.activeResponse;
  }

  protected async validateAndFetchRequestUser(
    req: Request,
  ): Promise<IUserDocument> {
    const UserModel = this.application.getModel<IUserDocument>(ModelName.User);
    if (!req.user) {
      throw new HandleableError(translate(StringNames.Common_Unauthorized), {
        statusCode: 401,
      });
    }
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }

  public async withTransaction<T>(
    callback: TransactionCallback<T>,
    session?: ClientSession,
    ...args: any
  ) {
    return await utilsWithTransaction<T>(
      this.application.db.connection,
      this.application.useTransactions,
      session,
      callback,
      ...args,
    );
  }
}
