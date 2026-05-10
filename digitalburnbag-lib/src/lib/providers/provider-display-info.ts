import { CanaryProvider } from '../enumerations/canary-provider';
import { DigitalBurnbagStrings } from '../enumerations/digitalburnbag-strings';
import { ProviderCategory } from '../interfaces/canary-provider/canary-provider-adapter';
import {
  IProviderDisplayInfo,
  IProvidersByCategory,
} from '../interfaces/canary-provider/provider-registration';

/**
 * FontAwesome brand icon names for providers.
 * These map to FontAwesome brand icons (fa-brands fa-{icon}).
 * For non-brand icons, use FontAwesome solid icons (fa-solid fa-{icon}).
 */
export enum ProviderIcon {
  // Brand icons (fa-brands)
  FITBIT = 'fa-brands fa-fitbit',
  STRAVA = 'fa-brands fa-strava',
  GITHUB = 'fa-brands fa-github',
  GITLAB = 'fa-brands fa-gitlab',
  BITBUCKET = 'fa-brands fa-bitbucket',
  TWITTER = 'fa-brands fa-x-twitter',
  MASTODON = 'fa-brands fa-mastodon',
  BLUESKY = 'fa-brands fa-bluesky',
  REDDIT = 'fa-brands fa-reddit',
  SLACK = 'fa-brands fa-slack',
  DISCORD = 'fa-brands fa-discord',
  TELEGRAM = 'fa-brands fa-telegram',
  GOOGLE = 'fa-brands fa-google',
  STEAM = 'fa-brands fa-steam',

  // Solid icons for providers without brand icons
  GARMIN = 'fa-solid fa-person-running',
  WHOOP = 'fa-solid fa-heart-pulse',
  OURA = 'fa-solid fa-ring',
  NOTION = 'fa-solid fa-n',
  HOME_ASSISTANT = 'fa-solid fa-house-signal',
  WEBHOOK = 'fa-solid fa-webhook',
  BRIGHTCHAIN = 'fa-solid fa-link',
  CHECK_CIRCLE = 'fa-solid fa-circle-check',
  EMAIL = 'fa-solid fa-envelope',
  SMS = 'fa-solid fa-comment-sms',
}

/**
 * Provider display info configuration.
 * Uses i18n string keys for translatable content.
 */
export interface IProviderDisplayInfoConfig {
  id: string;
  nameKey: string;
  descriptionKey: string;
  dataAccessDescriptionKey: string;
  category: ProviderCategory;
  icon: ProviderIcon | string;
  brandColor?: string;
  requiresOAuth: boolean;
  supportsApiKey: boolean;
  supportsWebhook: boolean;
  requestedScopes: string[];
  privacyPolicyUrl?: string;
  appSettingsUrl?: string;
  isBuiltIn: boolean;
  recommendedCheckIntervalKey: string;
  minCheckIntervalMs: number;
  isAvailable: boolean;
  unavailableReason?: string;
}

/**
 * Built-in provider configurations with i18n keys.
 */
