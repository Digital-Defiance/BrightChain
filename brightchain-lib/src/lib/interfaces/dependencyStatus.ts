import { HealthStatus } from '../enumerations/healthStatus';

/**
 * Dependency health status
 */
export interface IDependencyStatus {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
}
