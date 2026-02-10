/**
 * WalletController — REST API for Ethereum wallet operations.
 *
 * Routes:
 *   POST /derive-address       — Derive an Ethereum address from a paper key
 *   POST /sign-message         — Sign a message with the member's key
 *   POST /verify-signature     — Verify a signed message
 *   GET  /address              — Get the wallet address for a member
 *
 * Requirements: 6.1-6.10
 */

import type {
  IDeriveAddressResponse,
  IGetWalletResponse,
  ISignMessageResponse,
  IVerifySignatureResponse,
} from '@brightchain/brightchain-lib/lib/interfaces/responses/cryptoResponses';
import { EthereumWalletService } from '@brightchain/brightchain-lib/lib/services/crypto/ethereumWalletService';
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

type WalletApiResponse =
  | IDeriveAddressResponse
  | ISignMessageResponse
  | IVerifySignatureResponse
  | IGetWalletResponse
  | ApiErrorResponse;

// ─── Handler map ────────────────────────────────────────────────────────────

interface WalletHandlers extends TypedHandlers {
  deriveAddress: ApiRequestHandler<IDeriveAddressResponse | ApiErrorResponse>;
  signMessage: ApiRequestHandler<ISignMessageResponse | ApiErrorResponse>;
  verifySignature: ApiRequestHandler<
    IVerifySignatureResponse | ApiErrorResponse
  >;
  getWallet: ApiRequestHandler<IGetWalletResponse | ApiErrorResponse>;
}

// ─── Request shape interfaces ───────────────────────────────────────────────

interface DeriveAddressBody {
  body: {
    paperKey?: string;
    label?: string;
  };
}

interface SignMessageBody {
  body: {
    paperKey?: string;
    message?: string;
  };
}

interface VerifySignatureBody {
  body: {
    message?: string;
    signature?: string;
    address?: string;
  };
}

interface GetWalletQuery {
  query: { paperKey?: string };
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Controller for Ethereum wallet operations.
 *
 * Delegates to {@link EthereumWalletService} in brightchain-lib for
 * core wallet logic including address derivation, message signing,
 * and signature verification.
 *
 * @requirements 6.1, 6.2, 6.3, 6.7, 6.8
 */
export class WalletController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  WalletApiResponse,
  WalletHandlers,
  CoreLanguageCode
> {
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
      routeConfig('post', '/derive-address', {
        ...noAuth,
        handlerKey: 'deriveAddress',
        openapi: {
          summary: 'Derive an Ethereum address',
          description:
            'Derives an Ethereum address from a paper key using BIP44 derivation.',
          tags: ['Wallet'],
          responses: {
            200: {
              schema: 'DeriveAddressResponse',
              description: 'Address derived successfully',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Invalid paper key',
            },
          },
        },
      }),
      routeConfig('post', '/sign-message', {
        ...noAuth,
        handlerKey: 'signMessage',
        openapi: {
          summary: 'Sign a message',
          description:
            'Signs a message using EIP-191 personal message signing.',
          tags: ['Wallet'],
          responses: {
            200: {
              schema: 'SignMessageResponse',
              description: 'Message signed successfully',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Invalid paper key or message',
            },
          },
        },
      }),
      routeConfig('post', '/verify-signature', {
        ...noAuth,
        handlerKey: 'verifySignature',
        openapi: {
          summary: 'Verify a message signature',
          description:
            'Verifies an EIP-191 signed message and recovers the signer address.',
          tags: ['Wallet'],
          responses: {
            200: {
              schema: 'VerifySignatureResponse',
              description: 'Signature verification result',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Missing required fields',
            },
          },
        },
      }),
      routeConfig('get', '/address', {
        ...noAuth,
        handlerKey: 'getWallet',
        openapi: {
          summary: 'Get wallet address',
          description:
            'Returns the Ethereum wallet address for a given paper key.',
          tags: ['Wallet'],
          responses: {
            200: {
              schema: 'GetWalletResponse',
              description: 'Wallet address returned',
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
      deriveAddress: this.handleDeriveAddress.bind(this),
      signMessage: this.handleSignMessage.bind(this),
      verifySignature: this.handleVerifySignature.bind(this),
      getWallet: this.handleGetWallet.bind(this),
    };
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /**
   * POST /derive-address — Derive an Ethereum address from a paper key.
   *
   * @requirements 6.1, 6.4
   */
  private async handleDeriveAddress(req: unknown): Promise<{
    statusCode: number;
    response: IDeriveAddressResponse | ApiErrorResponse;
  }> {
    try {
      const { paperKey, label } = (req as DeriveAddressBody).body;

      if (!paperKey || typeof paperKey !== 'string') {
        return validationError('Missing required field: paperKey');
      }

      const result = EthereumWalletService.deriveAddress(paperKey);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            memberId: '',
            address: result.address,
            publicKeyHex: result.publicKeyHex,
            derivationPath: result.derivationPath,
            createdAt: new Date(),
            label,
          },
          message: 'Ethereum address derived successfully',
        } satisfies IDeriveAddressResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /sign-message — Sign a message with the member's Ethereum key.
   *
   * @requirements 6.2, 6.3
   */
  private async handleSignMessage(req: unknown): Promise<{
    statusCode: number;
    response: ISignMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { paperKey, message } = (req as SignMessageBody).body;

      if (!paperKey || typeof paperKey !== 'string') {
        return validationError('Missing required field: paperKey');
      }
      if (!message || typeof message !== 'string') {
        return validationError('Missing required field: message');
      }

      const result = EthereumWalletService.signMessage(paperKey, message);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            memberId: '',
            message,
            signature: result.signature,
            recoveryParam: result.recoveryParam,
          },
          message: 'Message signed successfully',
        } satisfies ISignMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /verify-signature — Verify a signed message.
   *
   * @requirements 6.7, 6.8
   */
  private async handleVerifySignature(req: unknown): Promise<{
    statusCode: number;
    response: IVerifySignatureResponse | ApiErrorResponse;
  }> {
    try {
      const body = (req as VerifySignatureBody).body;
      const { message, signature, address } = body;

      if (!message || typeof message !== 'string') {
        return validationError('Missing required field: message');
      }
      if (!signature || typeof signature !== 'string') {
        return validationError('Missing required field: signature');
      }
      if (!address || typeof address !== 'string') {
        return validationError('Missing required field: address');
      }

      const valid = EthereumWalletService.verifySignature(
        message,
        signature,
        address,
      );

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            valid,
            recoveredAddress: address,
          },
          message: valid
            ? 'Signature is valid'
            : 'Signature verification failed',
        } satisfies IVerifySignatureResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /address — Get the wallet address for a paper key.
   *
   * @requirements 6.1
   */
  private async handleGetWallet(req: unknown): Promise<{
    statusCode: number;
    response: IGetWalletResponse | ApiErrorResponse;
  }> {
    try {
      const { paperKey } = (req as GetWalletQuery).query;

      if (!paperKey || typeof paperKey !== 'string') {
        return validationError('Missing required query parameter: paperKey');
      }

      const result = EthereumWalletService.deriveAddress(paperKey);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            memberId: '',
            address: result.address,
            publicKeyHex: result.publicKeyHex,
            derivationPath: result.derivationPath,
            createdAt: new Date(),
          },
          message: 'Wallet address retrieved',
        } satisfies IGetWalletResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
