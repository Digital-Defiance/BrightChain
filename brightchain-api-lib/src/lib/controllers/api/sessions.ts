import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import * as jwt from 'jsonwebtoken';
import { IBrightChainApplication } from '../../interfaces/application';
import { ITokenPayload } from '../../interfaces/token-payload';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

interface ISessionsHandlers extends TypedHandlers {
  getSessions: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

/**
 * Controller for session operations
 */
export class SessionsController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IApiMessageResponse | ApiErrorResponse,
  ISessionsHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.handlers = {
      getSessions: this.handleGetSessions.bind(this),
    };
  }

  /**
   * Extract the JWT token from the authorization header.
   * Supports "Bearer <token>" format or raw token.
   */
  private extractToken(authorization: string): string | null {
    if (!authorization) {
      return null;
    }
    if (authorization.startsWith('Bearer ')) {
      return authorization.slice(7);
    }
    return authorization;
  }

  /**
   * Get the authenticated member from the session/authorization header.
   * Parses the JWT token, verifies it, and returns a minimal Member-like object
   * with the member ID from the token.
   *
   * @param authorization - The Authorization header value (e.g., "Bearer <token>")
   * @returns An object with the member id, or null if authentication fails
   */
  public getMemberFromSession(
    authorization: string,
  ): { id: { toString(): string } } | null {
    const token = this.extractToken(authorization);
    if (!token) {
      return null;
    }

    try {
      // Get JWT secret from environment
      const jwtSecret = this.application.environment.jwtSecret;
      if (!jwtSecret) {
        console.error('[SessionsController] JWT secret not configured');
        return null;
      }

      // Verify and decode the token
      const decoded = jwt.verify(token, jwtSecret) as ITokenPayload;
      if (!decoded.memberId) {
        return null;
      }

      // Return a minimal object with the member ID
      // The full Member can be fetched asynchronously if needed
      return {
        id: {
          toString: () => decoded.memberId,
        },
      };
    } catch (error) {
      // Token verification failed (expired, invalid signature, etc.)
      if (error instanceof jwt.TokenExpiredError) {
        console.debug('[SessionsController] Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.debug('[SessionsController] Invalid token');
      } else {
        console.error('[SessionsController] Error verifying token:', error);
      }
      return null;
    }
  }

  private async handleGetSessions(
    _req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    return {
      statusCode: 200,
      response: {
        message: 'Sessions not implemented yet',
      },
    };
  }
}
