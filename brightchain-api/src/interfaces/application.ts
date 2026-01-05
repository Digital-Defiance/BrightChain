/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { ApiResponse, TypedHandlers } from '@brightchain/brightchain-api-lib';
import { BrightChainMember } from '@brightchain/brightchain-lib';
import { BlocksController } from '../controllers/api/blocks';
import { MembersController } from '../controllers/api/members';
import { SessionsController } from '../controllers/api/sessions';
import { BaseController } from '../controllers/base';

export interface IApplication {
  id: string;
  getController(name: 'blocks'): BlocksController;
  getController(name: 'members'): MembersController;
  getController(name: 'sessions'): SessionsController;
  getController<TResponse extends ApiResponse>(
    name: string,
  ): BaseController<TResponse, TypedHandlers>;
  getModel<T>(name: string): any;
  nodeAgent: BrightChainMember;
  clusterAgentPublicKeys: Buffer[];
}
