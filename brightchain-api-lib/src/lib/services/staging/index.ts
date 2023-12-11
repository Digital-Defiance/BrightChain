/**
 * Barrel export for the staging service module.
 *
 * Re-exports the core StagingService and its dependency interface,
 * plus the StagingCleanupScheduler and its event types.
 */
export {
  StagingCleanupEvent,
  StagingCleanupScheduler,
} from './stagingCleanupScheduler';
export type {
  IBatchCleanedPayload,
  ICleanupErrorPayload,
  IFileCleanedPayload,
} from './stagingCleanupScheduler';
export { StagingService } from './stagingService';
export type { IStagingServiceDeps } from './stagingService';
