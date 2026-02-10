/**
 * DirectoryController — REST API for the public key directory.
 *
 * Routes:
 *   GET  /search              — Search the public key directory
 *   GET  /profile/:memberId   — Get a member's public profile
 *   PUT  /profile              — Create or update a public profile
 *   POST /profile/:memberId/privacy — Toggle privacy mode
 *
 * Requirements: 5.1-5.10
 */

import { ProofPlatform } from '@brightchain/brightchain-lib/lib/enumerations/proofPlatform';
import type { IPublicProfile } from '@brightchain/brightchain-lib/lib/interfaces/identity/publicProfile';
import type {
  IGetProfileResponse,
  ISearchDirectoryResponse,
  ITogglePrivacyResponse,
  IUpdateProfileResponse,
} from '@brightchain/brightchain-lib/lib/interfaces/responses/directoryResponses';
import {
  InvalidProfileError,
  ProfileNotFoundError,
  PublicKeyDirectoryService,
} from '@brightchain/brightchain-lib/lib/services/identity';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

// ─── Response union ─────────────────────────────────────────────────────────

type DirectoryApiResponse =
  | ISearchDirectoryResponse
  | IGetProfileResponse
  | IUpdateProfileResponse
  | ITogglePrivacyResponse
  | ApiErrorResponse;

// ─── Handler map ────────────────────────────────────────────────────────────

interface DirectoryHandlers extends TypedHandlers {
  searchDirectory: ApiRequestHandler<
    ISearchDirectoryResponse | ApiErrorResponse
  >;
  getProfile: ApiRequestHandler<IGetProfileResponse | ApiErrorResponse>;
  updateProfile: ApiRequestHandler<IUpdateProfileResponse | ApiErrorResponse>;
  togglePrivacy: ApiRequestHandler<ITogglePrivacyResponse | ApiErrorResponse>;
}

// ─── Request shape interfaces ───────────────────────────────────────────────

interface SearchQuery {
  query: {
    q?: string;
    limit?: string;
    offset?: string;
    platformFilter?: string;
  };
}

interface MemberIdParams {
  params: { memberId: string };
}

