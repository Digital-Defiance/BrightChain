import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { HealthStatus } from '../../enumerations';

/**
 * Basic health response
 */
export interface IHealthResponse extends IApiMessageResponse {
  status: HealthStatus;
  uptime: number;
  timestamp: string;
  version: string;
  [key: string]: unknown;
}
