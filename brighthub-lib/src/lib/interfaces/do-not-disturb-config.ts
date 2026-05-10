import { MuteDuration } from '../enumerations/mute-duration';

/**
 * Configuration for Do Not Disturb mode
 */
export interface IDoNotDisturbConfig {
  /** Whether DND is enabled */
  enabled: boolean;
  /** Duration of DND (if temporary) */
  duration?: MuteDuration;
  /** Timestamp when DND expires (ISO string) */
  expiresAt?: string;
}
