/**
 * IdentityProofController — REST API for identity proof management.
 *
 * Routes:
 *   POST /create              — Create a new identity proof
 *   POST /verify              — Verify a proof's signature
 *   POST /check-url           — Check if a proof URL contains the signed statement
 *   POST /:id/revoke          — Revoke an identity proof
 *   GET  /instructions/:platform — Get platform-specific posting instructions
 *   GET  /list                — List proofs for a member
 *
 * Requirements: 4.1-4.10
 */

import { ProofPlatform } from '@brightchain/brightchain-lib/lib/enumerations/proofPlatform';
import { VerificationStatus } from '@brightchain/brightchain-lib/lib/enumerations/verificationStatus';
import type { IIdentityProof } from '@brightchain/brightchain-lib/lib/interfaces/identity/identityProof';
import type {
  ICheckProofUrlResponse,
  ICreateProofResponse,
  IGetInstructionsResponse,
  IListProofsResponse,
  IRevokeProofResponse,
  IVerifyProofResponse,
} from '@brightchain/brightchain-lib/lib/interfaces/responses/identityProofResponses';
import {
  IdentityProofService,
  ProofCreationError,
  ProofUrlError,
  UnsupportedPlatformError,
} from '@brightchain/brightchain-lib/lib/services/identity';
import { ECIESService, Member, PlatformID } from '@digitaldefiance/ecies-lib';
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

type IdentityProofApiResponse =
  | ICreateProofResponse
  | IVerifyProofResponse
  | ICheckProofUrlResponse
  | IRevokeProofResponse
  | IGetInstructionsResponse
  | IListProofsResponse
  | ApiErrorResponse;

// ─── Handler map ────────────────────────────────────────────────────────────

interface IdentityProofHandlers extends TypedHandlers {
  createProof: ApiRequestHandler<ICreateProofResponse | ApiErrorResponse>;
  verifyProof: ApiRequestHandler<IVerifyProofResponse | ApiErrorResponse>;
  checkProofUrl: ApiRequestHandler<ICheckProofUrlResponse | ApiErrorResponse>;
  revokeProof: ApiRequestHandler<IRevokeProofResponse | ApiErrorResponse>;
  getInstructions: ApiRequestHandler<
    IGetInstructionsResponse | ApiErrorResponse
  >;
  listProofs: ApiRequestHandler<IListProofsResponse | ApiErrorResponse>;
}

// ─── Request shape interfaces ───────────────────────────────────────────────

interface CreateProofBody {
  body: {
    memberId?: string;
    platform?: string;
    username?: string;
  };
}

interface VerifyProofBody {
  body: {
    proof?: IIdentityProof;
    publicKeyHex?: string;
  };
}

interface CheckProofUrlBody {
  body: {
    proof?: IIdentityProof;
  };
}

interface ProofIdParams {
  params: { id: string };
}

interface PlatformParams {
  params: { platform: string };
}

interface ListProofsQuery {
  query: { memberId?: string };
}

// ─── In-memory proof store (per-controller instance) ────────────────────────

/**
 * Simple in-memory proof store for managing identity proofs.
 * In production this would be backed by a persistent store.
 */
class ProofStore {
  private readonly proofs = new Map<string, IIdentityProof>();

  add(proof: IIdentityProof): void {
    this.proofs.set(proof.id, proof);
  }

  get(id: string): IIdentityProof | undefined {
    return this.proofs.get(id);
  }

  listByMember(memberId: string): IIdentityProof[] {
    const results: IIdentityProof[] = [];
    for (const proof of this.proofs.values()) {
      if (proof.memberId === memberId) {
        results.push(proof);
      }
    }
    return results;
  }

  update(
    id: string,
    updates: Partial<IIdentityProof>,
  ): IIdentityProof | undefined {
    const existing = this.proofs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.proofs.set(id, updated);
    return updated;
  }
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Controller for identity proof creation, verification, and management.
 *
 * Delegates to {@link IdentityProofService} in brightchain-lib for
 * core cryptographic operations.
 *
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */
export class IdentityProofController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IdentityProofApiResponse,
  IdentityProofHandlers,
  CoreLanguageCode
> {
  private eciesService: ECIESService<TID> | null = null;
  private memberResolver:
    | ((memberId: string) => Member<TID> | undefined)
    | null = null;
  private readonly proofStore = new ProofStore();

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the ECIES service for cryptographic operations.
   */
  public setEciesService(service: ECIESService<TID>): void {
    this.eciesService = service;
  }

  /**
   * Inject a member resolver function that looks up a Member by ID.
   * Required for the create endpoint which needs the member's private key.
   */
  public setMemberResolver(
    resolver: (memberId: string) => Member<TID> | undefined,
  ): void {
    this.memberResolver = resolver;
  }

  private getEciesService(): ECIESService<TID> {
    if (!this.eciesService) {
      throw new Error('ECIESService not initialized');
    }
    return this.eciesService;
  }

  private resolveMember(memberId: string): Member<TID> {
    if (!this.memberResolver) {
      throw new Error('Member resolver not initialized');
    }
    const member = this.memberResolver(memberId);
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }
    return member;
  }

