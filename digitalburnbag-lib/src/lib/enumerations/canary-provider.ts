/**
 * @enum CanaryProvider
 * @description Well-known provider identifiers for built-in canary providers.
 *
 * These map to provider configurations in the extensible provider system.
 * For custom providers, use the provider configuration ID directly instead
 * of this enum.
 *
 * @see ICanaryProviderConfig for the extensible provider configuration system
 * @see BUILTIN_PROVIDER_CONFIGS for the full provider configurations
 */
export enum CanaryProvider {
  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH & FITNESS PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fitbit - Health and fitness tracking (steps, heart rate, sleep).
   * Good for detecting daily activity patterns.
   */
  FITBIT = 'fitbit',

  /**
   * Strava - Athletic activity tracking (runs, rides, workouts).
   * Good for detecting regular exercise patterns.
   */
  STRAVA = 'strava',

  /**
   * Apple Health - iOS health data aggregator.
   * Requires custom webhook integration.
   */
  APPLE_HEALTH = 'apple_health',

  /**
   * Google Fit - Android health data aggregator.
   */
  GOOGLE_FIT = 'google_fit',

  /**
   * Garmin - Fitness device and activity tracking.
   */
  GARMIN = 'garmin',

  /**
   * Whoop - Recovery and strain tracking.
   */
  WHOOP = 'whoop',

  /**
   * Oura - Sleep and readiness tracking.
   */
  OURA = 'oura',

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCIAL MEDIA PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Twitter/X - Social media activity (tweets, likes, retweets).
   */
  TWITTER = 'twitter',

  /**
   * Facebook - Social media activity.
   * Limited API access available.
   */
  FACEBOOK = 'facebook',

  /**
   * Instagram - Photo/video sharing activity.
   * Limited API access available.
   */
  INSTAGRAM = 'instagram',

  /**
   * LinkedIn - Professional network activity.
   */
  LINKEDIN = 'linkedin',

  /**
   * Mastodon - Federated social network.
   * Requires instance-specific configuration.
   */
  MASTODON = 'mastodon',

  /**
   * Bluesky - Decentralized social network.
   */
  BLUESKY = 'bluesky',

  /**
   * Reddit - Forum activity (posts, comments).
   */
  REDDIT = 'reddit',

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVELOPER PLATFORMS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GitHub - Code repository activity (commits, issues, PRs).
   * Excellent for developers - high signal activity.
   */
  GITHUB = 'github',

  /**
   * GitLab - Code repository activity.
   */
  GITLAB = 'gitlab',

  /**
   * Bitbucket - Code repository activity.
   */
  BITBUCKET = 'bitbucket',

  /**
   * Stack Overflow - Q&A activity.
   */
  STACKOVERFLOW = 'stackoverflow',

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNICATION PLATFORMS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Slack - Workspace messaging presence and activity.
   */
  SLACK = 'slack',

  /**
   * Discord - Community messaging presence and activity.
   */
  DISCORD = 'discord',

  /**
   * Microsoft Teams - Workplace messaging.
   */
  TEAMS = 'teams',

  /**
   * Telegram - Messaging app (requires bot integration).
   */
  TELEGRAM = 'telegram',

  /**
   * Signal - Secure messaging (limited API).
   */
  SIGNAL = 'signal',

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTIVITY & EMAIL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Google - Google account activity (Gmail, Calendar, etc.).
   */
  GOOGLE = 'google',

  /**
   * Microsoft 365 - Office activity (Outlook, OneDrive, etc.).
   */
  MICROSOFT_365 = 'microsoft_365',

  /**
   * Notion - Workspace activity.
   */
  NOTION = 'notion',

  /**
   * Todoist - Task management activity.
   */
  TODOIST = 'todoist',

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCIAL SERVICES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Plaid - Banking activity aggregator.
   * Detects financial transactions.
   */
  PLAID = 'plaid',

  // ═══════════════════════════════════════════════════════════════════════════
  // IOT & SMART HOME
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Home Assistant - Smart home activity.
   * Detects presence via motion sensors, door sensors, etc.
   */
  HOME_ASSISTANT = 'home_assistant',

  /**
   * SmartThings - Samsung smart home.
   */
  SMARTTHINGS = 'smartthings',

  // ═══════════════════════════════════════════════════════════════════════════
  // GAMING PLATFORMS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Steam - Gaming platform activity.
   */
  STEAM = 'steam',

  /**
   * Xbox Live - Gaming activity.
   */
  XBOX = 'xbox',

  /**
   * PlayStation Network - Gaming activity.
   */
  PLAYSTATION = 'playstation',

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Custom webhook - User-defined webhook endpoint.
   * Allows integration with any service that can send HTTP requests.
   */
  CUSTOM_WEBHOOK = 'custom_webhook',

  /**
   * BrightChain/DigitalBurnbag - Native platform activity.
   * Monitors activity on our own platform (logins, file access, etc.).
   * Highest trust level.
   */
  BIRDBAG = 'birdbag',

  /**
   * Manual check-in - User manually confirms presence.
   * Fallback for users without automated providers.
   */
  MANUAL_CHECKIN = 'manual_checkin',

  /**
   * Email ping - Responds to periodic email challenges.
   * Low-tech fallback option.
   */
  EMAIL_PING = 'email_ping',

  /**
   * SMS ping - Responds to periodic SMS challenges.
   * Low-tech fallback option.
   */
  SMS_PING = 'sms_ping',
}
