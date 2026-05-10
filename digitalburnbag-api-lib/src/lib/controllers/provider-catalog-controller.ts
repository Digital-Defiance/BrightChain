/**
 * ProviderCatalogController — API endpoints for the provider catalog.
 *
 * Provides browsing, searching, and filtering of the expanded provider catalog.
 *
 * Routes (mounted at /burnbag/providers/catalog):
 *   GET  /                  — get full catalog with optional filters
 *   GET  /search?q={query}  — search providers by name/description
 *   GET  /categories        — get providers grouped by category
 *   GET  /recommended       — get recommended providers
 *
 * Feature: canary-provider-expansion
 * Requirements: 11.2, 11.3, 11.4, 11.7
 */
import type {
  IProviderCatalogFilters,
  IProviderCatalogService,
  ProviderCategory,
} from '@brightchain/digitalburnbag-lib';
import {
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
} from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID as NodePlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  BaseController,
  routeConfig,
  type ApiErrorResponse,
  type ApiRequestHandler,
  type IApiMessageResponse,
  type IApplication,
  type IStatusCodeResponse,
  type TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import type { Request as ExpressRequest } from 'express';

type CatalogResponse = IApiMessageResponse | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Dependencies interface
// ---------------------------------------------------------------------------

export interface IProviderCatalogControllerDeps<TID extends PlatformID> {
  providerCatalogService: IProviderCatalogService<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

// ---------------------------------------------------------------------------
// Handler type map
// ---------------------------------------------------------------------------

interface IProviderCatalogHandlers extends TypedHandlers {
  getCatalog: ApiRequestHandler<CatalogResponse>;
  searchCatalog: ApiRequestHandler<CatalogResponse>;
  getCategories: ApiRequestHandler<CatalogResponse>;
  getRecommended: ApiRequestHandler<CatalogResponse>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class ProviderCatalogController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  CatalogResponse,
  IProviderCatalogHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IProviderCatalogControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IProviderCatalogControllerDeps<TID>,
  ) {
    super(application);
    this.deps = deps;
  }

  private safeParseId(idString: string | undefined): TID | undefined {
    if (!idString) return undefined;
    if (this.deps.parseSafeId) return this.deps.parseSafeId(idString);
    try {
      return this.deps.parseId(idString);
    } catch {
      return undefined;
    }
  }

  protected initRouteDefinitions(): void {
    const auth = { useAuthentication: true, useCryptoAuthentication: false };
    this.routeDefinitions = [
      // GET /catalog — full catalog with optional filters (Req 11.2, 11.3)
      routeConfig('get', '/', {
        handlerKey: 'getCatalog',
        ...auth,
      }),
      // GET /catalog/search?q={query} — search by name/description (Req 11.4)
      routeConfig('get', '/search', {
        handlerKey: 'searchCatalog',
        ...auth,
      }),
      // GET /catalog/categories — providers grouped by category (Req 11.3)
      routeConfig('get', '/categories', {
        handlerKey: 'getCategories',
        ...auth,
      }),
      // GET /catalog/recommended — recommended providers (Req 11.7)
      routeConfig('get', '/recommended', {
        handlerKey: 'getRecommended',
        ...auth,
      }),
    ];
    this.handlers = {
      getCatalog: this.handleGetCatalog.bind(this),
      searchCatalog: this.handleSearchCatalog.bind(this),
      getCategories: this.handleGetCategories.bind(this),
      getRecommended: this.handleGetRecommended.bind(this),
    };
  }

  // -----------------------------------------------------------------------
  // GET / — full catalog with optional filters
  // Requirements: 11.2, 11.3
  // -----------------------------------------------------------------------

  private async handleGetCatalog(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<CatalogResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as CatalogResponse,
      };
    }

    // Parse optional query filters
    const filters: IProviderCatalogFilters = {};

    if (req.query.category) {
      filters.category = req.query.category as ProviderCategory;
    }
    if (req.query.authType) {
      filters.authType = req.query.authType as IProviderCatalogFilters['authType'];
    }
    if (req.query.supportsWebhooks !== undefined) {
      filters.supportsWebhooks = req.query.supportsWebhooks === 'true';
    }
    if (req.query.searchQuery) {
      filters.searchQuery = req.query.searchQuery as string;
    }

    const providers = this.deps.providerCatalogService.getProviders(
      Object.keys(filters).length > 0 ? filters : undefined,
    );

    return {
      statusCode: 200,
      response: providers as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /search?q={query} — search providers by name/description
  // Requirement: 11.4
  // -----------------------------------------------------------------------

  private async handleSearchCatalog(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<CatalogResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as CatalogResponse,
      };
    }

    const query = (req.query.q as string) ?? '';
    const providers = this.deps.providerCatalogService.searchProviders(query);

    return {
      statusCode: 200,
      response: providers as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /categories — providers grouped by category
  // Requirement: 11.3
  // -----------------------------------------------------------------------

  private async handleGetCategories(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<CatalogResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as CatalogResponse,
      };
    }

    const categoryMap = this.deps.providerCatalogService.getProvidersByCategory();
    const counts = this.deps.providerCatalogService.getCategoryCounts();

    // Convert Map to a JSON-serializable object
    const categories: Record<string, { providers: unknown[]; count: number }> = {};
    for (const [category, providers] of categoryMap.entries()) {
      categories[category] = {
        providers,
        count: counts[category] ?? providers.length,
      };
    }

    return {
      statusCode: 200,
      response: categories as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /recommended — recommended providers
  // Requirement: 11.7
  // -----------------------------------------------------------------------

  private async handleGetRecommended(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<CatalogResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as CatalogResponse,
      };
    }

    const providers = this.deps.providerCatalogService.getRecommendedProviders();

    return {
      statusCode: 200,
      response: providers as unknown as IApiMessageResponse,
    };
  }
}
