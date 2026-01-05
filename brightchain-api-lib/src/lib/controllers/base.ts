/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any */
import { StringLanguages } from '@brightchain/brightchain-lib';
import {
  GlobalActiveContext,
  HandleableError,
} from '@digitaldefiance/i18n-lib';
import {
  ApiResponse,
  authenticateCrypto,
  authenticateToken,
  FlexibleValidationChain,
  handleError,
  RouteConfig,
  sendApiMessageResponse,
  SendFunction,
  sendRawJsonResponse,
  setGlobalContextLanguageFromRequest,
} from '@digitaldefiance/node-express-suite';
import {
  IRequestUserDTO,
  SuiteCoreStringKey as StringNames,
  getSuiteCoreTranslation as translate,
} from '@digitaldefiance/suite-core-lib';
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
import { IUserDocument } from '../documents/user';
import { ExpressValidationError } from '../errors/express-validation';
import { MissingValidatedDataError } from '../errors/missing-validated-data';
import { IApplication } from '../interfaces/application';
import { StringLanguage } from '../interfaces/request-user';

export abstract class BaseController<T extends ApiResponse, H extends object> {
  public readonly router: Router;
  private activeRequest: Request | null = null;
  private activeResponse: Response | null = null;
  public readonly application: IApplication;
  protected routeDefinitions: RouteConfig<H, StringLanguage>[] = [];
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
    route: RouteConfig<H, StringLanguage>,
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

  private getCryptoAuthenticationMiddleware(
    route: RouteConfig<H, StringLanguage>,
  ): RequestHandler[] {
    if (route.useCryptoAuthentication) {
      return [
        async (req, res, next) => {
          try {
            await authenticateCrypto(
              this.application,
              req as any,
              res as any,
              next,
            );
          } catch (err) {
            next(err);
          }
        },
      ];
    } else {
      return [];
    }
  }

  private getValidationMiddleware(
    route: RouteConfig<H, StringLanguage>,
  ): RequestHandler[] {
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
    validationFn: (lang: StringLanguage) => ValidationChain[],
  ): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validationArray = validationFn(
          GlobalActiveContext.instance.userLanguage as StringLanguage,
        );
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

  private createRequestHandler(
    config: RouteConfig<H, StringLanguage>,
  ): RequestHandler {
    return async (req: Request, res: Response<T>, next: NextFunction) => {
      this.activeRequest = req;
      this.activeResponse = res;

      if (config.useAuthentication && !this.activeRequest?.user) {
        handleError(
          new HandleableError(
            new Error(translate(StringNames.Common_Unauthorized)),
            {
              statusCode: 401,
            },
          ),
          res as any,
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

        const handlerArgs = config.handlerArgs ?? [];
        const { statusCode, response, headers } = await (handler as any)(
          req,
          ...handlerArgs,
        );
        if (headers) {
          res.set(headers);
        }
        sendFunc(statusCode, response, res as any);
      } catch (error) {
        handleError(error, res as any, sendApiMessageResponse, next);
      }
    };
  }

  /**
   * Initializes the routes for the controller.
   */
  private initializeRoutes(): void {
    Object.values(this.routeDefinitions).forEach(
      (config: RouteConfig<H, StringLanguage>) => {
        (this.router[config.method] as any)(
          config.path,
          ...[
            ...this.getAuthenticationMiddleware(config),
            setGlobalContextLanguageFromRequest,
            ...this.getValidationMiddleware(config),
            ...this.getCryptoAuthenticationMiddleware(config),
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
    route: RouteConfig<H, StringLanguage>,
    req: Request,
    res: Response<T>,
    next: NextFunction,
  ): Promise<void> {
    // Pass the real `next` function directly to the middleware.
    // It will now correctly control the request lifecycle.
    await authenticateToken(this.application, req as any, res as any, next);
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
    validationArray: FlexibleValidationChain<StringLanguage> = [],
  ): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ExpressValidationError(errors);
    }
    // Create an object with only the validated fields
    const validatedBody = matchedData(req, {
      locations: ['body'], // Only match data from request body
      includeOptionals: false, // Exclude fields that weren't validated
    });

    const language = (GlobalActiveContext.instance.userLanguage ??
      StringLanguages.EnglishUS) as StringLanguage;

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

  public get user(): IRequestUserDTO {
    if (!this.activeRequest) {
      throw new Error(translate(StringNames.Common_NoActiveRequest));
    }
    if (!this.activeRequest.user) {
      throw new Error(translate(StringNames.Common_NoUserOnRequest));
    }
    return this.activeRequest.user;
  }

  public get validatedBody(): Record<string, any> {
    if (!this.activeRequest) {
      throw new Error(translate(StringNames.Common_NoActiveRequest));
    }
    if (!this.activeRequest.validatedBody) {
      throw new MissingValidatedDataError();
    }
    return this.activeRequest.validatedBody;
  }

  public get req(): Request {
    if (!this.activeRequest) {
      throw new Error(translate(StringNames.Common_NoActiveRequest));
    }
    return this.activeRequest;
  }

  public get res(): Response {
    if (!this.activeResponse) {
      throw new Error(translate(StringNames.Common_NoActiveResponse));
    }
    return this.activeResponse;
  }

  protected async validateAndFetchRequestUser(
    req: Request,
  ): Promise<IUserDocument> {
    if (!req.user) {
      throw new HandleableError(
        new Error(translate(StringNames.Common_Unauthorized)),
        {
          statusCode: 401,
        },
      );
    }
    throw new Error('Not implemented');
  }
}
