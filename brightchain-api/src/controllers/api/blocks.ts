import {
  ApiRequestHandler,
  IGetBlockResponse,
  IStoreBlockResponse,
  RouteConfig,
} from '@BrightChain/brightchain-lib';
import { IApplication } from '../../interfaces/application';
import {
  GetBlockRequest,
  StoreBlockRequest,
} from '../../interfaces/blockRequest';
import { IBlockService } from '../../interfaces/blocks';
import { BlocksHandlers } from '../../interfaces/blocksHandlers';
import { BlocksResponse } from '../../interfaces/blocksResponse';
import { BlockServiceFactory } from '../../services/blockServiceFactory';
import { BaseController } from '../base';
import { SessionsController } from './sessions';

export class BlocksController extends BaseController<
  BlocksResponse,
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
      {
        method: 'post',
        path: '/',
        handlerKey: 'storeBlock',
        useAuthentication: true,
      },
      {
        method: 'get',
        path: '/:blockId',
        handlerKey: 'getBlock',
        useAuthentication: true,
      },
    ] as RouteConfig<BlocksResponse, BlocksHandlers>[];

    this.handlers = {
      storeBlock: this.handleStoreBlock.bind(this),
      getBlock: this.handleGetBlock.bind(this),
    };
  }

  private handleStoreBlock: ApiRequestHandler<IStoreBlockResponse> = async (
    req,
  ) => {
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
        success: true,
        blockId,
        message: 'Block stored successfully',
      },
    };
  };

  private handleGetBlock: ApiRequestHandler<IGetBlockResponse> = async (
    req,
  ) => {
    const { blockId } = (req as GetBlockRequest).params;

    // Get authenticated member from session
    const sessionsController = this.application.getController(
      'sessions',
    ) as SessionsController;
    const member = sessionsController.getMemberFromSession(
      req.headers.authorization as string,
    );

    const block = await this.blocksService.getBlock(blockId);

    // Check if member has read access
    if (!block.canRead || block.creatorId !== member.id.toString()) {
      throw new Error('Access denied');
    }

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
