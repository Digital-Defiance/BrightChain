import {
  ApiResponse,
  BrightChainMember,
  TypedHandlers,
} from '@BrightChain/brightchain-lib';
import { BlocksController } from '../controllers/api/blocks';
import { MembersController } from '../controllers/api/members';
import { SessionsController } from '../controllers/api/sessions';
import { BaseController } from '../controllers/base';

export interface IApplication {
  getController(name: 'blocks'): BlocksController;
  getController(name: 'members'): MembersController;
  getController(name: 'sessions'): SessionsController;
  getController<TResponse extends ApiResponse>(
    name: string,
  ): BaseController<TResponse, TypedHandlers<TResponse>>;
  nodeAgent: BrightChainMember;
  clusterAgentPublicKeys: Buffer[];
}