export const PROVIDER_CONFIGS: Record<string, IProviderDisplayInfoConfig> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH & FITNESS
  // ═══════════════════════════════════════════════════════════════════════════

  [CanaryProvider.FITBIT]: {
    id: CanaryProvider.FITBIT,
    nameKey: DigitalBurnbagStrings.ProviderName_Fitbit,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Fitbit,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Fitbit,
    category: ProviderCategory.HEALTH_FITNESS,
    icon: ProviderIcon.FITBIT,
    brandColor: '#00B0B9',
    requiresOAuth: true,
    supportsApiKey: false,
    supportsWebhook: true,
    requestedScopes: ['activity', 'heartrate', 'sleep', 'profile'],
    privacyPolicyUrl: 'https://www.fitbit.com/legal/privacy-policy',
    appSettingsUrl: 'https://www.fitbit.com/settings/applications',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_EveryHour,
    minCheckIntervalMs: 60 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.STRAVA]: {
    id: CanaryProvider.STRAVA,
    nameKey: DigitalBurnbagStrings.ProviderName_Strava,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Strava,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Strava,
    category: ProviderCategory.HEALTH_FITNESS,
    icon: ProviderIcon.STRAVA,
    brandColor: '#FC4C02',
    requiresOAuth: true,
    supportsApiKey: false,
    supportsWebhook: true,
    requestedScopes: ['read', 'activity:read'],
    privacyPolicyUrl: 'https://www.strava.com/legal/privacy',
    appSettingsUrl: 'https://www.strava.com/settings/apps',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every30Minutes,
    minCheckIntervalMs: 30 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.GARMIN]: {
    id: CanaryProvider.GARMIN,
    nameKey: DigitalBurnbagStrings.ProviderName_Garmin,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Garmin,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Garmin,
    category: ProviderCategory.HEALTH_FITNESS,
    icon: ProviderIcon.GARMIN,
    brandColor: '#007CC3',
    requiresOAuth: true,
    supportsApiKey: false,
    supportsWebhook: true,
    requestedScopes: ['activity', 'health'],
    privacyPolicyUrl: 'https://www.garmin.com/en-US/privacy/connect/',
    appSettingsUrl: 'https://connect.garmin.com/modern/settings',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_EveryHour,
    minCheckIntervalMs: 60 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.WHOOP]: {
    id: CanaryProvider.WHOOP,
    nameKey: DigitalBurnbagStrings.ProviderName_Whoop,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Whoop,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Whoop,
    category: ProviderCategory.HEALTH_FITNESS,
    icon: ProviderIcon.WHOOP,
    brandColor: '#000000',
    requiresOAuth: true,
    supportsApiKey: false,
    supportsWebhook: false,
    requestedScopes: ['read:recovery', 'read:cycles'],
    privacyPolicyUrl: 'https://www.whoop.com/privacy/',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every2Hours,
    minCheckIntervalMs: 2 * 60 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.OURA]: {
    id: CanaryProvider.OURA,
    nameKey: DigitalBurnbagStrings.ProviderName_Oura,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Oura,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Oura,
    category: ProviderCategory.HEALTH_FITNESS,
    icon: ProviderIcon.OURA,
    brandColor: '#FFFFFF',
    requiresOAuth: true,
    supportsApiKey: true,
    supportsWebhook: false,
    requestedScopes: ['daily', 'personal'],
    privacyPolicyUrl: 'https://ouraring.com/privacy-policy',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every4Hours,
    minCheckIntervalMs: 4 * 60 * 60 * 1000,
    isAvailable: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVELOPER PLATFORMS
  // ═══════════════════════════════════════════════════════════════════════════

  [CanaryProvider.GITHUB]: {
    id: CanaryProvider.GITHUB,
    nameKey: DigitalBurnbagStrings.ProviderName_GitHub,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_GitHub,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_GitHub,
    category: ProviderCategory.DEVELOPER,
    icon: ProviderIcon.GITHUB,
    brandColor: '#181717',
    requiresOAuth: true,
    supportsApiKey: true,
    supportsWebhook: true,
    requestedScopes: ['read:user', 'repo'],
    privacyPolicyUrl: 'https://docs.github.com/en/site-policy/privacy-policies',
    appSettingsUrl: 'https://github.com/settings/applications',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every15Minutes,
    minCheckIntervalMs: 15 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.GITLAB]: {
    id: CanaryProvider.GITLAB,
    nameKey: DigitalBurnbagStrings.ProviderName_GitLab,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_GitLab,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_GitLab,
    category: ProviderCategory.DEVELOPER,
    icon: ProviderIcon.GITLAB,
    brandColor: '#FC6D26',
    requiresOAuth: true,
    supportsApiKey: true,
    supportsWebhook: true,
    requestedScopes: ['read_user', 'read_api'],
    privacyPolicyUrl: 'https://about.gitlab.com/privacy/',
    appSettingsUrl: 'https://gitlab.com/-/profile/applications',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every15Minutes,
    minCheckIntervalMs: 15 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.BITBUCKET]: {
    id: CanaryProvider.BITBUCKET,
    nameKey: DigitalBurnbagStrings.ProviderName_Bitbucket,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Bitbucket,
    dataAccessDescriptionKey:
      DigitalBurnbagStrings.ProviderDataAccess_Bitbucket,
    category: ProviderCategory.DEVELOPER,
    icon: ProviderIcon.BITBUCKET,
    brandColor: '#0052CC',
    requiresOAuth: true,
    supportsApiKey: true,
    supportsWebhook: true,
    requestedScopes: ['account', 'repository'],
    privacyPolicyUrl: 'https://www.atlassian.com/legal/privacy-policy',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every15Minutes,
    minCheckIntervalMs: 15 * 60 * 1000,
    isAvailable: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCIAL MEDIA
  // ═══════════════════════════════════════════════════════════════════════════

  [CanaryProvider.TWITTER]: {
    id: CanaryProvider.TWITTER,
    nameKey: DigitalBurnbagStrings.ProviderName_Twitter,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Twitter,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Twitter,
    category: ProviderCategory.SOCIAL_MEDIA,
    icon: ProviderIcon.TWITTER,
    brandColor: '#000000',
    requiresOAuth: true,
    supportsApiKey: false,
    supportsWebhook: false,
    requestedScopes: ['tweet.read', 'users.read', 'offline.access'],
    privacyPolicyUrl: 'https://twitter.com/en/privacy',
    appSettingsUrl: 'https://twitter.com/settings/connected_apps',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every15Minutes,
    minCheckIntervalMs: 15 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.MASTODON]: {
    id: CanaryProvider.MASTODON,
    nameKey: DigitalBurnbagStrings.ProviderName_Mastodon,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Mastodon,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Mastodon,
    category: ProviderCategory.SOCIAL_MEDIA,
    icon: ProviderIcon.MASTODON,
    brandColor: '#6364FF',
    requiresOAuth: true,
    supportsApiKey: true,
    supportsWebhook: false,
    requestedScopes: ['read:accounts', 'read:statuses'],
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every15Minutes,
    minCheckIntervalMs: 15 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.BLUESKY]: {
    id: CanaryProvider.BLUESKY,
    nameKey: DigitalBurnbagStrings.ProviderName_Bluesky,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Bluesky,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Bluesky,
    category: ProviderCategory.SOCIAL_MEDIA,
    icon: ProviderIcon.BLUESKY,
    brandColor: '#0085FF',
    requiresOAuth: false,
    supportsApiKey: true,
    supportsWebhook: false,
    requestedScopes: [],
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every15Minutes,
    minCheckIntervalMs: 15 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.REDDIT]: {
    id: CanaryProvider.REDDIT,
    nameKey: DigitalBurnbagStrings.ProviderName_Reddit,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Reddit,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Reddit,
    category: ProviderCategory.SOCIAL_MEDIA,
    icon: ProviderIcon.REDDIT,
    brandColor: '#FF4500',
    requiresOAuth: true,
    supportsApiKey: false,
    supportsWebhook: false,
    requestedScopes: ['identity', 'history', 'read'],
    privacyPolicyUrl: 'https://www.reddit.com/policies/privacy-policy',
    appSettingsUrl: 'https://www.reddit.com/prefs/apps',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every30Minutes,
    minCheckIntervalMs: 30 * 60 * 1000,
    isAvailable: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════

  [CanaryProvider.SLACK]: {
    id: CanaryProvider.SLACK,
    nameKey: DigitalBurnbagStrings.ProviderName_Slack,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Slack,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Slack,
    category: ProviderCategory.COMMUNICATION,
    icon: ProviderIcon.SLACK,
    brandColor: '#4A154B',
    requiresOAuth: true,
    supportsApiKey: false,
    supportsWebhook: true,
    requestedScopes: ['users:read', 'users.profile:read'],
    privacyPolicyUrl: 'https://slack.com/privacy-policy',
    appSettingsUrl: 'https://slack.com/apps/manage',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every5Minutes,
    minCheckIntervalMs: 5 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.DISCORD]: {
    id: CanaryProvider.DISCORD,
    nameKey: DigitalBurnbagStrings.ProviderName_Discord,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Discord,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Discord,
    category: ProviderCategory.COMMUNICATION,
    icon: ProviderIcon.DISCORD,
    brandColor: '#5865F2',
    requiresOAuth: true,
    supportsApiKey: false,
    supportsWebhook: true,
    requestedScopes: ['identify', 'guilds'],
    privacyPolicyUrl: 'https://discord.com/privacy',
    appSettingsUrl: 'https://discord.com/settings/authorized-apps',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every5Minutes,
    minCheckIntervalMs: 5 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.TELEGRAM]: {
    id: CanaryProvider.TELEGRAM,
    nameKey: DigitalBurnbagStrings.ProviderName_Telegram,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Telegram,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Telegram,
    category: ProviderCategory.COMMUNICATION,
    icon: ProviderIcon.TELEGRAM,
    brandColor: '#26A5E4',
    requiresOAuth: false,
    supportsApiKey: true,
    supportsWebhook: true,
    requestedScopes: [],
    privacyPolicyUrl: 'https://telegram.org/privacy',
    isBuiltIn: true,
    recommendedCheckIntervalKey: DigitalBurnbagStrings.ProviderInterval_Manual,
    minCheckIntervalMs: 60 * 60 * 1000,
    isAvailable: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTIVITY
  // ═══════════════════════════════════════════════════════════════════════════

  [CanaryProvider.GOOGLE]: {
    id: CanaryProvider.GOOGLE,
    nameKey: DigitalBurnbagStrings.ProviderName_Google,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Google,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Google,
    category: ProviderCategory.PRODUCTIVITY,
    icon: ProviderIcon.GOOGLE,
    brandColor: '#4285F4',
    requiresOAuth: true,
    supportsApiKey: false,
    supportsWebhook: true,
    requestedScopes: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    privacyPolicyUrl: 'https://policies.google.com/privacy',
    appSettingsUrl: 'https://myaccount.google.com/permissions',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_EveryHour,
    minCheckIntervalMs: 60 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.NOTION]: {
    id: CanaryProvider.NOTION,
    nameKey: DigitalBurnbagStrings.ProviderName_Notion,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Notion,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Notion,
    category: ProviderCategory.PRODUCTIVITY,
    icon: ProviderIcon.NOTION,
    brandColor: '#000000',
    requiresOAuth: true,
    supportsApiKey: true,
    supportsWebhook: false,
    requestedScopes: ['read_user'],
    privacyPolicyUrl: 'https://www.notion.so/Privacy-Policy',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every30Minutes,
    minCheckIntervalMs: 30 * 60 * 1000,
    isAvailable: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IOT & SMART HOME
  // ═══════════════════════════════════════════════════════════════════════════

  [CanaryProvider.HOME_ASSISTANT]: {
    id: CanaryProvider.HOME_ASSISTANT,
    nameKey: DigitalBurnbagStrings.ProviderName_HomeAssistant,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_HomeAssistant,
    dataAccessDescriptionKey:
      DigitalBurnbagStrings.ProviderDataAccess_HomeAssistant,
    category: ProviderCategory.IOT_SMART_HOME,
    icon: ProviderIcon.HOME_ASSISTANT,
    brandColor: '#41BDF5',
    requiresOAuth: false,
    supportsApiKey: true,
    supportsWebhook: true,
    requestedScopes: [],
    privacyPolicyUrl: 'https://www.home-assistant.io/privacy/',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every5Minutes,
    minCheckIntervalMs: 5 * 60 * 1000,
    isAvailable: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GAMING
  // ═══════════════════════════════════════════════════════════════════════════

  [CanaryProvider.STEAM]: {
    id: CanaryProvider.STEAM,
    nameKey: DigitalBurnbagStrings.ProviderName_Steam,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_Steam,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_Steam,
    category: ProviderCategory.GAMING,
    icon: ProviderIcon.STEAM,
    brandColor: '#1B2838',
    requiresOAuth: false,
    supportsApiKey: true,
    supportsWebhook: false,
    requestedScopes: [],
    privacyPolicyUrl: 'https://store.steampowered.com/privacy_agreement/',
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Every30Minutes,
    minCheckIntervalMs: 30 * 60 * 1000,
    isAvailable: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════

  [CanaryProvider.CUSTOM_WEBHOOK]: {
    id: CanaryProvider.CUSTOM_WEBHOOK,
    nameKey: DigitalBurnbagStrings.ProviderName_CustomWebhook,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_CustomWebhook,
    dataAccessDescriptionKey:
      DigitalBurnbagStrings.ProviderDataAccess_CustomWebhook,
    category: ProviderCategory.CUSTOM_WEBHOOK,
    icon: ProviderIcon.WEBHOOK,
    brandColor: '#6B7280',
    requiresOAuth: false,
    supportsApiKey: false,
    supportsWebhook: true,
    requestedScopes: [],
    isBuiltIn: true,
    recommendedCheckIntervalKey: DigitalBurnbagStrings.ProviderInterval_Custom,
    minCheckIntervalMs: 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.BIRDBAG]: {
    id: CanaryProvider.BIRDBAG,
    nameKey: DigitalBurnbagStrings.ProviderName_BrightChain,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_BrightChain,
    dataAccessDescriptionKey:
      DigitalBurnbagStrings.ProviderDataAccess_BrightChain,
    category: ProviderCategory.PLATFORM_NATIVE,
    icon: ProviderIcon.BRIGHTCHAIN,
    brandColor: '#3B82F6',
    requiresOAuth: false,
    supportsApiKey: false,
    supportsWebhook: false,
    requestedScopes: [],
    isBuiltIn: true,
    recommendedCheckIntervalKey:
      DigitalBurnbagStrings.ProviderInterval_Automatic,
    minCheckIntervalMs: 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.MANUAL_CHECKIN]: {
    id: CanaryProvider.MANUAL_CHECKIN,
    nameKey: DigitalBurnbagStrings.ProviderName_ManualCheckin,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_ManualCheckin,
    dataAccessDescriptionKey:
      DigitalBurnbagStrings.ProviderDataAccess_ManualCheckin,
    category: ProviderCategory.PLATFORM_NATIVE,
    icon: ProviderIcon.CHECK_CIRCLE,
    brandColor: '#10B981',
    requiresOAuth: false,
    supportsApiKey: false,
    supportsWebhook: false,
    requestedScopes: [],
    isBuiltIn: true,
    recommendedCheckIntervalKey: DigitalBurnbagStrings.ProviderInterval_Daily,
    minCheckIntervalMs: 24 * 60 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.EMAIL_PING]: {
    id: CanaryProvider.EMAIL_PING,
    nameKey: DigitalBurnbagStrings.ProviderName_EmailPing,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_EmailPing,
    dataAccessDescriptionKey:
      DigitalBurnbagStrings.ProviderDataAccess_EmailPing,
    category: ProviderCategory.PLATFORM_NATIVE,
    icon: ProviderIcon.EMAIL,
    brandColor: '#6366F1',
    requiresOAuth: false,
    supportsApiKey: false,
    supportsWebhook: false,
    requestedScopes: [],
    isBuiltIn: true,
    recommendedCheckIntervalKey: DigitalBurnbagStrings.ProviderInterval_Daily,
    minCheckIntervalMs: 24 * 60 * 60 * 1000,
    isAvailable: true,
  },

  [CanaryProvider.SMS_PING]: {
    id: CanaryProvider.SMS_PING,
    nameKey: DigitalBurnbagStrings.ProviderName_SmsPing,
    descriptionKey: DigitalBurnbagStrings.ProviderDesc_SmsPing,
    dataAccessDescriptionKey: DigitalBurnbagStrings.ProviderDataAccess_SmsPing,
    category: ProviderCategory.PLATFORM_NATIVE,
    icon: ProviderIcon.SMS,
    brandColor: '#8B5CF6',
    requiresOAuth: false,
    supportsApiKey: false,
    supportsWebhook: false,
    requestedScopes: [],
    isBuiltIn: true,
    recommendedCheckIntervalKey: DigitalBurnbagStrings.ProviderInterval_Daily,
    minCheckIntervalMs: 24 * 60 * 60 * 1000,
    isAvailable: true,
  },
};

/**
 * Category display info with i18n keys.
 */
export const CATEGORY_INFO: Record<
  ProviderCategory,
  { nameKey: string; descriptionKey: string; order: number }
> = {
  [ProviderCategory.PLATFORM_NATIVE]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_PlatformNative,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_PlatformNativeDesc,
    order: 0,
  },
  [ProviderCategory.HEALTH_FITNESS]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_HealthFitness,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_HealthFitnessDesc,
    order: 1,
  },
  [ProviderCategory.DEVELOPER]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_Developer,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_DeveloperDesc,
    order: 2,
  },
  [ProviderCategory.COMMUNICATION]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_Communication,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_CommunicationDesc,
    order: 3,
  },
  [ProviderCategory.SOCIAL_MEDIA]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_SocialMedia,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_SocialMediaDesc,
    order: 4,
  },
  [ProviderCategory.PRODUCTIVITY]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_Productivity,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_ProductivityDesc,
    order: 5,
  },
  [ProviderCategory.IOT_SMART_HOME]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_SmartHome,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_SmartHomeDesc,
    order: 6,
  },
  [ProviderCategory.GAMING]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_Gaming,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_GamingDesc,
    order: 7,
  },
  [ProviderCategory.FINANCIAL]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_Financial,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_FinancialDesc,
    order: 8,
  },
  [ProviderCategory.EMAIL]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_Email,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_EmailDesc,
    order: 9,
  },
  [ProviderCategory.CUSTOM_WEBHOOK]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_CustomIntegration,
    descriptionKey:
      DigitalBurnbagStrings.ProviderCategory_CustomIntegrationDesc,
    order: 10,
  },
  [ProviderCategory.LOCATION]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_Location,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_LocationDesc,
    order: 11,
  },
  [ProviderCategory.ENTERTAINMENT]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_Entertainment,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_EntertainmentDesc,
    order: 12,
  },
  [ProviderCategory.OTHER]: {
    nameKey: DigitalBurnbagStrings.ProviderCategory_Other,
    descriptionKey: DigitalBurnbagStrings.ProviderCategory_OtherDesc,
    order: 13,
  },
};

