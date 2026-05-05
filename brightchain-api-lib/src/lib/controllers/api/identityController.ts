/**
 * IdentityController — REST API for BrightChain identity retrieval.
 *
 * Routes:
 *   GET /me   — Return the authenticated user's BrightChain identity descriptor
 *
 * The response contains only public, non-sensitive fields (id, displayName,
 * email, publicKeyHex) via {@link BrightChainIdentity.describe}.
 */

import { BrightChainIdentity } from '@brightchain/brightchain-identity';
import { MemberStore } from '@brightchain/brightchain-lib';
import { IIdProvider } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { IRequestUser } from '../../interfaces/request-user';
import {
  IApiIdentityResponse,
  IStatusCodeResponse,
} from '../../interfaces/responses';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

// ─── Response union ─────────────────────────────────────────────────────────

type IdentityApiResponse = IApiIdentityResponse | ApiErrorResponse;

// ─── Handler map ────────────────────────────────────────────────────────────

interface IIdentityHandlers extends TypedHandlers {
  getMyIdentity: ApiRequestHandler<IdentityApiResponse>;
}

// ─── Request shape ───────────────────────────────────────────────────────────

interface IIdentityRequest {
  user?: IRequestUser<string>;
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * Controller for BrightChain identity endpoints.
 *
 * Wraps {@link BrightChainIdentity.describe} so that authenticated clients
 * can retrieve their own public identity descriptor over HTTP.
 *
 * @requirements Step 2 – Wire BrightChainIdentity into express-suite
 */
export class IdentityController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IdentityApiResponse,
  IIdentityHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/me', {
        handlerKey: 'getMyIdentity',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get own BrightChain identity',
          description:
            'Returns the public identity descriptor for the authenticated member: ' +
            'id (hex), displayName, email, and compressed secp256k1 publicKeyHex.',
          tags: ['Identity'],
          responses: {
            200: {
              schema: 'IdentityResponse',
              description: 'Identity descriptor for the authenticated user',
            },
            401: { description: 'No authenticated user on request' },
            404: { description: 'Member not found in MemberStore' },
            500: { description: 'Internal server error' },
          },
        },
      }),
    ];
    this.handlers = {
      getMyIdentity: this.handleGetMyIdentity.bind(this),
    };
  }

  private async handleGetMyIdentity(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: any,
  ): Promise<IStatusCodeResponse<IdentityApiResponse>> {
    const request = req as IIdentityRequest;
    const user = request.user;

    if (!user) {
      return {
        statusCode: 401,
        response: { message: 'Unauthorized', error: 'UNAUTHORIZED' },
      };
    }

    const memberId = user.id;
    if (!memberId) {
      return {
        statusCode: 401,
        response: { message: 'No member ID on request', error: 'NO_MEMBER_ID' },
      };
    }

    try {
      // Resolve idProvider from the service container (same pattern as members.ts)
      const idProvider = this.application.services.get(
        'idProvider',
      ) as IIdProvider<TID> | undefined;
      if (!idProvider) {
        return {
          statusCode: 500,
          response: {
            message: 'ID provider service not available',
            error: 'ID_PROVIDER_UNAVAILABLE',
          },
        };
      }

      const parsedId = idProvider.parseSafe(memberId);
      if (parsedId === undefined || parsedId === null) {
        return {
          statusCode: 400,
          response: {
            message: 'Invalid member ID format',
            error: 'INVALID_ID',
          },
        };
      }

      const typedId = idProvider.idFromString(memberId) as TID;

      const memberStore =
        this.application.services.get<MemberStore<TID>>('memberStore');
      if (!memberStore) {
        return {
          statusCode: 500,
          response: {
            message: 'MemberStore service not available',
            error: 'MEMBERSTORE_UNAVAILABLE',
          },
        };
      }

      const member = await memberStore.getMember(typedId);

      const identity = BrightChainIdentity.describe(member);

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          id: idProvider.toString(identity.id, 'hex'),
          displayName: identity.displayName,
          email: identity.email,
          publicKeyHex: identity.publicKeyHex,
        } as IApiIdentityResponse,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected error';
      return {
        statusCode: 500,
        response: { message, error: message },
      };
    }
  }
}
