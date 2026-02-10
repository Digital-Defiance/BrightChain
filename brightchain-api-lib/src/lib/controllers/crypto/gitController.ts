/**
 * GitController — REST API for Git commit/tag signing operations.
 *
 * Routes:
 *   POST /sign-commit          — Sign a Git commit
 *   POST /sign-tag             — Sign a Git tag
 *   POST /verify               — Verify a Git signature
 *   POST /export-public-key    — Export the signing public key in PGP format
 *
 * Requirements: 7.1-7.10
 */

import type {
  IExportGitPublicKeyResponse,
  ISignCommitResponse,
  ISignTagResponse,
  IVerifyGitSignatureResponse,
} from '@brightchain/brightchain-lib/lib/interfaces/responses/cryptoResponses';
import {
  GitSigningError,
  GitSigningService,
} from '@brightchain/brightchain-lib/lib/services/crypto/gitSigningService';
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
import { handleError, validationError } from '../../utils/errorResponse';
import { BaseController } from '../base';

// ─── Response union ─────────────────────────────────────────────────────────

type GitApiResponse =
  | ISignCommitResponse
  | ISignTagResponse
  | IVerifyGitSignatureResponse
  | IExportGitPublicKeyResponse
  | ApiErrorResponse;

// ─── Handler map ────────────────────────────────────────────────────────────

interface GitHandlers extends TypedHandlers {
  signCommit: ApiRequestHandler<ISignCommitResponse | ApiErrorResponse>;
  signTag: ApiRequestHandler<ISignTagResponse | ApiErrorResponse>;
  verifySignature: ApiRequestHandler<
    IVerifyGitSignatureResponse | ApiErrorResponse
  >;
  exportPublicKey: ApiRequestHandler<
    IExportGitPublicKeyResponse | ApiErrorResponse
  >;
}

// ─── Request shape interfaces ───────────────────────────────────────────────

interface SignCommitBody {
  body: {
    paperKey?: string;
    commitContent?: string;
  };
}

interface SignTagBody {
  body: {
    paperKey?: string;
    tagContent?: string;
  };
}

interface VerifyGitSignatureBody {
  body: {
    content?: string;
    signatureHex?: string;
    contentHashHex?: string;
    armoredSignature?: string;
    derivationPath?: string;
    paperKey?: string;
    publicKeyHex?: string;
  };
}

interface ExportPublicKeyBody {
  body: {
    paperKey?: string;
  };
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Controller for Git commit and tag signing operations.
 *
 * Delegates to {@link GitSigningService} in brightchain-lib for
 * core signing logic including ECDSA signing over SHA-256 hashes
 * wrapped in PGP-armored format.
 *
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
export class GitController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<TID, GitApiResponse, GitHandlers, CoreLanguageCode> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  // ─── Route definitions ──────────────────────────────────────────────────