/**
 * Translator function type for resolving i18n keys.
 */
export type TranslatorFn = (key: string) => string;

/**
 * Convert a provider config to display info using a translator function.
 */
export function configToDisplayInfo(
  config: IProviderDisplayInfoConfig,
  t: TranslatorFn,
): IProviderDisplayInfo {
  return {
    id: config.id,
    name: t(config.nameKey),
    description: t(config.descriptionKey),
    category: config.category,
    icon: config.icon,
    brandColor: config.brandColor,
    requiresOAuth: config.requiresOAuth,
    supportsApiKey: config.supportsApiKey,
    supportsWebhook: config.supportsWebhook,
    requestedScopes: config.requestedScopes,
    dataAccessDescription: t(config.dataAccessDescriptionKey),
    privacyPolicyUrl: config.privacyPolicyUrl,
    appSettingsUrl: config.appSettingsUrl,
    isBuiltIn: config.isBuiltIn,
    recommendedCheckInterval: t(config.recommendedCheckIntervalKey),
    minCheckIntervalMs: config.minCheckIntervalMs,
    isAvailable: config.isAvailable,
    unavailableReason: config.unavailableReason,
  };
}

/**
 * Get all providers grouped by category with translated strings.
 */
export function getProvidersByCategory(
  t: TranslatorFn,
): IProvidersByCategory[] {
  const byCategory = new Map<ProviderCategory, IProviderDisplayInfo[]>();

  for (const config of Object.values(PROVIDER_CONFIGS)) {
    if (!config.isAvailable) continue;
    const displayInfo = configToDisplayInfo(config, t);
    const list = byCategory.get(config.category) || [];
    list.push(displayInfo);
    byCategory.set(config.category, list);
  }

  return Array.from(byCategory.entries())
    .map(([category, providers]) => ({
      category,
      categoryName: t(CATEGORY_INFO[category]?.nameKey || category),
      categoryDescription: t(CATEGORY_INFO[category]?.descriptionKey || ''),
      providers: providers.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort(
      (a, b) =>
        (CATEGORY_INFO[a.category]?.order ?? 99) -
        (CATEGORY_INFO[b.category]?.order ?? 99),
    );
}

/**
 * Get a specific provider's display info with translated strings.
 */
export function getProviderDisplayInfo(
  providerId: string,
  t: TranslatorFn,
): IProviderDisplayInfo | undefined {
  const config = PROVIDER_CONFIGS[providerId];
  if (!config) return undefined;
  return configToDisplayInfo(config, t);
}

/**
 * Get a specific provider's config (without translation).
 */
export function getProviderConfig(
  providerId: string,
): IProviderDisplayInfoConfig | undefined {
  return PROVIDER_CONFIGS[providerId];
}

/**
 * Get all available providers as a flat list with translated strings.
 */
export function getAllProviders(t: TranslatorFn): IProviderDisplayInfo[] {
  return Object.values(PROVIDER_CONFIGS)
    .filter((config) => config.isAvailable)
    .map((config) => configToDisplayInfo(config, t));
}

/**
 * Get all provider configs (without translation).
 */
export function getAllProviderConfigs(): IProviderDisplayInfoConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter((config) => config.isAvailable);
}

/**
 * Get category info with translated strings.
 */
export function getCategoryInfo(
  category: ProviderCategory,
  t: TranslatorFn,
): { name: string; description: string; order: number } {
  const info = CATEGORY_INFO[category];
  return {
    name: t(info.nameKey),
    description: t(info.descriptionKey),
    order: info.order,
  };
}

/**
 * Search providers by name or description.
 */
export function searchProviders(
  query: string,
  t: TranslatorFn,
): IProviderDisplayInfo[] {
  const lowerQuery = query.toLowerCase();
  return getAllProviders(t).filter(
    (provider) =>
      provider.name.toLowerCase().includes(lowerQuery) ||
      provider.description.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Filter providers by category.
 */
export function filterProvidersByCategory(
  category: ProviderCategory,
  t: TranslatorFn,
): IProviderDisplayInfo[] {
  return Object.values(PROVIDER_CONFIGS)
    .filter((config) => config.isAvailable && config.category === category)
    .map((config) => configToDisplayInfo(config, t));
}
