import { HealthStatus } from '../../enumerations';

/**
 * Basic health response data
 */
export interface IHealthResponseData {
  status: HealthStatus;
  uptime: number;
  timestamp: string;
  version: string;
}
