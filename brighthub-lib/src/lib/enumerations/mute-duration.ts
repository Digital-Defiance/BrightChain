/**
 * Duration options for temporary mutes
 */
export enum MuteDuration {
  /** Mute for 1 hour */
  OneHour = '1h',
  /** Mute for 8 hours */
  EightHours = '8h',
  /** Mute for 24 hours */
  TwentyFourHours = '24h',
  /** Mute for 7 days */
  SevenDays = '7d',
  /** Mute for 30 days */
  ThirtyDays = '30d',
  /** Permanent mute */
  Permanent = 'permanent',
}
