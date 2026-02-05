import {
  Checksum,
  EnergyAccountStore,
  EnergyLedger,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

interface IEnergyHandlers extends TypedHandlers {
  getBalance: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getTransactions: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

export class EnergyController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IApiMessageResponse | ApiErrorResponse,
  IEnergyHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/balance', {
        handlerKey: 'getBalance',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/transactions', {
        handlerKey: 'getTransactions',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      getBalance: this.handleGetBalance.bind(this),
      getTransactions: this.handleGetTransactions.bind(this),
    };
  }

  private handleGetBalance: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    const user = (req as { user?: { memberId: string } }).user;

    if (!user) {
      return {
        statusCode: 401,
        response: {
          message: 'Not authenticated',
          error: 'Not authenticated',
        },
      };
    }

    try {
      const energyStore =
        this.application.services.get<EnergyAccountStore>('energyStore');
      const memberChecksum = Checksum.fromHex(user.memberId);
      const account = energyStore.get(memberChecksum);

      if (!account) {
        return {
          statusCode: 404,
          response: {
            message: 'Energy account not found',
            error: 'Energy account not found',
          },
        };
      }

      return {
        statusCode: 200,
        response: {
          message: 'Balance retrieved',
          balance: account.balance,
          earned: account.earned,
          spent: account.spent,
          reserved: account.reserved,
          reputation: account.reputation,
        } as IApiMessageResponse,
      };
    } catch {
      return {
        statusCode: 500,
        response: {
          message: 'Failed to retrieve balance',
          error: 'Failed to retrieve balance',
        },
      };
    }
  };

  private handleGetTransactions: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    const user = (req as { user?: { memberId: string } }).user;

    if (!user) {
      return {
        statusCode: 401,
        response: {
          message: 'Not authenticated',
          error: 'Not authenticated',
        },
      };
    }

    try {
      const energyLedger =
        this.application.services.get<EnergyLedger>('energyLedger');
      const memberChecksum = Checksum.fromHex(user.memberId);
      const transactions = energyLedger.getByMember(memberChecksum);

      // Map transactions to API response format
      const transactionList = transactions.map((tx) => ({
        id: tx.id.toHex(),
        timestamp: tx.timestamp.toISOString(),
        source: tx.source.toHex(),
        destination: tx.destination.toHex(),
        amount: tx.amount,
        operationType: tx.operationType,
        blockId: tx.blockId?.toHex(),
        metadata: tx.metadata,
      }));

      // Sort by timestamp descending (most recent first)
      transactionList.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      return {
        statusCode: 200,
        response: {
          message: 'Transactions retrieved',
          transactions: transactionList,
          count: transactionList.length,
        } as IApiMessageResponse,
      };
    } catch {
      return {
        statusCode: 500,
        response: {
          message: 'Failed to retrieve transactions',
          error: 'Failed to retrieve transactions',
        },
      };
    }
  };
}
