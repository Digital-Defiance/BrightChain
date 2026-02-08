import { IDependencyStatus } from '../dependencyStatus';
import { IHealthResponse } from './healthResponse';

/**
 * Detailed health response with dependency checks
 */
export interface IDetailedHealthResponse extends IHealthResponse {
  dependencies: {
    blockStore: IDependencyStatus;
    messageService: IDependencyStatus;
    webSocketServer: IDependencyStatus;
  };
  [key: string]: unknown;
}