  protected initRouteDefinitions(): void {
    const noAuth = {
      useAuthentication: false,
      useCryptoAuthentication: false,
    };

    this.routeDefinitions = [
      routeConfig('post', '/sign-commit', {
        ...noAuth,
        handlerKey: 'signCommit',
        openapi: {
          summary: 'Sign a Git commit',
          description:
            'Signs a Git commit payload using ECDSA over SHA-256, producing a PGP-armored signature.',
          tags: ['Git'],
          responses: {
            200: {
              schema: 'SignCommitResponse',
              description: 'Commit signed successfully',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Invalid paper key or missing content',
            },
          },
        },
      }),
      routeConfig('post', '/sign-tag', {
        ...noAuth,
        handlerKey: 'signTag',
        openapi: {
          summary: 'Sign a Git tag',
          description:
            'Signs a Git tag payload using ECDSA over SHA-256, producing a PGP-armored signature.',
          tags: ['Git'],
          responses: {
            200: {
              schema: 'SignTagResponse',
              description: 'Tag signed successfully',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Invalid paper key or missing content',
            },
          },
        },
      }),
      routeConfig('post', '/verify', {
        ...noAuth,
        handlerKey: 'verifySignature',
        openapi: {
          summary: 'Verify a Git signature',
          description:
            'Verifies a Git commit or tag signature using the signer public key or paper key.',
          tags: ['Git'],
          responses: {
            200: {
              schema: 'VerifyGitSignatureResponse',
              description: 'Verification result',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Missing required fields',
            },
          },
        },
      }),
      routeConfig('post', '/export-public-key', {
        ...noAuth,
        handlerKey: 'exportPublicKey',
        openapi: {
          summary: 'Export Git signing public key',
          description:
            'Exports the Git signing public key in PGP-armored format for GPG keyring import.',
          tags: ['Git'],
          responses: {
            200: {
              schema: 'ExportGitPublicKeyResponse',
              description: 'Public key exported successfully',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Invalid paper key',
            },
          },
        },
      }),
    ];

    this.handlers = {
      signCommit: this.handleSignCommit.bind(this),
      signTag: this.handleSignTag.bind(this),
      verifySignature: this.handleVerifySignature.bind(this),
      exportPublicKey: this.handleExportPublicKey.bind(this),
    };
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /**
   * POST /sign-commit — Sign a Git commit.
   *
   * @requirements 7.1, 7.2
   */
  private async handleSignCommit(req: unknown): Promise<{
    statusCode: number;
    response: ISignCommitResponse | ApiErrorResponse;
  }> {
    try {
      const { paperKey, commitContent } = (req as SignCommitBody).body;

      if (!paperKey || typeof paperKey !== 'string') {
        return validationError('Missing required field: paperKey');
      }
      if (!commitContent || typeof commitContent !== 'string') {
        return validationError('Missing required field: commitContent');
      }

      const result = GitSigningService.signCommit(paperKey, commitContent);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            memberId: '',
            objectType: 'commit',
            contentHashHex: result.contentHashHex,
            armoredSignature: result.armoredSignature,
            signatureHex: result.signatureHex,
            derivationPath: result.derivationPath,
            signedAt: new Date(),
          },
          message: 'Commit signed successfully',
        } satisfies ISignCommitResponse,
      };
    } catch (error) {
      return this.mapGitError(error);
    }
  }

  /**
   * POST /sign-tag — Sign a Git tag.
   *
   * @requirements 7.3
   */
  private async handleSignTag(req: unknown): Promise<{
    statusCode: number;
    response: ISignTagResponse | ApiErrorResponse;
  }> {
    try {
      const { paperKey, tagContent } = (req as SignTagBody).body;

      if (!paperKey || typeof paperKey !== 'string') {
        return validationError('Missing required field: paperKey');
      }
      if (!tagContent || typeof tagContent !== 'string') {
        return validationError('Missing required field: tagContent');
      }

      const result = GitSigningService.signTag(paperKey, tagContent);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            memberId: '',
            objectType: 'tag',
            contentHashHex: result.contentHashHex,
            armoredSignature: result.armoredSignature,
            signatureHex: result.signatureHex,
            derivationPath: result.derivationPath,
            signedAt: new Date(),
          },
          message: 'Tag signed successfully',
        } satisfies ISignTagResponse,
      };
    } catch (error) {
      return this.mapGitError(error);
    }
  }

  /**
   * POST /verify — Verify a Git signature.
   *
   * Supports verification by paper key or by raw public key hex.
   *
   * @requirements 7.4
   */
  private async handleVerifySignature(req: unknown): Promise<{
    statusCode: number;
    response: IVerifyGitSignatureResponse | ApiErrorResponse;
  }> {
    try {
      const {
        content,
        signatureHex,
        contentHashHex,
        armoredSignature,
        derivationPath,
        paperKey,
        publicKeyHex,
      } = (req as VerifyGitSignatureBody).body;

      if (!content || typeof content !== 'string') {
        return validationError('Missing required field: content');
      }
      if (!signatureHex || typeof signatureHex !== 'string') {
        return validationError('Missing required field: signatureHex');
      }
      if (!paperKey && !publicKeyHex) {
        return validationError(
          'Either paperKey or publicKeyHex must be provided',
        );
      }

      const sigResult = {
        armoredSignature: armoredSignature ?? '',
        signatureHex,
        contentHashHex: contentHashHex ?? '',
        derivationPath: derivationPath ?? "m/44'/60'/0'/2/0",
      };

      let valid: boolean;
      let verifyPubKeyHex: string;
      let fingerprint: string;

      if (publicKeyHex) {
        valid = GitSigningService.verifyWithPublicKey(
          content,
          sigResult,
          publicKeyHex,
        );
        verifyPubKeyHex = publicKeyHex;
        fingerprint = '';
      } else {
        valid = GitSigningService.verify(content, sigResult, paperKey!);
        const exported = GitSigningService.exportPublicKey(paperKey!);
        verifyPubKeyHex = exported.publicKeyHex;
        fingerprint = exported.fingerprint;
      }

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            valid,
            publicKeyHex: verifyPubKeyHex,
            fingerprint,
            verifiedAt: new Date(),
          },
          message: valid
            ? 'Signature is valid'
            : 'Signature verification failed',
        } satisfies IVerifyGitSignatureResponse,
      };
    } catch (error) {
      return this.mapGitError(error);
    }
  }

  /**
   * POST /export-public-key — Export the Git signing public key.
   *
   * @requirements 7.5
   */
  private async handleExportPublicKey(req: unknown): Promise<{
    statusCode: number;
    response: IExportGitPublicKeyResponse | ApiErrorResponse;
  }> {
    try {
      const { paperKey } = (req as ExportPublicKeyBody).body;

      if (!paperKey || typeof paperKey !== 'string') {
        return validationError('Missing required field: paperKey');
      }

      const result = GitSigningService.exportPublicKey(paperKey);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            memberId: '',
            armoredPublicKey: result.armoredPublicKey,
            publicKeyHex: result.publicKeyHex,
            fingerprint: result.fingerprint,
            derivationPath: result.derivationPath,
            exportedAt: new Date(),
          },
          message: 'Public key exported successfully',
        } satisfies IExportGitPublicKeyResponse,
      };
    } catch (error) {
      return this.mapGitError(error);
    }
  }

  // ─── Error mapping ──────────────────────────────────────────────────

  /**
   * Map Git signing errors to appropriate HTTP responses.
   */
  private mapGitError(error: unknown): {
    statusCode: number;
    response: ApiErrorResponse;
  } {
    if (error instanceof GitSigningError) {
      return {
        statusCode: 400,
        response: {
          message: error.message,
          error: 'GIT_SIGNING_ERROR',
        },
      };
    }
    return handleError(error);
  }
}