  // ─── Route definitions ──────────────────────────────────────────────────

  protected initRouteDefinitions(): void {
    const noAuth = {
      useAuthentication: false,
      useCryptoAuthentication: false,
    };

    this.routeDefinitions = [
      routeConfig('post', '/create', {
        ...noAuth,
        handlerKey: 'createProof',
        openapi: {
          summary: 'Create a new identity proof',
          description:
            'Signs a statement linking a BrightChain member to an external platform account.',
          tags: ['Identity Proofs'],
          responses: {
            201: {
              schema: 'CreateProofResponse',
              description: 'Proof created successfully',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Invalid platform or missing fields',
            },
          },
        },
      }),
      routeConfig('post', '/verify', {
        ...noAuth,
        handlerKey: 'verifyProof',
        openapi: {
          summary: 'Verify an identity proof signature',
          description:
            'Verifies the ECDSA signature of an identity proof against a public key.',
          tags: ['Identity Proofs'],
          responses: {
            200: {
              schema: 'VerifyProofResponse',
              description: 'Verification result',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Missing proof or public key',
            },
          },
        },
      }),
      routeConfig('post', '/check-url', {
        ...noAuth,
        handlerKey: 'checkProofUrl',
        openapi: {
          summary: 'Check a proof URL for the signed statement',
          description:
            'Fetches the proof URL and checks that it contains the signed statement.',
          tags: ['Identity Proofs'],
          responses: {
            200: {
              schema: 'CheckProofUrlResponse',
              description: 'URL check result',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Missing proof data',
            },
          },
        },
      }),
      routeConfig('post', '/:id/revoke', {
        ...noAuth,
        handlerKey: 'revokeProof',
        openapi: {
          summary: 'Revoke an identity proof',
          description:
            'Marks an identity proof as revoked so it is no longer considered valid.',
          tags: ['Identity Proofs'],
          responses: {
            200: {
              schema: 'RevokeProofResponse',
              description: 'Proof revoked',
            },
            404: {
              schema: 'ApiErrorResponse',
              description: 'Proof not found',
            },
          },
        },
      }),
      routeConfig('get', '/instructions/:platform', {
        ...noAuth,
        handlerKey: 'getInstructions',
        openapi: {
          summary: 'Get platform-specific posting instructions',
          description:
            'Returns instructions for posting an identity proof on the specified platform.',
          tags: ['Identity Proofs'],
          responses: {
            200: {
              schema: 'GetInstructionsResponse',
              description: 'Platform instructions',
            },
          },
        },
      }),
      routeConfig('get', '/list', {
        ...noAuth,
        handlerKey: 'listProofs',
        openapi: {
          summary: 'List identity proofs for a member',
          description:
            'Returns all identity proofs associated with the specified member.',
          tags: ['Identity Proofs'],
          responses: {
            200: {
              schema: 'ListProofsResponse',
              description: 'List of proofs',
            },
          },
        },
      }),
    ];

    this.handlers = {
      createProof: this.handleCreateProof.bind(this),
      verifyProof: this.handleVerifyProof.bind(this),
      checkProofUrl: this.handleCheckProofUrl.bind(this),
      revokeProof: this.handleRevokeProof.bind(this),
      getInstructions: this.handleGetInstructions.bind(this),
      listProofs: this.handleListProofs.bind(this),
    };
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /**
   * POST /create — Create a new identity proof.
   *
   * @requirements 4.1, 4.2, 4.3, 4.8
   */
  private async handleCreateProof(req: unknown): Promise<{
    statusCode: number;
    response: ICreateProofResponse | ApiErrorResponse;
  }> {
    try {
      const { memberId, platform, username } = (req as CreateProofBody).body;

      if (!memberId || typeof memberId !== 'string') {
        return validationError('Missing required field: memberId');
      }
      if (!platform || typeof platform !== 'string') {
        return validationError('Missing required field: platform');
      }
      if (!Object.values(ProofPlatform).includes(platform as ProofPlatform)) {
        return validationError(
          `Invalid platform: ${platform} (expected one of ${Object.values(ProofPlatform).join(', ')})`,
        );
      }
      if (!username || typeof username !== 'string') {
        return validationError('Missing required field: username');
      }

      const member = this.resolveMember(memberId);
      const proof = IdentityProofService.create(
        member,
        platform as ProofPlatform,
        username,
      );

      // Store the proof
      this.proofStore.add(proof);

      const instructions = IdentityProofService.getInstructions(
        platform as ProofPlatform,
      );

      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: { proof, instructions },
          message: 'Identity proof created successfully',
        } satisfies ICreateProofResponse,
      };
    } catch (error) {
      return this.mapProofError(error);
    }
  }

  /**
   * POST /verify — Verify an identity proof's signature.
   *
   * @requirements 4.4
   */
  private async handleVerifyProof(req: unknown): Promise<{
    statusCode: number;
    response: IVerifyProofResponse | ApiErrorResponse;
  }> {
    try {
      const { proof, publicKeyHex } = (req as VerifyProofBody).body;

      if (!proof || typeof proof !== 'object') {
        return validationError('Missing required field: proof');
      }
      if (!publicKeyHex || typeof publicKeyHex !== 'string') {
        return validationError('Missing required field: publicKeyHex');
      }

      const eciesService = this.getEciesService();
      const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
      const verified = IdentityProofService.verify(
        proof,
        publicKeyBytes,
        eciesService,
      );

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { verified, proofId: proof.id },
          message: verified
            ? 'Proof signature is valid'
            : 'Proof signature is invalid',
        } satisfies IVerifyProofResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /check-url — Check if a proof URL contains the signed statement.
   *
   * @requirements 4.6, 4.10
   */
  private async handleCheckProofUrl(req: unknown): Promise<{
    statusCode: number;
    response: ICheckProofUrlResponse | ApiErrorResponse;
  }> {
    try {
      const { proof } = (req as CheckProofUrlBody).body;

      if (!proof || typeof proof !== 'object') {
        return validationError('Missing required field: proof');
      }
      if (!proof.proofUrl || typeof proof.proofUrl !== 'string') {
        return validationError('Proof must have a non-empty proofUrl');
      }

      const valid = await IdentityProofService.checkProofUrl(proof);

      // Update stored proof verification status if we have it
      if (this.proofStore.get(proof.id)) {
        this.proofStore.update(proof.id, {
          verificationStatus: valid
            ? VerificationStatus.VERIFIED
            : VerificationStatus.FAILED,
          verifiedAt: valid ? new Date() : undefined,
          lastCheckedAt: new Date(),
        });
      }

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { valid, proofId: proof.id },
          message: valid
            ? 'Proof URL contains the signed statement'
            : 'Proof URL does not contain the signed statement',
        } satisfies ICheckProofUrlResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /:id/revoke — Revoke an identity proof.
   *
   * @requirements 4.7
   */
  private async handleRevokeProof(req: unknown): Promise<{
    statusCode: number;
    response: IRevokeProofResponse | ApiErrorResponse;
  }> {
    try {
      const { id } = (req as ProofIdParams).params;
      if (!id) {
        return validationError('Missing required parameter: id');
      }

      const proof = this.proofStore.get(id);
      if (!proof) {
        return notFoundError('IdentityProof', id);
      }

      if (proof.verificationStatus === VerificationStatus.REVOKED) {
        return validationError('Proof is already revoked');
      }

      const revokedAt = new Date();
      this.proofStore.update(id, {
        verificationStatus: VerificationStatus.REVOKED,
        revokedAt,
      });

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { revoked: true, revokedAt: revokedAt.toISOString() },
          message: 'Identity proof revoked',
        } satisfies IRevokeProofResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /instructions/:platform — Get platform-specific posting instructions.
   *
   * @requirements 4.9
   */
  private async handleGetInstructions(req: unknown): Promise<{
    statusCode: number;
    response: IGetInstructionsResponse | ApiErrorResponse;
  }> {
    try {
      const { platform } = (req as PlatformParams).params;
      if (!platform) {
        return validationError('Missing required parameter: platform');
      }

      const instructions = IdentityProofService.getInstructions(platform);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { platform, instructions },
          message: 'Instructions retrieved',
        } satisfies IGetInstructionsResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /list — List identity proofs for a member.
   *
   * @requirements 4.5
   */
  private async handleListProofs(req: unknown): Promise<{
    statusCode: number;
    response: IListProofsResponse | ApiErrorResponse;
  }> {
    try {
      const { memberId } = (req as ListProofsQuery).query;
      if (!memberId || typeof memberId !== 'string') {
        return validationError('Missing required query parameter: memberId');
      }

      const proofs = this.proofStore.listByMember(memberId);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: proofs,
          message: `Found ${proofs.length} proof(s)`,
        } satisfies IListProofsResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── Error mapping ──────────────────────────────────────────────────

  private mapProofError(error: unknown): {
    statusCode: number;
    response: ApiErrorResponse;
  } {
    if (error instanceof UnsupportedPlatformError) {
      return {
        statusCode: 400,
        response: {
          message: error.message,
          error: 'UNSUPPORTED_PLATFORM',
        },
      };
    }
    if (error instanceof ProofCreationError) {
      return {
        statusCode: 400,
        response: {
          message: error.message,
          error: 'PROOF_CREATION_FAILED',
        },
      };
    }
    if (error instanceof ProofUrlError) {
      return {
        statusCode: 400,
        response: {
          message: error.message,
          error: 'PROOF_URL_ERROR',
        },
      };
    }
    return handleError(error);
  }
}
