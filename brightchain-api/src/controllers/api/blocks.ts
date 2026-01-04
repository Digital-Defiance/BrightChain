import {
  ApiErrorResponse,
  ApiRequestHandler,
  ApiResponse,
  RouteConfig,
  TypedHandlers,
  routeConfig,
} from '@brightchain/brightchain-api-lib';
import { StringLanguage } from '@brightchain/brightchain-lib';
import { IApplication } from '../../interfaces/application';
import {
  GetBlockRequest,
  StoreBlockRequest,
} from '../../interfaces/blockRequest';
import { IBlockService } from '../../interfaces/blockService';
import {
  IGetBlockResponse,
  IStoreBlockResponse,
} from '../../interfaces/blockResponses';
import { BlockServiceFactory } from '../../services/blockServiceFactory';
import { BaseController } from '../base';
import { SessionsController } from './sessions';

interface BlocksHandlers extends TypedHandlers {
  storeBlock: ApiRequestHandler<IStoreBlockResponse | ApiErrorResponse>;
  getBlock: ApiRequestHandler<IGetBlockResponse | ApiErrorResponse>;
}

export class BlocksController extends BaseController<
  IStoreBlockResponse | IGetBlockResponse | ApiErrorResponse,
  BlocksHandlers
> {
  private blocksService: IBlockService;

  constructor(application: IApplication) {
    super(application);
    this.blocksService =
      BlockServiceFactory.getInstance().getService(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'storeBlock',
      }),
      routeConfig('get', '/:blockId', {
        handlerKey: 'getBlock',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      storeBlock: this.handleStoreBlock.bind(this),
      getBlock: this.handleGetBlock.bind(this),
    };
  }

  private handleStoreBlock: ApiRequestHandler<
    IStoreBlockResponse | ApiErrorResponse
  > = async (req) => {
    const {
      data,
      canRead = true,
      canPersist = true,
    } = (req as unknown as StoreBlockRequest).body;

    // Get authenticated member from session
    const sessionsController = this.application.getController(
      'sessions',
    ) as SessionsController;
    const member = sessionsController.getMemberFromSession(
      (req.headers as any).authorization as string,
    );

    const blockId = await this.blocksService.storeBlock(
      Buffer.from(data, 'base64'),
      member,
      canRead,
      canPersist,
    );

    return {
      statusCode: 200,
      response: {
        blockId,
        success: true,
      },
    };
  };

  private handleGetBlock: ApiRequestHandler<
    IGetBlockResponse | ApiErrorResponse
  > = async (req) => {
    const { blockId } = (req as unknown as GetBlockRequest).params;

    const block = await this.blocksService.getBlock(blockId);

    return {
      statusCode: 200,
      response: {
        blockId,
        data: block.data,
        canRead: true, // TODO: Get from block metadata
        canPersist: true, // TODO: Get from block metadata  
      },
    };
  };
}
