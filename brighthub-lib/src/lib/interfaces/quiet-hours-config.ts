/**
 * Configuration for quiet hours (notification suppression)
 */
export interface IQuietHoursConfig {
  /** Whether quiet hours are enabled */
  enabled: boolean;
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
  /** Timezone for the quiet hours (e.g., 'America/New_York') */
  timezone: string;
}
