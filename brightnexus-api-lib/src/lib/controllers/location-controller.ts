import {
  buildBslpSignablePayload,
  canonicalBslpSignPayloadHex,
  formatBrightDnsTxt,
  toWellKnownManifest,
  validateLocationPublishPayload,
  validateLocationPublishRequest,
  type IBrightNexusLocationLookupEntry,
  type IBrightNexusLocationPublishRequest,
  type IBrightNexusLocationRecord,
} from '@brightchain/brightnexus-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID as NodePlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  BaseController,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
  routeConfig,
  type IApplication,
} from '@digitaldefiance/node-express-suite';
import type { Request as ExpressRequest } from 'express';
import type { BslpSignatureVerifier } from '../services/bslp-signature-verifier';
import type { LocationRegistryService } from '../services/location-registry-service';

export interface ILocationControllerDeps<TID extends NodePlatformID> {
  locationRegistryService: LocationRegistryService<TID>;
  signatureVerifier: BslpSignatureVerifier;
  getMemberPublicKeyHex: (memberId: TID) => Promise<string | null>;
  getMemberPublicKeyHexByIdString: (memberIdHex: string) => Promise<string | null>;
  idToString: (memberId: TID) => string;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

interface ILocationPublishSuccess extends IApiMessageResponse {
  record: IBrightNexusLocationRecord;
  dnsTxt: string;
  wellKnown: ReturnType<typeof toWellKnownManifest>;
}

interface ILocationListSuccess extends IApiMessageResponse {
  records: IBrightNexusLocationRecord[];
}

interface ISigningPayloadSuccess extends IApiMessageResponse {
  payloadHex: string;
  canonicalJson: string;
  memberIdHex: string;
}

type LocationMutationResponse = ILocationPublishSuccess | ApiErrorResponse;
interface ILocationLookupSuccess extends IApiMessageResponse {
  ipAddress: string;
  entries: IBrightNexusLocationLookupEntry[];
}

type LocationLookupResponse = ILocationLookupSuccess | ApiErrorResponse;
type LocationListResponse = ILocationListSuccess | ApiErrorResponse;
type LocationDeleteResponse = IApiMessageResponse | ApiErrorResponse;
type SigningPayloadResponse = ISigningPayloadSuccess | ApiErrorResponse;

interface ILocationHandlers extends TypedHandlers {
  publishLocation: ApiRequestHandler<LocationMutationResponse>;
  previewSigningPayload: ApiRequestHandler<SigningPayloadResponse>;
  lookupByIp: ApiRequestHandler<LocationLookupResponse>;
  listMine: ApiRequestHandler<LocationListResponse>;
  revokeLocation: ApiRequestHandler<LocationDeleteResponse>;
}

/**
 * BrightNexus geo registry — authenticated publish, public DHT lookup.
 *
 * Routes (mounted at `/brightnexus/location`):
 * - POST   /                  — publish BST + Heisenberg metadata for an IP
 * - POST   /signing-payload     — canonical bytes to sign (JWT)
 * - GET    /mine                — list caller's announcements
 * - DELETE /:ip                 — revoke announcement for IP
 * - GET    /lookup/:ip          — public lookup (P2P registry tier)
 */
export class LocationController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  | LocationMutationResponse
  | LocationLookupResponse
  | LocationListResponse
  | LocationDeleteResponse
  | SigningPayloadResponse,
  ILocationHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  constructor(
    application: IApplication<TID>,
    private readonly deps: ILocationControllerDeps<TID>,
  ) {
    super(application);
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
    this.routeDefinitions = [
      routeConfig('post', '/', {
        handlerKey: 'publishLocation',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/signing-payload', {
        handlerKey: 'previewSigningPayload',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/mine', {
        handlerKey: 'listMine',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/:ip', {
        handlerKey: 'revokeLocation',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/lookup/:ip', {
        handlerKey: 'lookupByIp',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
    ];
    this.handlers = {
      publishLocation: this.handlePublish.bind(this),
      previewSigningPayload: this.handleSigningPayload.bind(this),
      lookupByIp: this.handleLookup.bind(this),
      listMine: this.handleListMine.bind(this),
      revokeLocation: this.handleRevoke.bind(this),
    };
  }

  private async verifyPublishSignature(
    memberId: TID,
    body: IBrightNexusLocationPublishRequest,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const memberIdHex = this.deps.idToString(memberId);
    const publicKeyHex = await this.deps.getMemberPublicKeyHex(memberId);
    if (!publicKeyHex) {
      return {
        ok: false,
        message: 'Member public key not found; cannot verify BSLP signature',
      };
    }
    const valid = this.deps.signatureVerifier.verifyPublish(
      memberIdHex,
      body,
      body.signature,
      publicKeyHex,
    );
    if (!valid) {
      return {
        ok: false,
        message:
          'Invalid BSLP signature for this member and payload. Sign canonicalBslpSignPayloadJson with your member key.',
      };
    }
    return { ok: true };
  }

  private async enrichLookupEntry(
    entry: IBrightNexusLocationLookupEntry,
  ): Promise<IBrightNexusLocationLookupEntry> {
    if (!entry.signature) {
      return { ...entry, signatureVerified: false };
    }
    const publicKeyHex = await this.deps.getMemberPublicKeyHexByIdString(
      entry.memberIdHex,
    );
    if (!publicKeyHex) {
      return { ...entry, signatureVerified: false };
    }
    const signatureVerified = this.deps.signatureVerifier.verifyPublish(
      entry.memberIdHex,
      {
        ipAddress: entry.ipAddress,
        vector: entry.vector,
        privacy: entry.privacy,
        signature: entry.signature,
      },
      entry.signature,
      publicKeyHex,
    );
    return { ...entry, signatureVerified };
  }

  private async handlePublish(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<LocationMutationResponse>> {
    const memberId = this.safeParseId(req.user?.id as string);
    if (!memberId) {
      return {
        statusCode: 401,
        response: { message: 'Authentication required', error: 'Unauthorized' },
      };
    }

    const validation = validateLocationPublishRequest(
      req.body as Partial<IBrightNexusLocationPublishRequest>,
    );
    if (!validation.valid) {
      return {
        statusCode: 400,
        response: {
          message: validation.errors.join('; '),
          error: 'Validation failed',
        },
      };
    }

    const body = req.body as IBrightNexusLocationPublishRequest;
    const sigCheck = await this.verifyPublishSignature(memberId, body);
    if (sigCheck.ok === false) {
      return {
        statusCode: 400,
        response: { message: sigCheck.message, error: 'Invalid signature' },
      };
    }

    const record = await this.deps.locationRegistryService.publish(memberId, body);

    const dnsTxt = formatBrightDnsTxt(record.vector, record.privacy);
    const wellKnown = toWellKnownManifest(
      record.memberIdHex,
      record.vector,
      record.privacy,
      record.signature,
    );

    return {
      statusCode: 200,
      response: {
        message: 'Location published to BrightNexus registry',
        record,
        dnsTxt,
        wellKnown,
      },
    };
  }

  private async handleSigningPayload(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<SigningPayloadResponse>> {
    const memberId = this.safeParseId(req.user?.id as string);
    if (!memberId) {
      return {
        statusCode: 401,
        response: { message: 'Authentication required', error: 'Unauthorized' },
      };
    }

    const validation = validateLocationPublishPayload(
      req.body as Partial<IBrightNexusLocationPublishRequest>,
    );
    if (!validation.valid) {
      return {
        statusCode: 400,
        response: {
          message: validation.errors.join('; '),
          error: 'Validation failed',
        },
      };
    }

    const body = req.body as IBrightNexusLocationPublishRequest;
    const memberIdHex = this.deps.idToString(memberId);
    const payload = buildBslpSignablePayload(memberIdHex, body);
    const { payloadHex, canonicalJson } = canonicalBslpSignPayloadHex(payload);

    return {
      statusCode: 200,
      response: {
        message: 'Sign payloadHex with your member private key (ECDSA secp256k1)',
        payloadHex,
        canonicalJson,
        memberIdHex,
      },
    };
  }

  private async handleLookup(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<LocationLookupResponse>> {
    const ip = (req.params['ip'] as string | undefined)?.trim();
    if (!ip) {
      return {
        statusCode: 400,
        response: { message: 'ip is required', error: 'Bad request' },
      };
    }

    const verifiedOnly =
      req.query['verifiedOnly'] === 'true' || req.query['verifiedOnly'] === '1';

    const result = await this.deps.locationRegistryService.lookupByIp(ip);
    let entries = await Promise.all(
      result.entries.map((e) => this.enrichLookupEntry(e)),
    );
    if (verifiedOnly) {
      entries = entries.filter((e) => e.signatureVerified);
    }

    return {
      statusCode: 200,
      response: {
        message: 'OK',
        ipAddress: result.ipAddress,
        entries,
      },
    };
  }

  private async handleListMine(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<LocationListResponse>> {
    const memberId = this.safeParseId(req.user?.id as string);
    if (!memberId) {
      return {
        statusCode: 401,
        response: { message: 'Authentication required', error: 'Unauthorized' },
      };
    }

    const records = await this.deps.locationRegistryService.listByMember(memberId);
    return {
      statusCode: 200,
      response: { message: 'OK', records },
    };
  }

  private async handleRevoke(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<LocationDeleteResponse>> {
    const memberId = this.safeParseId(req.user?.id as string);
    if (!memberId) {
      return {
        statusCode: 401,
        response: { message: 'Authentication required', error: 'Unauthorized' },
      };
    }

    const ip = (req.params['ip'] as string | undefined)?.trim();
    if (!ip) {
      return {
        statusCode: 400,
        response: { message: 'ip is required', error: 'Bad request' },
      };
    }

    const removed = await this.deps.locationRegistryService.revoke(memberId, ip);
    if (!removed) {
      return {
        statusCode: 404,
        response: { message: 'No announcement found for this IP', error: 'Not found' },
      };
    }

    return {
      statusCode: 200,
      response: { message: 'Location announcement revoked' },
    };
  }
}