interface UpdateProfileBody {
  body: IPublicProfile;
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Controller for the public key directory.
 *
 * Delegates to {@link PublicKeyDirectoryService} in brightchain-lib for
 * search, profile management, and privacy mode toggling.
 *
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10
 */
export class DirectoryController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  DirectoryApiResponse,
  DirectoryHandlers,
  CoreLanguageCode
> {
  private directoryService: PublicKeyDirectoryService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the directory service instance.
   * Must be called during application initialisation before handling requests.
   */
  public setDirectoryService(service: PublicKeyDirectoryService): void {
    this.directoryService = service;
  }

  private getDirectoryService(): PublicKeyDirectoryService {
    if (!this.directoryService) {
      throw new Error('PublicKeyDirectoryService not initialized');
    }
    return this.directoryService;
  }

  // ─── Route definitions ──────────────────────────────────────────────────

  protected initRouteDefinitions(): void {
    const noAuth = {
      useAuthentication: false,
      useCryptoAuthentication: false,
    };

    this.routeDefinitions = [
      routeConfig('get', '/search', {
        ...noAuth,
        handlerKey: 'searchDirectory',
        openapi: {
          summary: 'Search the public key directory',
          description:
            'Searches profiles by display name, social username, or member ID with relevance ranking and pagination.',
          tags: ['Directory'],
          responses: {
            200: {
              schema: 'SearchDirectoryResponse',
              description: 'Search results',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Missing search query',
            },
          },
        },
      }),
      routeConfig('get', '/profile/:memberId', {
        ...noAuth,
        handlerKey: 'getProfile',
        openapi: {
          summary: 'Get a member public profile',
          description:
            'Returns the public profile for a member by ID, regardless of privacy mode.',
          tags: ['Directory'],
          responses: {
            200: {
              schema: 'GetProfileResponse',
              description: 'Profile found',
            },
            404: {
              schema: 'ApiErrorResponse',
              description: 'Profile not found',
            },
          },
        },
      }),
      routeConfig('put', '/profile', {
        ...noAuth,
        handlerKey: 'updateProfile',
        openapi: {
          summary: 'Create or update a public profile',
          description:
            'Adds a new profile or updates an existing one in the directory.',
          tags: ['Directory'],
          responses: {
            200: {
              schema: 'UpdateProfileResponse',
              description: 'Profile updated',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Invalid profile data',
            },
          },
        },
      }),
      routeConfig('post', '/profile/:memberId/privacy', {
        ...noAuth,
        handlerKey: 'togglePrivacy',
        openapi: {
          summary: 'Toggle privacy mode for a profile',
          description:
            'Toggles whether a profile appears in directory search results.',
          tags: ['Directory'],
          responses: {
            200: {
              schema: 'TogglePrivacyResponse',
              description: 'Privacy mode toggled',
            },
            404: {
              schema: 'ApiErrorResponse',
              description: 'Profile not found',
            },
          },
        },
      }),
    ];

    this.handlers = {
      searchDirectory: this.handleSearch.bind(this),
      getProfile: this.handleGetProfile.bind(this),
      updateProfile: this.handleUpdateProfile.bind(this),
      togglePrivacy: this.handleTogglePrivacy.bind(this),
    };
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /**
   * GET /search — Search the public key directory.
   *
   * Query params: q (required), limit, offset, platformFilter
   *
   * @requirements 5.2, 5.3, 5.5, 5.9, 5.10
   */
  private async handleSearch(req: unknown): Promise<{
    statusCode: number;
    response: ISearchDirectoryResponse | ApiErrorResponse;
  }> {
    try {
      const { q, limit, offset, platformFilter } = (req as SearchQuery).query;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return validationError('Missing required query parameter: q');
      }

      // Validate platformFilter if provided
      if (
        platformFilter &&
        !Object.values(ProofPlatform).includes(platformFilter as ProofPlatform)
      ) {
        return validationError(
          `Invalid platformFilter: ${platformFilter} (expected one of ${Object.values(ProofPlatform).join(', ')})`,
        );
      }

      const directory = this.getDirectoryService();
      const searchResult = directory.search(q, {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        platformFilter: platformFilter
          ? (platformFilter as ProofPlatform)
          : undefined,
      });

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            results: searchResult.results,
            totalCount: searchResult.totalCount,
            hasMore: searchResult.hasMore,
          },
          message: `Found ${searchResult.totalCount} result(s)`,
        } satisfies ISearchDirectoryResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /profile/:memberId — Get a member's public profile.
   *
   * Returns the profile regardless of privacy mode (direct lookup).
   *
   * @requirements 5.1, 5.9
   */
  private async handleGetProfile(req: unknown): Promise<{
    statusCode: number;
    response: IGetProfileResponse | ApiErrorResponse;
  }> {
    try {
      const { memberId } = (req as MemberIdParams).params;
      if (!memberId) {
        return validationError('Missing required parameter: memberId');
      }

      const directory = this.getDirectoryService();
      const profile = directory.getProfile(memberId);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: profile,
          message: 'Profile found',
        } satisfies IGetProfileResponse,
      };
    } catch (error) {
      if (error instanceof ProfileNotFoundError) {
        const { memberId } = (req as MemberIdParams).params;
        return notFoundError('Profile', memberId);
      }
      return handleError(error);
    }
  }

  /**
   * PUT /profile — Create or update a public profile.
   *
   * @requirements 5.1, 5.7, 5.8
   */
  private async handleUpdateProfile(req: unknown): Promise<{
    statusCode: number;
    response: IUpdateProfileResponse | ApiErrorResponse;
  }> {
    try {
      const profile = (req as UpdateProfileBody).body;

      if (!profile || typeof profile !== 'object') {
        return validationError('Missing request body');
      }
      if (!profile.memberId || typeof profile.memberId !== 'string') {
        return validationError('Missing required field: memberId');
      }
      if (!profile.displayName || typeof profile.displayName !== 'string') {
        return validationError('Missing required field: displayName');
      }
      if (!profile.publicKey || typeof profile.publicKey !== 'string') {
        return validationError('Missing required field: publicKey');
      }

      const directory = this.getDirectoryService();
      directory.updateProfile(profile);

      // Retrieve the stored profile (may have updated timestamps)
      const stored = directory.getProfile(profile.memberId);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: stored,
          message: 'Profile updated',
        } satisfies IUpdateProfileResponse,
      };
    } catch (error) {
      if (error instanceof InvalidProfileError) {
        return validationError(error.message);
      }
      return handleError(error);
    }
  }

  /**
   * POST /profile/:memberId/privacy — Toggle privacy mode.
   *
   * @requirements 5.6, 5.9
   */
  private async handleTogglePrivacy(req: unknown): Promise<{
    statusCode: number;
    response: ITogglePrivacyResponse | ApiErrorResponse;
  }> {
    try {
      const { memberId } = (req as MemberIdParams).params;
      if (!memberId) {
        return validationError('Missing required parameter: memberId');
      }

      const directory = this.getDirectoryService();
      const privacyMode = directory.togglePrivacyMode(memberId);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { privacyMode },
          message: privacyMode
            ? 'Privacy mode enabled — profile hidden from search'
            : 'Privacy mode disabled — profile visible in search',
        } satisfies ITogglePrivacyResponse,
      };
    } catch (error) {
      if (error instanceof ProfileNotFoundError) {
        const { memberId } = (req as MemberIdParams).params;
        return notFoundError('Profile', memberId);
      }
      return handleError(error);
    }
  }
}
