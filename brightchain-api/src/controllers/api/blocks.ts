import {
  ApiErrorResponse,
  ApiRequestHandler,
  ApiResponse,
  IGetBlockResponse,
  IStoreBlockResponse,
  routeConfig,
  TypedHandlers,
} from '@brightchain/brightchain-lib';
import { IApplication } from '../../interfaces/application';
import {
  GetBlockRequest,
  StoreBlockRequest,
} from '../../interfaces/blockRequest';
import { IBlockService } from '../../interfaces/blockService';
import { BlockServiceFactory } from '../../services/blockServiceFactory';
import { BaseController } from '../base';
import { SessionsController } from './sessions';

interface BlocksHandlers extends TypedHandlers<ApiResponse> {
  storeBlock: ApiRequestHandler<IStoreBlockResponse | ApiErrorResponse>;
  getBlock: ApiRequestHandler<IGetBlockResponse | ApiErrorResponse>;
}

export class BlocksController extends BaseController<
  ApiResponse,
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
      routeConfig<ApiResponse, BlocksHandlers>('post', '/', {
        useAuthentication: true,
        handlerKey: 'storeBlock',
      }),
      routeConfig<ApiResponse, BlocksHandlers>('get', '/:blockId', {
        handlerKey: 'getBlock',
        useAuthentication: true,
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
    } = (req as StoreBlockRequest).body;

    // Get authenticated member from session
    const sessionsController = this.application.getController(
      'sessions',
    ) as SessionsController;
    const member = sessionsController.getMemberFromSession(
      req.headers.authorization as string,
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
        message: 'Block stored successfully',
      },
    };
  };

  private handleGetBlock: ApiRequestHandler<
    IGetBlockResponse | ApiErrorResponse
  > = async (req) => {
    const { blockId } = (req as GetBlockRequest).params;

    const block = await this.blocksService.getBlock(blockId);

    return {
      statusCode: 200,
      response: {
        blockId,
        data: block.data.toString('base64'),
        message: 'Block retrieved successfully',
      },
    };
  };
}
