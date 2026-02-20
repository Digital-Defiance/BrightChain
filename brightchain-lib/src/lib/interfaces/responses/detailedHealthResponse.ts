import { IDependencyStatus } from '../dependencyStatus';
import { IHealthResponseData } from './healthResponse';

/**
 * Detailed health response with dependency checks
 */
export interface IDetailedHealthResponseData extends IHealthResponseData {
  dependencies: {
    blockStore: IDependencyStatus;
    messageService: IDependencyStatus;
    webSocketServer: IDependencyStatus;
  };
}
