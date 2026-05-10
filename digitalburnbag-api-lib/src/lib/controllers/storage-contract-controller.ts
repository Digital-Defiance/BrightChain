import type { IBurnbagStorageContractRepository } from '@brightchain/digitalburnbag-lib';
import {
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
} from '@brightchain/digitalburnbag-lib';
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

export interface IStorageContractControllerDeps {
  storageContractRepository: IBurnbagStorageContractRepository;
}

type ContractResponse = IApiMessageResponse | ApiErrorResponse;

interface IStorageContractHandlers extends TypedHandlers {
  listContracts: ApiRequestHandler<ContractResponse>;
  getContract: ApiRequestHandler<ContractResponse>;
  updateContract: ApiRequestHandler<ContractResponse>;
}

/** Serialize bigint fields in a storage contract to strings for JSON transport. */
function serializeContract(
  contract: Record<string, unknown>,
): Record<string, unknown> {
  const BIGINT_FIELDS = new Set([
    'bytes',
    'upfrontMicroJoules',
    'dailyMicroJoules',
    'remainingCreditMicroJoules',
    'survivalFundMicroJoules',
  ]);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(contract)) {
    result[key] =
      BIGINT_FIELDS.has(key) && typeof value === 'bigint'
        ? value.toString()
        : value;
  }
  return result;
}

/**
 * Controller for authenticated `/me/burnbag/storage-contracts` endpoints.
 *
 * - `GET /`              — paginated list of contracts for the authenticated member
 * - `GET /:contractId`   — single contract (403 if not owner)
 * - `PATCH /:contractId` — update `autoRenew` flag only
 *
 * Requirements: 7.3, 7.4, 7.5, 7.6
 */
export class StorageContractController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  ContractResponse,
  IStorageContractHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IStorageContractControllerDeps;

  constructor(
    application: IApplication<TID>,
    deps: IStorageContractControllerDeps,
  ) {
    super(application);
    this.deps = deps;
  }

  protected initRouteDefinitions(): void {
    const auth = { useAuthentication: true, useCryptoAuthentication: false };

    this.routeDefinitions = [
      routeConfig('get', '/', { handlerKey: 'listContracts', ...auth }),
      routeConfig('get', '/:contractId', {
        handlerKey: 'getContract',
        ...auth,
      }),
      routeConfig('patch', '/:contractId', {
        handlerKey: 'updateContract',
        ...auth,
      }),
    ];
    this.handlers = {
      listContracts: this.handleListContracts.bind(this),
      getContract: this.handleGetContract.bind(this),
      updateContract: this.handleUpdateContract.bind(this),
    };
  }

  private getMemberId(req: ExpressRequest): string | null {
    return (req.user as { id?: string } | undefined)?.id ?? null;
  }

  private async handleListContracts(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<ContractResponse>> {
    const memberId = this.getMemberId(req);
    if (!memberId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    }

    const contracts =
      await this.deps.storageContractRepository.findByOwner(memberId);
    const serialized = contracts.map((c) =>
      serializeContract(c as unknown as Record<string, unknown>),
    );
    return {
      statusCode: 200,
      response: {
        message: getDigitalBurnbagTranslation(
          DigitalBurnbagStrings.Api_Http_Ok,
        ),
        contracts: serialized,
      } as unknown as ContractResponse,
    };
  }

  private async handleGetContract(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<ContractResponse>> {
    const memberId = this.getMemberId(req);
    if (!memberId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    }

    const contractId = String(req.params['contractId']);
    const contract =
      await this.deps.storageContractRepository.findByContractId(contractId);
    if (!contract) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_ContractNotFoundTemplate,
        { contractId },
      );
      return {
        statusCode: 404,
        response: { message, error: message },
      };
    }

    if (contract.ownerId !== memberId) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_ContractForbidden,
      );
      return {
        statusCode: 403,
        response: { message, error: message },
      };
    }

    return {
      statusCode: 200,
      response: {
        message: getDigitalBurnbagTranslation(
          DigitalBurnbagStrings.Api_Http_Ok,
        ),
        ...serializeContract(contract as unknown as Record<string, unknown>),
      } as unknown as ContractResponse,
    };
  }

  private async handleUpdateContract(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<ContractResponse>> {
    const memberId = this.getMemberId(req);
    if (!memberId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    }

    const contractId = String(req.params['contractId']);
    const body = req.body as Record<string, unknown>;

    // Only allow autoRenew to be changed
    const allowedKeys = new Set(['autoRenew']);
    const receivedKeys = Object.keys(body);
    const disallowedKeys = receivedKeys.filter((k) => !allowedKeys.has(k));
    if (disallowedKeys.length > 0) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_AutoRenewOnly,
        { fields: disallowedKeys.join(', ') },
      );
      return {
        statusCode: 400,
        response: { message, error: message },
      };
    }

    if (typeof body['autoRenew'] !== 'boolean') {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_AutoRenewMustBeBool,
      );
      return {
        statusCode: 400,
        response: { message, error: message },
      };
    }

    const contract =
      await this.deps.storageContractRepository.findByContractId(contractId);
    if (!contract) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_ContractNotFoundTemplate,
        { contractId },
      );
      return {
        statusCode: 404,
        response: { message, error: message },
      };
    }

    if (contract.ownerId !== memberId) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_ContractForbidden,
      );
      return {
        statusCode: 403,
        response: { message, error: message },
      };
    }

    await this.deps.storageContractRepository.updateContract(contractId, {
      autoRenew: body['autoRenew'] as boolean,
    });

    return {
      statusCode: 200,
      response: {
        message: getDigitalBurnbagTranslation(
          DigitalBurnbagStrings.Api_Http_Ok,
        ),
        ...serializeContract({
          ...(contract as unknown as Record<string, unknown>),
          autoRenew: body['autoRenew'],
        }),
      } as unknown as ContractResponse,
    };
  }
}
