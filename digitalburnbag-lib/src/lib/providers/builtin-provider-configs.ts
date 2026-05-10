import {
  ICanaryProviderConfig,
  ProviderCategory,
} from '../interfaces/canary-provider';

/**
 * Built-in provider configurations.
 * These can be used as-is or as templates for custom providers.
 */

/**
 * GitHub provider configuration.
 * Monitors commits, issues, PRs, and other GitHub activity.
 */
export const GITHUB_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'github',
  name: 'GitHub',
  description:
    'Monitor GitHub activity including commits, issues, pull requests, and comments',
  category: ProviderCategory.DEVELOPER,
  icon: 'github',
  baseUrl: 'https://api.github.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      clientId: '', // Set via environment
      clientSecret: '', // Set via environment
      scopes: ['read:user', 'repo'],
      redirectUri: '', // Set via environment
    },
  },
  rateLimit: {
    maxRequests: 5000,
    windowMs: 60 * 60 * 1000, // 1 hour
    minDelayMs: 100,
  },
  endpoints: {
    activity: {
      path: '/users/{userId}/events',
      method: 'GET',
      queryParams: {
        per_page: '100',
      },
      responseMapping: {
        eventsPath: '$',
        timestampPath: 'created_at',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/user',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/user',
      method: 'GET',
      userIdPath: 'login',
      usernamePath: 'name',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  customHeaders: {
    Accept: 'application/vnd.github.v3+json',
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Fitbit provider configuration.
 * Monitors steps, heart rate, sleep, and other fitness data.
 */
export const FITBIT_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'fitbit',
  name: 'Fitbit',
  description:
    'Monitor Fitbit activity including steps, heart rate, and sleep data',
  category: ProviderCategory.HEALTH_FITNESS,
  icon: 'fitbit',
  baseUrl: 'https://api.fitbit.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://www.fitbit.com/oauth2/authorize',
      tokenUrl: 'https://api.fitbit.com/oauth2/token',
      clientId: '',
      clientSecret: '',
      scopes: ['activity', 'heartrate', 'sleep', 'profile'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 150,
    windowMs: 60 * 60 * 1000, // 1 hour
    minDelayMs: 500,
  },
  endpoints: {
    activity: {
      path: '/1/user/-/activities/date/{date}.json',
      method: 'GET',
      responseMapping: {
        eventsPath: '$.activities',
        timestampPath: 'startTime',
        timestampFormat: 'iso8601',
        activityTypePath: 'activityName',
        numericValuePath: 'steps',
        eventIdPath: 'logId',
      },
    },
    healthCheck: {
      path: '/1/user/-/profile.json',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/1/user/-/profile.json',
      method: 'GET',
      userIdPath: 'user.encodedId',
      usernamePath: 'user.displayName',
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 60 * 60 * 1000, // 1 hour (Fitbit syncs infrequently)
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Strava provider configuration.
 * Monitors running, cycling, and other athletic activities.
 */
export const STRAVA_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'strava',
  name: 'Strava',
  description: 'Monitor Strava activities including runs, rides, and workouts',
  category: ProviderCategory.HEALTH_FITNESS,
  icon: 'strava',
  baseUrl: 'https://www.strava.com/api/v3',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://www.strava.com/oauth/authorize',
      tokenUrl: 'https://www.strava.com/oauth/token',
      clientId: '',
      clientSecret: '',
      scopes: ['read', 'activity:read'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    minDelayMs: 1000,
  },
  endpoints: {
    activity: {
      path: '/athlete/activities',
      method: 'GET',
      queryParams: {
        per_page: '30',
        after: '{sinceUnix}',
      },
      responseMapping: {
        eventsPath: '$',
        timestampPath: 'start_date',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        eventIdPath: 'id',
        numericValuePath: 'distance',
        locationPaths: {
          latitude: 'start_latlng[0]',
          longitude: 'start_latlng[1]',
        },
      },
    },
    healthCheck: {
      path: '/athlete',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/athlete',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'username',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Apple Health provider configuration.
 * Monitors health data via HealthKit web export (steps, workouts, heart rate).
 */
export const APPLE_HEALTH_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'apple_health',
  name: 'Apple Health',
  description:
    'Monitor Apple Health data including steps, workouts, and heart rate summaries via HealthKit export',
  category: ProviderCategory.HEALTH_FITNESS,
  icon: 'apple_health',
  baseUrl: 'https://api.apple-healthkit.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      clientId: '',
      clientSecret: '',
      scopes: ['healthkit.read', 'openid'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    minDelayMs: 600,
  },
  endpoints: {
    activity: {
      path: '/v1/me/health/activity',
      method: 'GET',
      queryParams: {
        start_date: '{since_date}',
        end_date: '{until_date}',
      },
      responseMapping: {
        eventsPath: '$.data.activities',
        timestampPath: 'dateOfActivity',
        timestampFormat: 'iso8601',
        activityTypePath: 'activityType',
        numericValuePath: 'steps',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/v1/me/profile',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Google Fit provider configuration.
 * Monitors daily activity summary, step count, heart points, and workout sessions.
 */
export const GOOGLE_FIT_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'google_fit',
  name: 'Google Fit',
  description:
    'Monitor Google Fit activity including steps, heart points, and workout sessions',
  category: ProviderCategory.HEALTH_FITNESS,
  icon: 'google_fit',
  baseUrl: 'https://www.googleapis.com/fitness/v1',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: '',
      clientSecret: '',
      scopes: [
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.body.read',
      ],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 100,
  },
  endpoints: {
    activity: {
      path: '/users/me/dataset:aggregate',
      method: 'POST',
      bodyTemplate: JSON.stringify({
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.heart_minutes' },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: '{sinceUnixMs}',
        endTimeMillis: '{untilUnixMs}',
      }),
      responseMapping: {
        eventsPath: '$.bucket',
        timestampPath: 'startTimeMillis',
        timestampFormat: 'unix_ms',
        defaultActivityType: 'daily_summary',
        numericValuePath: 'dataset[0].point[0].value[0].intVal',
        eventIdPath: 'startTimeMillis',
      },
    },
    healthCheck: {
      path: '/users/me/dataSources',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Garmin Connect provider configuration.
 * Monitors daily summaries, activities, and heart rate data.
 */
export const GARMIN_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'garmin',
  name: 'Garmin Connect',
  description:
    'Monitor Garmin Connect activity including daily summaries, workouts, and heart rate data',
  category: ProviderCategory.HEALTH_FITNESS,
  icon: 'garmin',
  baseUrl: 'https://apis.garmin.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://connect.garmin.com/oauthConfirm',
      tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/token',
      clientId: '',
      clientSecret: '',
      scopes: ['activity', 'health', 'heartrate'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    minDelayMs: 500,
  },
  endpoints: {
    activity: {
      path: '/wellness-api/rest/activities',
      method: 'GET',
      queryParams: {
        uploadStartTimeInSeconds: '{sinceUnix}',
        uploadEndTimeInSeconds: '{untilUnix}',
      },
      responseMapping: {
        eventsPath: '$.activities',
        timestampPath: 'startTimeInSeconds',
        timestampFormat: 'unix',
        activityTypePath: 'activityType',
        numericValuePath: 'steps',
        eventIdPath: 'activityId',
      },
    },
    healthCheck: {
      path: '/wellness-api/rest/user/id',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Oura Ring provider configuration.
 * Monitors sleep, readiness, and activity from Oura Ring.
 */
export const OURA_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'oura',
  name: 'Oura Ring',
  description:
    'Monitor sleep, readiness, and activity from Oura Ring',
  category: ProviderCategory.HEALTH_FITNESS,
  icon: 'oura',
  baseUrl: 'https://api.ouraring.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://cloud.ouraring.com/oauth/authorize',
      tokenUrl: 'https://api.ouraring.com/oauth/token',
      clientId: '',
      clientSecret: '',
      scopes: ['daily', 'personal'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 5000,
    windowMs: 300000, // 5 minutes
    minDelayMs: 200,
  },
  endpoints: {
    activity: {
      path: '/v2/usercollection/daily_activity',
      method: 'GET',
      queryParams: {
        start_date: '{since_date}',
        end_date: '{until_date}',
      },
      responseMapping: {
        eventsPath: '$.data',
        timestampPath: 'day',
        timestampFormat: 'iso8601',
        activityTypePath: 'class_5_min',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/v2/usercollection/personal_info',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/v2/usercollection/personal_info',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'email',
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Whoop provider configuration.
 * Monitors recovery score, strain data, and sleep performance.
 */
export const WHOOP_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'whoop',
  name: 'Whoop',
  description:
    'Monitor Whoop recovery score, strain data, and sleep performance',
  category: ProviderCategory.HEALTH_FITNESS,
  icon: 'whoop',
  baseUrl: 'https://api.prod.whoop.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
      tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
      clientId: '',
      clientSecret: '',
      scopes: ['read:recovery', 'read:cycles', 'read:sleep', 'read:workout'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 600,
  },
  endpoints: {
    activity: {
      path: '/developer/v1/cycle',
      method: 'GET',
      queryParams: {
        start: '{sinceISO}',
        end: '{untilISO}',
        limit: '25',
      },
      responseMapping: {
        eventsPath: '$.records',
        timestampPath: 'start',
        timestampFormat: 'iso8601',
        activityTypePath: 'score.strain',
        numericValuePath: 'score.strain',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/developer/v1/user/profile/basic',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/developer/v1/user/profile/basic',
      method: 'GET',
      userIdPath: 'user_id',
      usernamePath: 'email',
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Peloton provider configuration.
 * Monitors recent workouts, workout streaks, and class history.
 * Uses session-based authentication (username/password login).
 */
export const PELOTON_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'peloton',
  name: 'Peloton',
  description:
    'Monitor Peloton workouts, streaks, and class history',
  category: ProviderCategory.HEALTH_FITNESS,
  icon: 'peloton',
  baseUrl: 'https://api.onepeloton.com',
  auth: {
    type: 'custom',
    customHeaderTemplate: 'Bearer {sessionToken}',
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 600,
  },
  endpoints: {
    activity: {
      path: '/api/user/{userId}/workouts',
      method: 'GET',
      queryParams: {
        limit: '20',
        page: '0',
        joins: 'ride',
      },
      responseMapping: {
        eventsPath: '$.data',
        timestampPath: 'created_at',
        timestampFormat: 'unix',
        activityTypePath: 'fitness_discipline',
        numericValuePath: 'total_output',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/api/me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/api/me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'username',
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * MyFitnessPal provider configuration.
 * Monitors food diary entries and daily calorie logging.
 */
export const MYFITNESSPAL_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'myfitnesspal',
  name: 'MyFitnessPal',
  description:
    'Monitor MyFitnessPal food diary entries and daily calorie logging',
  category: ProviderCategory.HEALTH_FITNESS,
  icon: 'myfitnesspal',
  baseUrl: 'https://api.myfitnesspal.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://www.myfitnesspal.com/api/auth/authorize',
      tokenUrl: 'https://api.myfitnesspal.com/oauth2/token',
      clientId: '',
      clientSecret: '',
      scopes: ['diary', 'profile'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    minDelayMs: 600,
  },
  endpoints: {
    activity: {
      path: '/v2/nutrition',
      method: 'GET',
      queryParams: {
        start_date: '{since_date}',
        end_date: '{until_date}',
      },
      responseMapping: {
        eventsPath: '$.items',
        timestampPath: 'date',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        numericValuePath: 'nutritional_contents.calories',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/v2/me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/v2/me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'username',
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Twitter/X provider configuration.
 * Monitors tweets, likes, and other Twitter activity.
 */
export const TWITTER_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'twitter',
  name: 'Twitter/X',
  description: 'Monitor Twitter activity including tweets, retweets, and likes',
  category: ProviderCategory.SOCIAL_MEDIA,
  icon: 'twitter',
  baseUrl: 'https://api.twitter.com/2',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      clientId: '',
      clientSecret: '',
      scopes: ['tweet.read', 'users.read', 'offline.access'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 300,
    windowMs: 15 * 60 * 1000, // 15 minutes
    minDelayMs: 200,
  },
  endpoints: {
    activity: {
      path: '/users/{userId}/tweets',
      method: 'GET',
      queryParams: {
        max_results: '100',
        'tweet.fields': 'created_at,text',
        start_time: '{sinceISO}',
      },
      responseMapping: {
        eventsPath: '$.data',
        timestampPath: 'created_at',
        timestampFormat: 'iso8601',
        defaultActivityType: 'tweet',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/users/me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/users/me',
      method: 'GET',
      userIdPath: 'data.id',
      usernamePath: 'data.username',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false, // Twitter webhooks require enterprise
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Google provider configuration.
 * Monitors Google account activity (last login, etc.)
 */
export const GOOGLE_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'google',
  name: 'Google',
  description: 'Monitor Google account activity and last sign-in',
  category: ProviderCategory.PRODUCTIVITY,
  icon: 'google',
  baseUrl: 'https://www.googleapis.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: '',
      clientSecret: '',
      scopes: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 100,
  },
  endpoints: {
    activity: {
      path: '/gmail/v1/users/me/messages',
      method: 'GET',
      queryParams: {
        maxResults: '10',
        q: 'newer_than:7d',
      },
      responseMapping: {
        eventsPath: '$.messages',
        timestampPath: 'internalDate',
        timestampFormat: 'unix_ms',
        defaultActivityType: 'email',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/oauth2/v1/userinfo',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/oauth2/v1/userinfo',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'email',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 60 * 60 * 1000, // 1 hour
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Slack provider configuration.
 * Monitors Slack presence and message activity.
 */
export const SLACK_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'slack',
  name: 'Slack',
  description: 'Monitor Slack presence status and message activity',
  category: ProviderCategory.COMMUNICATION,
  icon: 'slack',
  baseUrl: 'https://slack.com/api',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      clientId: '',
      clientSecret: '',
      scopes: ['users:read', 'users.profile:read'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 1000,
  },
  endpoints: {
    activity: {
      path: '/users.getPresence',
      method: 'GET',
      queryParams: {
        user: '{userId}',
      },
      responseMapping: {
        eventsPath: '$',
        timestampPath: 'last_activity',
        timestampFormat: 'unix',
        defaultActivityType: 'presence',
        eventIdPath: 'presence',
      },
    },
    healthCheck: {
      path: '/auth.test',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/users.identity',
      method: 'GET',
      userIdPath: 'user.id',
      usernamePath: 'user.name',
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Discord provider configuration.
 * Monitors Discord presence and activity.
 */
export const DISCORD_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'discord',
  name: 'Discord',
  description: 'Monitor Discord presence and activity status',
  category: ProviderCategory.COMMUNICATION,
  icon: 'discord',
  baseUrl: 'https://discord.com/api/v10',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://discord.com/api/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/oauth2/token',
      clientId: '',
      clientSecret: '',
      scopes: ['identify', 'guilds'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 50,
    windowMs: 1000, // 1 second
    minDelayMs: 50,
  },
  endpoints: {
    activity: {
      path: '/users/@me',
      method: 'GET',
      responseMapping: {
        eventsPath: '$',
        timestampPath: 'premium_since', // Limited activity data available
        timestampFormat: 'iso8601',
        defaultActivityType: 'presence',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/users/@me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/users/@me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'username',
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Gmail provider configuration.
 * Monitors recent email activity (metadata only) for heartbeat signals.
 */
export const GMAIL_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'gmail',
  name: 'Gmail',
  description:
    'Monitor Gmail email activity (sent/received counts) via metadata-only scope for minimal read access',
  category: ProviderCategory.COMMUNICATION,
  icon: 'gmail',
  baseUrl: 'https://gmail.googleapis.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: '',
      clientSecret: '',
      scopes: ['https://www.googleapis.com/auth/gmail.metadata'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 250,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 250,
  },
  endpoints: {
    activity: {
      path: '/gmail/v1/users/me/messages',
      method: 'GET',
      queryParams: {
        maxResults: '20',
        q: 'newer_than:1d',
      },
      responseMapping: {
        eventsPath: '$.messages',
        timestampPath: 'internalDate',
        timestampFormat: 'unix_ms',
        defaultActivityType: 'email',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/gmail/v1/users/me/profile',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/gmail/v1/users/me/profile',
      method: 'GET',
      userIdPath: 'emailAddress',
      usernamePath: 'emailAddress',
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Microsoft Outlook provider configuration.
 * Monitors recent email activity and calendar events via Microsoft Graph API.
 */
export const OUTLOOK_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'outlook',
  name: 'Microsoft Outlook',
  description:
    'Monitor Outlook email activity and calendar events via Microsoft Graph API',
  category: ProviderCategory.COMMUNICATION,
  icon: 'outlook',
  baseUrl: 'https://graph.microsoft.com/v1.0',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl:
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl:
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: '',
      clientSecret: '',
      scopes: ['Mail.Read', 'Calendars.Read', 'User.Read'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 10000,
    windowMs: 10 * 60 * 1000, // 10 minutes
    minDelayMs: 50,
  },
  endpoints: {
    activity: {
      path: '/me/messages',
      method: 'GET',
      queryParams: {
        $top: '20',
        $orderby: 'receivedDateTime desc',
        $filter: "receivedDateTime ge {sinceISO}",
      },
      responseMapping: {
        eventsPath: '$.value',
        timestampPath: 'receivedDateTime',
        timestampFormat: 'iso8601',
        defaultActivityType: 'email',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'displayName',
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Telegram provider configuration.
 * Monitors message activity via the Telegram Bot API with API key authentication.
 */
export const TELEGRAM_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'telegram',
  name: 'Telegram',
  description:
    'Monitor Telegram message activity via Bot API with API key authentication',
  category: ProviderCategory.COMMUNICATION,
  icon: 'telegram',
  baseUrl: 'https://api.telegram.org',
  auth: {
    type: 'api_key',
    apiKey: {
      headerName: 'X-Telegram-Bot-Token',
      headerPrefix: 'Bot ',
    },
  },
  rateLimit: {
    maxRequests: 30,
    windowMs: 1000, // 1 second
    minDelayMs: 34,
  },
  endpoints: {
    activity: {
      path: '/bot{apiKey}/getUpdates',
      method: 'GET',
      queryParams: {
        offset: '-10',
        limit: '10',
      },
      responseMapping: {
        eventsPath: '$.result',
        timestampPath: 'message.date',
        timestampFormat: 'unix',
        activityTypePath: 'message.text',
        eventIdPath: 'update_id',
      },
    },
    healthCheck: {
      path: '/bot{apiKey}/getMe',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Signal provider configuration.
 * Monitors message send/receive activity via Signal CLI REST API with API key authentication.
 */
export const SIGNAL_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'signal',
  name: 'Signal',
  description:
    'Monitor Signal message send/receive activity via Signal CLI REST API with API key authentication',
  category: ProviderCategory.COMMUNICATION,
  icon: 'signal',
  baseUrl: 'https://signal-cli-rest-api.example.com',
  auth: {
    type: 'api_key',
    apiKey: {
      headerName: 'Authorization',
      headerPrefix: 'Bearer ',
    },
  },
  rateLimit: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 1000,
  },
  endpoints: {
    activity: {
      path: '/v1/receive/{phoneNumber}',
      method: 'GET',
      responseMapping: {
        eventsPath: '$.messages',
        timestampPath: 'timestamp',
        timestampFormat: 'unix_ms',
        activityTypePath: 'type',
        eventIdPath: 'timestamp',
      },
    },
    healthCheck: {
      path: '/v1/about',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 10 * 60 * 1000, // 10 minutes
  supportsWebhooks: false,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * WhatsApp Business provider configuration.
 * Monitors message activity via the WhatsApp Business Cloud API with OAuth2 authentication.
 */
export const WHATSAPP_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'whatsapp',
  name: 'WhatsApp Business',
  description:
    'Monitor WhatsApp Business message activity via the Cloud API with OAuth2 authentication',
  category: ProviderCategory.COMMUNICATION,
  icon: 'whatsapp',
  baseUrl: 'https://graph.facebook.com/v18.0',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      clientId: '',
      clientSecret: '',
      scopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 80,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 750,
  },
  endpoints: {
    activity: {
      path: '/{phoneNumberId}/messages',
      method: 'GET',
      queryParams: {
        limit: '20',
      },
      responseMapping: {
        eventsPath: '$.data',
        timestampPath: 'timestamp',
        timestampFormat: 'unix',
        activityTypePath: 'type',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/{phoneNumberId}',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Microsoft Teams provider configuration.
 * Monitors presence status, recent chat activity, and meeting participation via Microsoft Graph API.
 */
export const TEAMS_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'teams',
  name: 'Microsoft Teams',
  description:
    'Monitor Teams presence status, chat activity, and meeting participation via Microsoft Graph API',
  category: ProviderCategory.COMMUNICATION,
  icon: 'teams',
  baseUrl: 'https://graph.microsoft.com/v1.0',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl:
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl:
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: '',
      clientSecret: '',
      scopes: ['Chat.Read', 'Presence.Read', 'User.Read'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 10000,
    windowMs: 10 * 60 * 1000, // 10 minutes
    minDelayMs: 50,
  },
  endpoints: {
    activity: {
      path: '/me/chats/getAllMessages',
      method: 'GET',
      queryParams: {
        $top: '20',
        $orderby: 'createdDateTime desc',
      },
      responseMapping: {
        eventsPath: '$.value',
        timestampPath: 'createdDateTime',
        timestampFormat: 'iso8601',
        activityTypePath: 'messageType',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/me/presence',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'displayName',
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Reddit provider configuration.
 * Monitors recent comments, posts, and upvote activity.
 */
export const REDDIT_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'reddit',
  name: 'Reddit',
  description:
    'Monitor Reddit activity including comments, posts, and upvotes',
  category: ProviderCategory.SOCIAL_MEDIA,
  icon: 'reddit',
  baseUrl: 'https://oauth.reddit.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://www.reddit.com/api/v1/authorize',
      tokenUrl: 'https://www.reddit.com/api/v1/access_token',
      clientId: '',
      clientSecret: '',
      scopes: ['identity', 'history', 'read'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 1000,
  },
  endpoints: {
    activity: {
      path: '/user/{userId}/overview',
      method: 'GET',
      queryParams: {
        limit: '25',
        sort: 'new',
      },
      responseMapping: {
        eventsPath: '$.data.children',
        timestampPath: 'data.created_utc',
        timestampFormat: 'unix',
        activityTypePath: 'kind',
        eventIdPath: 'data.id',
      },
    },
    healthCheck: {
      path: '/api/v1/me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/api/v1/me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'name',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * YouTube provider configuration.
 * Monitors recent video uploads, comments, and watch history activity.
 */
export const YOUTUBE_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'youtube',
  name: 'YouTube',
  description:
    'Monitor YouTube activity including video uploads, comments, and watch history',
  category: ProviderCategory.SOCIAL_MEDIA,
  icon: 'youtube',
  baseUrl: 'https://www.googleapis.com/youtube/v3',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: '',
      clientSecret: '',
      scopes: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl',
      ],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 10000,
    windowMs: 24 * 60 * 60 * 1000, // 1 day (quota units)
    minDelayMs: 100,
  },
  endpoints: {
    activity: {
      path: '/activities',
      method: 'GET',
      queryParams: {
        part: 'snippet,contentDetails',
        mine: 'true',
        maxResults: '25',
        publishedAfter: '{sinceISO}',
      },
      responseMapping: {
        eventsPath: '$.items',
        timestampPath: 'snippet.publishedAt',
        timestampFormat: 'iso8601',
        activityTypePath: 'snippet.type',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/channels?part=id&mine=true',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/channels',
      method: 'GET',
      userIdPath: 'items[0].id',
      usernamePath: 'items[0].snippet.title',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Instagram provider configuration.
 * Monitors recent media posts and story activity via the Instagram Graph API.
 */
export const INSTAGRAM_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'instagram',
  name: 'Instagram',
  description:
    'Monitor Instagram activity including media posts and story activity via the Graph API',
  category: ProviderCategory.SOCIAL_MEDIA,
  icon: 'instagram',
  baseUrl: 'https://graph.instagram.com',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://api.instagram.com/oauth/authorize',
      tokenUrl: 'https://api.instagram.com/oauth/access_token',
      clientId: '',
      clientSecret: '',
      scopes: ['user_profile', 'user_media'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 200,
    windowMs: 60 * 60 * 1000, // 1 hour
    minDelayMs: 500,
  },
  endpoints: {
    activity: {
      path: '/me/media',
      method: 'GET',
      queryParams: {
        fields: 'id,caption,media_type,timestamp',
        limit: '25',
        since: '{sinceUnix}',
      },
      responseMapping: {
        eventsPath: '$.data',
        timestampPath: 'timestamp',
        timestampFormat: 'iso8601',
        activityTypePath: 'media_type',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/me?fields=id,username',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'username',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * LinkedIn provider configuration.
 * Monitors recent post activity and profile views.
 */
export const LINKEDIN_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'linkedin',
  name: 'LinkedIn',
  description:
    'Monitor LinkedIn activity including posts, shares, and profile views',
  category: ProviderCategory.SOCIAL_MEDIA,
  icon: 'linkedin',
  baseUrl: 'https://api.linkedin.com/v2',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientId: '',
      clientSecret: '',
      scopes: ['r_liteprofile', 'r_basicprofile', 'w_member_social'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 24 * 60 * 60 * 1000, // 1 day
    minDelayMs: 500,
  },
  endpoints: {
    activity: {
      path: '/ugcPosts',
      method: 'GET',
      queryParams: {
        q: 'authors',
        authors: 'List(urn:li:person:{userId})',
        count: '20',
      },
      responseMapping: {
        eventsPath: '$.elements',
        timestampPath: 'created.time',
        timestampFormat: 'unix_ms',
        activityTypePath: 'lifecycleState',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'localizedFirstName',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 60 * 60 * 1000, // 1 hour
  supportsWebhooks: false,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Mastodon provider configuration.
 * Monitors recent toots, boosts, and favorites.
 * Base URL is configurable per instance (default: mastodon.social).
 */
export const MASTODON_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'mastodon',
  name: 'Mastodon',
  description:
    'Monitor Mastodon activity including toots, boosts, and favorites (configurable instance)',
  category: ProviderCategory.SOCIAL_MEDIA,
  icon: 'mastodon',
  baseUrl: 'https://mastodon.social/api/v1',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://mastodon.social/oauth/authorize',
      tokenUrl: 'https://mastodon.social/oauth/token',
      clientId: '',
      clientSecret: '',
      scopes: ['read:statuses', 'read:accounts', 'read:favourites'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 300,
    windowMs: 5 * 60 * 1000, // 5 minutes
    minDelayMs: 200,
  },
  endpoints: {
    activity: {
      path: '/accounts/{userId}/statuses',
      method: 'GET',
      queryParams: {
        limit: '40',
        exclude_reblogs: 'false',
      },
      responseMapping: {
        eventsPath: '$',
        timestampPath: 'created_at',
        timestampFormat: 'iso8601',
        activityTypePath: 'reblog',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/accounts/verify_credentials',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/accounts/verify_credentials',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'username',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Twitch provider configuration.
 * Monitors stream activity, chat messages, and online status.
 */
export const TWITCH_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'twitch',
  name: 'Twitch',
  description:
    'Monitor Twitch activity including stream status, chat messages, and online presence',
  category: ProviderCategory.SOCIAL_MEDIA,
  icon: 'twitch',
  baseUrl: 'https://api.twitch.tv/helix',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://id.twitch.tv/oauth2/authorize',
      tokenUrl: 'https://id.twitch.tv/oauth2/token',
      clientId: '',
      clientSecret: '',
      scopes: ['user:read:email', 'channel:read:stream_key'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 800,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 75,
  },
  endpoints: {
    activity: {
      path: '/streams',
      method: 'GET',
      queryParams: {
        user_id: '{userId}',
      },
      responseMapping: {
        eventsPath: '$.data',
        timestampPath: 'started_at',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/users?id={userId}',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/users',
      method: 'GET',
      userIdPath: 'data[0].id',
      usernamePath: 'data[0].display_name',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  customHeaders: {
    'Client-Id': '{clientId}',
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * GitLab provider configuration.
 * Monitors commits, merge requests, and pipeline activity.
 * Supports both OAuth2 (primary) and Personal Access Token authentication.
 */
export const GITLAB_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'gitlab',
  name: 'GitLab',
  description:
    'Monitor GitLab activity including commits, merge requests, and pipeline activity',
  category: ProviderCategory.DEVELOPER,
  icon: 'gitlab',
  baseUrl: 'https://gitlab.com/api/v4',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://gitlab.com/oauth/authorize',
      tokenUrl: 'https://gitlab.com/oauth/token',
      clientId: '',
      clientSecret: '',
      scopes: ['read_user', 'read_api', 'read_repository'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 2000,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 50,
  },
  endpoints: {
    activity: {
      path: '/users/{userId}/events',
      method: 'GET',
      queryParams: {
        per_page: '100',
        after: '{since_date}',
      },
      responseMapping: {
        eventsPath: '$',
        timestampPath: 'created_at',
        timestampFormat: 'iso8601',
        activityTypePath: 'action_name',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/user',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/user',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'username',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Jira provider configuration.
 * Monitors issue updates, comments, and status transitions via Jira Cloud REST API.
 */
export const JIRA_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'jira',
  name: 'Jira',
  description:
    'Monitor Jira activity including issue updates, comments, and status transitions',
  category: ProviderCategory.DEVELOPER,
  icon: 'jira',
  baseUrl: 'https://your-domain.atlassian.net/rest/api/3',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://auth.atlassian.com/authorize',
      tokenUrl: 'https://auth.atlassian.com/oauth/token',
      clientId: '',
      clientSecret: '',
      scopes: ['read:jira-work', 'read:jira-user'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 600,
  },
  endpoints: {
    activity: {
      path: '/search',
      method: 'GET',
      queryParams: {
        jql: 'updatedDate >= "{since_date}" ORDER BY updated DESC',
        maxResults: '50',
        fields: 'summary,status,updated,assignee',
      },
      responseMapping: {
        eventsPath: '$.issues',
        timestampPath: 'fields.updated',
        timestampFormat: 'iso8601',
        activityTypePath: 'fields.status.name',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/myself',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/myself',
      method: 'GET',
      userIdPath: 'accountId',
      usernamePath: 'displayName',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Notion provider configuration.
 * Monitors recent page edits and database updates via the Notion API.
 */
export const NOTION_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'notion',
  name: 'Notion',
  description:
    'Monitor Notion activity including page edits and database updates',
  category: ProviderCategory.PRODUCTIVITY,
  icon: 'notion',
  baseUrl: 'https://api.notion.com/v1',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      clientId: '',
      clientSecret: '',
      scopes: [],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 3,
    windowMs: 1000, // 1 second
    minDelayMs: 334,
  },
  endpoints: {
    activity: {
      path: '/search',
      method: 'POST',
      bodyTemplate: JSON.stringify({
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 20,
      }),
      responseMapping: {
        eventsPath: '$.results',
        timestampPath: 'last_edited_time',
        timestampFormat: 'iso8601',
        activityTypePath: 'object',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/users/me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/users/me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'name',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false,
  enabledByDefault: true,
  customHeaders: {
    'Notion-Version': '2022-06-28',
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Trello provider configuration.
 * Monitors card activity, board updates, and comments via the Trello REST API.
 * Uses API key + token authentication.
 */
export const TRELLO_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'trello',
  name: 'Trello',
  description:
    'Monitor Trello activity including card updates, board changes, and comments',
  category: ProviderCategory.PRODUCTIVITY,
  icon: 'trello',
  baseUrl: 'https://api.trello.com/1',
  auth: {
    type: 'api_key',
    apiKey: {
      headerName: 'Authorization',
      headerPrefix: 'OAuth oauth_consumer_key="{apiKey}", oauth_token="{token}"',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 10 * 1000, // 10 seconds
    minDelayMs: 100,
  },
  endpoints: {
    activity: {
      path: '/members/me/actions',
      method: 'GET',
      queryParams: {
        limit: '50',
        since: '{sinceISO}',
        filter: 'all',
      },
      responseMapping: {
        eventsPath: '$',
        timestampPath: 'date',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/members/me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/members/me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'username',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Google Drive provider configuration.
 * Monitors recent file edits, comments, and sharing activity via the Google Drive API.
 */
export const GOOGLE_DRIVE_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'google_drive',
  name: 'Google Drive',
  description:
    'Monitor Google Drive activity including file edits, comments, and sharing',
  category: ProviderCategory.PRODUCTIVITY,
  icon: 'google_drive',
  baseUrl: 'https://www.googleapis.com/drive/v3',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: '',
      clientSecret: '',
      scopes: [
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/drive.activity.readonly',
      ],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 1000,
    windowMs: 100 * 1000, // 100 seconds
    minDelayMs: 100,
  },
  endpoints: {
    activity: {
      path: '/files',
      method: 'GET',
      queryParams: {
        orderBy: 'modifiedTime desc',
        pageSize: '25',
        fields: 'files(id,name,modifiedTime,mimeType,lastModifyingUser)',
        q: "modifiedTime > '{sinceISO}'",
      },
      responseMapping: {
        eventsPath: '$.files',
        timestampPath: 'modifiedTime',
        timestampFormat: 'iso8601',
        activityTypePath: 'mimeType',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/about?fields=user',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/about?fields=user',
      method: 'GET',
      userIdPath: 'user.permissionId',
      usernamePath: 'user.displayName',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Dropbox provider configuration.
 * Monitors recent file modifications and sharing activity via the Dropbox API.
 */
export const DROPBOX_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'dropbox',
  name: 'Dropbox',
  description:
    'Monitor Dropbox activity including file modifications and sharing',
  category: ProviderCategory.PRODUCTIVITY,
  icon: 'dropbox',
  baseUrl: 'https://api.dropboxapi.com/2',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://www.dropbox.com/oauth2/authorize',
      tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
      clientId: '',
      clientSecret: '',
      scopes: ['files.metadata.read', 'sharing.read', 'account_info.read'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 1000,
    windowMs: 5 * 60 * 1000, // 5 minutes
    minDelayMs: 100,
  },
  endpoints: {
    activity: {
      path: '/files/list_folder/continue',
      method: 'POST',
      bodyTemplate: JSON.stringify({
        cursor: '{cursor}',
      }),
      responseMapping: {
        eventsPath: '$.entries',
        timestampPath: 'server_modified',
        timestampFormat: 'iso8601',
        activityTypePath: '.tag',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/users/get_current_account',
      method: 'POST',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/users/get_current_account',
      method: 'GET',
      userIdPath: 'account_id',
      usernamePath: 'name.display_name',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Todoist provider configuration.
 * Monitors task completions and project activity via the Todoist REST API.
 */
export const TODOIST_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'todoist',
  name: 'Todoist',
  description:
    'Monitor Todoist activity including task completions and project updates',
  category: ProviderCategory.PRODUCTIVITY,
  icon: 'todoist',
  baseUrl: 'https://api.todoist.com/rest/v2',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://todoist.com/oauth/authorize',
      tokenUrl: 'https://todoist.com/oauth/access_token',
      clientId: '',
      clientSecret: '',
      scopes: ['data:read'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 450,
    windowMs: 15 * 60 * 1000, // 15 minutes
    minDelayMs: 200,
  },
  endpoints: {
    activity: {
      path: '/tasks',
      method: 'GET',
      queryParams: {
        filter: 'all',
      },
      responseMapping: {
        eventsPath: '$',
        timestampPath: 'created_at',
        timestampFormat: 'iso8601',
        activityTypePath: 'priority',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/projects',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/projects',
      method: 'GET',
      userIdPath: '[0].id',
      usernamePath: '[0].name',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * SmartThings provider configuration.
 * Monitors device activity events, presence sensor triggers, and motion detector activity.
 */
export const SMARTTHINGS_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'smartthings',
  name: 'SmartThings',
  description:
    'Monitor SmartThings device activity events, presence sensor triggers, and motion detector activity',
  category: ProviderCategory.IOT_SMART_HOME,
  icon: 'smartthings',
  baseUrl: 'https://api.smartthings.com/v1',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://api.smartthings.com/oauth/authorize',
      tokenUrl: 'https://api.smartthings.com/oauth/token',
      clientId: '',
      clientSecret: '',
      scopes: ['r:devices:*', 'r:locations:*', 'r:scenes:*'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 250,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 250,
  },
  endpoints: {
    activity: {
      path: '/devices/{deviceId}/events',
      method: 'GET',
      queryParams: {
        limit: '50',
      },
      responseMapping: {
        eventsPath: '$.items',
        timestampPath: 'eventTime',
        timestampFormat: 'iso8601',
        activityTypePath: 'eventType',
        eventIdPath: 'eventId',
      },
    },
    healthCheck: {
      path: '/locations',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Home Assistant provider configuration.
 * Monitors entity state changes, motion events, and presence detection.
 * Uses Long-Lived Access Token (API key) authentication.
 * Base URL is configurable per installation.
 */
export const HOME_ASSISTANT_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'home_assistant',
  name: 'Home Assistant',
  description:
    'Monitor Home Assistant entity state changes, motion events, and presence detection via REST API',
  category: ProviderCategory.IOT_SMART_HOME,
  icon: 'home_assistant',
  baseUrl: 'https://homeassistant.local:8123/api',
  auth: {
    type: 'api_key',
    apiKey: {
      headerName: 'Authorization',
      headerPrefix: 'Bearer ',
    },
  },
  rateLimit: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 300,
  },
  endpoints: {
    activity: {
      path: '/history/period/{since_date}',
      method: 'GET',
      queryParams: {
        filter_entity_id: '{entityId}',
        minimal_response: 'true',
      },
      responseMapping: {
        eventsPath: '$[0]',
        timestampPath: 'last_changed',
        timestampFormat: 'iso8601',
        activityTypePath: 'state',
        eventIdPath: 'entity_id',
      },
    },
    healthCheck: {
      path: '/',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Philips Hue provider configuration.
 * Monitors light state changes and motion sensor triggers.
 * Uses API key (bridge) authentication with hue-application-key header.
 * Base URL is configurable per bridge.
 */
export const PHILIPS_HUE_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'philips_hue',
  name: 'Philips Hue',
  description:
    'Monitor Philips Hue light state changes and motion sensor triggers via bridge API',
  category: ProviderCategory.IOT_SMART_HOME,
  icon: 'philips_hue',
  baseUrl: 'https://api.meethue.com/bridge',
  auth: {
    type: 'api_key',
    apiKey: {
      headerName: 'hue-application-key',
      headerPrefix: '',
    },
  },
  rateLimit: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 1000,
  },
  endpoints: {
    activity: {
      path: '/{username}/sensors',
      method: 'GET',
      responseMapping: {
        eventsPath: '$.sensors',
        timestampPath: 'state.lastupdated',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        eventIdPath: 'uniqueid',
      },
    },
    healthCheck: {
      path: '/{username}/config',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  supportsWebhooks: false,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Ring provider configuration.
 * Monitors doorbell events, motion alerts, and device activity.
 */
export const RING_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'ring',
  name: 'Ring',
  description:
    'Monitor Ring doorbell events, motion alerts, and device activity',
  category: ProviderCategory.IOT_SMART_HOME,
  icon: 'ring',
  baseUrl: 'https://api.ring.com/clients_api',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://oauth.ring.com/oauth/authorize',
      tokenUrl: 'https://oauth.ring.com/oauth/token',
      clientId: '',
      clientSecret: '',
      scopes: ['client'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 600,
  },
  endpoints: {
    activity: {
      path: '/ring_devices/{deviceId}/history',
      method: 'GET',
      queryParams: {
        limit: '30',
      },
      responseMapping: {
        eventsPath: '$.events',
        timestampPath: 'created_at',
        timestampFormat: 'iso8601',
        activityTypePath: 'kind',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/ring_devices',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Nest/Google Home provider configuration.
 * Monitors thermostat adjustments, camera activity, and presence detection
 * via the Google Smart Device Management API.
 */
export const NEST_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'nest',
  name: 'Nest/Google Home',
  description:
    'Monitor Nest thermostat adjustments, camera activity, and presence detection via Google Smart Device Management API',
  category: ProviderCategory.IOT_SMART_HOME,
  icon: 'nest',
  baseUrl: 'https://smartdevicemanagement.googleapis.com/v1',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: '',
      clientSecret: '',
      scopes: ['https://www.googleapis.com/auth/sdm.service'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 600,
  },
  endpoints: {
    activity: {
      path: '/enterprises/{projectId}/devices',
      method: 'GET',
      responseMapping: {
        eventsPath: '$.devices',
        timestampPath: 'traits.sdm.devices.traits.Info.customName',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        eventIdPath: 'name',
      },
    },
    healthCheck: {
      path: '/enterprises/{projectId}/devices',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 10 * 60 * 1000, // 10 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Amazon Alexa provider configuration.
 * Monitors voice interaction history and smart home device commands
 * via the Alexa Smart Home Skill API.
 */
export const ALEXA_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'alexa',
  name: 'Amazon Alexa',
  description:
    'Monitor Amazon Alexa voice interaction history and smart home device commands',
  category: ProviderCategory.IOT_SMART_HOME,
  icon: 'alexa',
  baseUrl: 'https://api.amazonalexa.com/v1',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://www.amazon.com/ap/oa',
      tokenUrl: 'https://api.amazon.com/auth/o2/token',
      clientId: '',
      clientSecret: '',
      scopes: ['alexa::devices:all:notifications:write', 'alexa::health:profile:write'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 600,
  },
  endpoints: {
    activity: {
      path: '/alerts/reminders',
      method: 'GET',
      responseMapping: {
        eventsPath: '$.alerts',
        timestampPath: 'createdTime',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        eventIdPath: 'alertToken',
      },
    },
    healthCheck: {
      path: '/devices',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 10 * 60 * 1000, // 10 minutes
  supportsWebhooks: true,
  enabledByDefault: true,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

// ============================================================================
// Financial Providers
// ============================================================================

/**
 * Plaid provider configuration.
 * Monitors recent transaction activity across linked bank accounts.
 * Uses API key authentication (client_id + secret via custom headers).
 */
export const PLAID_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'plaid',
  name: 'Plaid',
  description:
    'Monitor recent transaction activity across linked bank accounts via the Plaid API',
  category: ProviderCategory.FINANCIAL,
  icon: 'plaid',
  baseUrl: 'https://production.plaid.com',
  auth: {
    type: 'api_key',
    apiKey: {
      headerName: 'PLAID-CLIENT-ID',
      headerPrefix: '',
    },
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 600,
  },
  endpoints: {
    activity: {
      path: '/transactions/get',
      method: 'POST',
      bodyTemplate: JSON.stringify({
        start_date: '{since_date}',
        end_date: '{until_date}',
        options: { count: 50, offset: 0 },
      }),
      responseMapping: {
        eventsPath: '$.transactions',
        timestampPath: 'date',
        timestampFormat: 'iso8601',
        activityTypePath: 'category[0]',
        numericValuePath: 'amount',
        eventIdPath: 'transaction_id',
      },
    },
    healthCheck: {
      path: '/institutions/get',
      method: 'POST',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 60 * 60 * 1000, // 1 hour
  supportsWebhooks: true,
  enabledByDefault: false,
  customHeaders: {
    'PLAID-SECRET': '', // Set via environment/credentials
    'Content-Type': 'application/json',
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Coinbase provider configuration.
 * Monitors recent trades, transfers, and account activity.
 */
export const COINBASE_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'coinbase',
  name: 'Coinbase',
  description:
    'Monitor Coinbase trades, transfers, and account activity',
  category: ProviderCategory.FINANCIAL,
  icon: 'coinbase',
  baseUrl: 'https://api.coinbase.com/v2',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://www.coinbase.com/oauth/authorize',
      tokenUrl: 'https://api.coinbase.com/oauth/token',
      clientId: '',
      clientSecret: '',
      scopes: ['wallet:transactions:read', 'wallet:accounts:read'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 10000,
    windowMs: 60 * 60 * 1000, // 1 hour
    minDelayMs: 100,
  },
  endpoints: {
    activity: {
      path: '/accounts/{accountId}/transactions',
      method: 'GET',
      queryParams: {
        limit: '25',
        order: 'desc',
      },
      responseMapping: {
        eventsPath: '$.data',
        timestampPath: 'created_at',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        numericValuePath: 'amount.amount',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/user',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/user',
      method: 'GET',
      userIdPath: 'data.id',
      usernamePath: 'data.name',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: true,
  enabledByDefault: false,
  customHeaders: {
    'CB-VERSION': '2023-12-01',
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * PayPal provider configuration.
 * Monitors recent transaction activity via the PayPal REST API.
 * Uses OAuth2 client credentials flow.
 */
export const PAYPAL_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'paypal',
  name: 'PayPal',
  description:
    'Monitor PayPal transaction activity via the PayPal REST API with OAuth2 client credentials',
  category: ProviderCategory.FINANCIAL,
  icon: 'paypal',
  baseUrl: 'https://api-m.paypal.com/v1',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://www.paypal.com/signin/authorize',
      tokenUrl: 'https://api-m.paypal.com/v1/oauth2/token',
      clientId: '',
      clientSecret: '',
      scopes: ['https://uri.paypal.com/services/reporting/search/read'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 1200,
  },
  endpoints: {
    activity: {
      path: '/reporting/transactions',
      method: 'GET',
      queryParams: {
        start_date: '{sinceISO}',
        end_date: '{untilISO}',
        fields: 'transaction_info',
        page_size: '20',
      },
      responseMapping: {
        eventsPath: '$.transaction_details',
        timestampPath: 'transaction_info.transaction_initiation_date',
        timestampFormat: 'iso8601',
        activityTypePath: 'transaction_info.transaction_event_code',
        numericValuePath: 'transaction_info.transaction_amount.value',
        eventIdPath: 'transaction_info.transaction_id',
      },
    },
    healthCheck: {
      path: '/oauth2/token',
      method: 'POST',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 60 * 60 * 1000, // 1 hour
  supportsWebhooks: true,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Venmo provider configuration.
 * Monitors recent payment activity via the Venmo API.
 */
export const VENMO_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'venmo',
  name: 'Venmo',
  description:
    'Monitor Venmo payment activity via the Venmo API with OAuth2 authentication',
  category: ProviderCategory.FINANCIAL,
  icon: 'venmo',
  baseUrl: 'https://api.venmo.com/v1',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://api.venmo.com/v1/oauth/authorize',
      tokenUrl: 'https://api.venmo.com/v1/oauth/access_token',
      clientId: '',
      clientSecret: '',
      scopes: ['access_profile', 'access_feed'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 300,
    windowMs: 15 * 60 * 1000, // 15 minutes
    minDelayMs: 200,
  },
  endpoints: {
    activity: {
      path: '/me/feed',
      method: 'GET',
      queryParams: {
        limit: '20',
      },
      responseMapping: {
        eventsPath: '$.data',
        timestampPath: 'date_completed',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        numericValuePath: 'amount',
        eventIdPath: 'id',
      },
    },
    healthCheck: {
      path: '/me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/me',
      method: 'GET',
      userIdPath: 'data.user.id',
      usernamePath: 'data.user.username',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: false,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

// ============================================================================
// Location Providers
// ============================================================================

/**
 * Google Maps Timeline provider configuration.
 * Monitors recent location history and place visits.
 */
export const GOOGLE_MAPS_TIMELINE_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'google_maps_timeline',
  name: 'Google Maps Timeline',
  description:
    'Monitor Google Maps Timeline location history and place visits via the Google Maps Platform API',
  category: ProviderCategory.LOCATION,
  icon: 'google_maps',
  baseUrl: 'https://www.googleapis.com/geolocation/v1',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: '',
      clientSecret: '',
      scopes: ['https://www.googleapis.com/auth/location.history.read'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 100,
  },
  endpoints: {
    activity: {
      path: '/timeline',
      method: 'GET',
      queryParams: {
        startTime: '{sinceISO}',
        endTime: '{untilISO}',
      },
      responseMapping: {
        eventsPath: '$.timelineObjects',
        timestampPath: 'activitySegment.duration.startTimestampMs',
        timestampFormat: 'unix_ms',
        activityTypePath: 'activitySegment.activityType',
        eventIdPath: 'activitySegment.duration.startTimestampMs',
        locationPaths: {
          latitude: 'activitySegment.startLocation.latitudeE7',
          longitude: 'activitySegment.startLocation.longitudeE7',
        },
      },
    },
    healthCheck: {
      path: '/timeline',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: false,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Life360 provider configuration.
 * Monitors location check-ins and circle activity.
 * Uses session-based authentication.
 */
export const LIFE360_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'life360',
  name: 'Life360',
  description:
    'Monitor Life360 location check-ins and circle activity via session-based authentication',
  category: ProviderCategory.LOCATION,
  icon: 'life360',
  baseUrl: 'https://api-cloudfront.life360.com/v3',
  auth: {
    type: 'custom',
    customHeaderTemplate: 'Bearer {sessionToken}',
  },
  rateLimit: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 1000,
  },
  endpoints: {
    activity: {
      path: '/circles/{circleId}/members',
      method: 'GET',
      responseMapping: {
        eventsPath: '$.members',
        timestampPath: 'location.timestamp',
        timestampFormat: 'unix',
        activityTypePath: 'location.name',
        eventIdPath: 'id',
        locationPaths: {
          latitude: 'location.latitude',
          longitude: 'location.longitude',
          accuracy: 'location.accuracy',
        },
      },
    },
    healthCheck: {
      path: '/circles',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Foursquare/Swarm provider configuration.
 * Monitors recent check-ins and place visits.
 */
export const FOURSQUARE_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'foursquare',
  name: 'Foursquare',
  description:
    'Monitor Foursquare/Swarm check-ins and place visits via the Foursquare Places API',
  category: ProviderCategory.LOCATION,
  icon: 'foursquare',
  baseUrl: 'https://api.foursquare.com/v2',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://foursquare.com/oauth2/authenticate',
      tokenUrl: 'https://foursquare.com/oauth2/access_token',
      clientId: '',
      clientSecret: '',
      scopes: [],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 500,
    windowMs: 60 * 60 * 1000, // 1 hour
    minDelayMs: 200,
  },
  endpoints: {
    activity: {
      path: '/users/self/checkins',
      method: 'GET',
      queryParams: {
        limit: '20',
        afterTimestamp: '{sinceUnix}',
        v: '20231201',
      },
      responseMapping: {
        eventsPath: '$.response.checkins.items',
        timestampPath: 'createdAt',
        timestampFormat: 'unix',
        activityTypePath: 'type',
        eventIdPath: 'id',
        locationPaths: {
          latitude: 'venue.location.lat',
          longitude: 'venue.location.lng',
        },
      },
    },
    healthCheck: {
      path: '/users/self',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/users/self',
      method: 'GET',
      userIdPath: 'response.user.id',
      usernamePath: 'response.user.firstName',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: true,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

// ============================================================================
// Entertainment & Streaming Providers
// ============================================================================

/**
 * Spotify provider configuration.
 * Monitors recently played tracks, current playback status, and listening history.
 */
export const SPOTIFY_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'spotify',
  name: 'Spotify',
  description:
    'Monitor recently played tracks, current playback status, and listening history via the Spotify Web API',
  category: ProviderCategory.ENTERTAINMENT,
  icon: 'spotify',
  baseUrl: 'https://api.spotify.com/v1',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl: 'https://accounts.spotify.com/authorize',
      tokenUrl: 'https://accounts.spotify.com/api/token',
      clientId: '',
      clientSecret: '',
      scopes: [
        'user-read-recently-played',
        'user-read-playback-state',
        'user-read-currently-playing',
      ],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 180,
    windowMs: 60 * 1000, // 1 minute
    minDelayMs: 334,
  },
  endpoints: {
    activity: {
      path: '/me/player/recently-played',
      method: 'GET',
      queryParams: {
        limit: '50',
        after: '{sinceUnix}',
      },
      responseMapping: {
        eventsPath: '$.items',
        timestampPath: 'played_at',
        timestampFormat: 'iso8601',
        activityTypePath: 'track.type',
        eventIdPath: 'track.id',
      },
    },
    healthCheck: {
      path: '/me',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/me',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'display_name',
    },
  },
  defaultLookbackMs: 2 * 24 * 60 * 60 * 1000, // 2 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Netflix provider configuration.
 * Monitors viewing activity and continue-watching updates.
 */
export const NETFLIX_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'netflix',
  name: 'Netflix',
  description:
    'Monitor viewing activity and continue-watching updates via the Netflix API',
  category: ProviderCategory.ENTERTAINMENT,
  icon: 'netflix',
  baseUrl: 'https://api.netflix.com/v1',
  auth: {
    type: 'custom',
    customHeaderTemplate: 'Bearer {sessionToken}',
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    minDelayMs: 500,
  },
  endpoints: {
    activity: {
      path: '/users/{userId}/viewing-activity',
      method: 'GET',
      queryParams: {
        pageSize: '20',
        fromDate: '{since_date}',
      },
      responseMapping: {
        eventsPath: '$.viewedItems',
        timestampPath: 'dateStr',
        timestampFormat: 'iso8601',
        activityTypePath: 'seriesTitle',
        eventIdPath: 'movieID',
      },
    },
    healthCheck: {
      path: '/users/{userId}/profiles',
      method: 'GET',
      expectedStatus: 200,
    },
  },
  defaultLookbackMs: 3 * 24 * 60 * 60 * 1000, // 3 days
  minCheckIntervalMs: 60 * 60 * 1000, // 1 hour
  supportsWebhooks: false,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
  },
};

/**
 * Steam provider configuration.
 * Monitors recent game activity, achievements, and online status.
 */
export const STEAM_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'steam',
  name: 'Steam',
  description:
    'Monitor recent game activity, achievements, and online status via the Steam Web API',
  category: ProviderCategory.ENTERTAINMENT,
  icon: 'steam',
  baseUrl: 'https://api.steampowered.com',
  auth: {
    type: 'api_key',
    apiKey: {
      headerName: 'x-webapi-key',
      headerPrefix: '',
    },
  },
  rateLimit: {
    maxRequests: 100000,
    windowMs: 24 * 60 * 60 * 1000, // 1 day
    minDelayMs: 1000,
  },
  endpoints: {
    activity: {
      path: '/IPlayerService/GetRecentlyPlayedGames/v1',
      method: 'GET',
      queryParams: {
        steamid: '{userId}',
        count: '10',
      },
      responseMapping: {
        eventsPath: '$.response.games',
        timestampPath: 'rtime_last_played',
        timestampFormat: 'unix',
        activityTypePath: 'name',
        eventIdPath: 'appid',
      },
    },
    healthCheck: {
      path: '/ISteamWebAPIUtil/GetSupportedAPIList/v1',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/ISteamUser/GetPlayerSummaries/v2',
      method: 'GET',
      userIdPath: 'response.players[0].steamid',
      usernamePath: 'response.players[0].personaname',
    },
  },
  defaultLookbackMs: 14 * 24 * 60 * 60 * 1000, // 14 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: false,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Xbox Live provider configuration.
 * Monitors recent game activity, achievements, and online presence.
 */
export const XBOX_LIVE_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'xbox-live',
  name: 'Xbox Live',
  description:
    'Monitor recent game activity, achievements, and online presence via the Xbox Live API',
  category: ProviderCategory.ENTERTAINMENT,
  icon: 'xbox',
  baseUrl: 'https://xbl.io/api/v2',
  auth: {
    type: 'oauth2',
    oauth2: {
      authorizationUrl:
        'https://login.live.com/oauth20_authorize.srf',
      tokenUrl: 'https://login.live.com/oauth20_token.srf',
      clientId: '',
      clientSecret: '',
      scopes: ['Xboxlive.signin', 'Xboxlive.offline_access'],
      redirectUri: '',
    },
  },
  rateLimit: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    minDelayMs: 500,
  },
  endpoints: {
    activity: {
      path: '/player/titleHistory',
      method: 'GET',
      queryParams: {},
      responseMapping: {
        eventsPath: '$.titles',
        timestampPath: 'titleHistory.lastTimePlayed',
        timestampFormat: 'iso8601',
        activityTypePath: 'name',
        eventIdPath: 'titleId',
      },
    },
    healthCheck: {
      path: '/account',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/account',
      method: 'GET',
      userIdPath: 'profileUsers[0].id',
      usernamePath: 'profileUsers[0].settings[0].value',
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: false,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * PlayStation Network provider configuration.
 * Monitors recent game activity and online status.
 */
export const PLAYSTATION_NETWORK_PROVIDER_CONFIG: ICanaryProviderConfig<string> =
  {
    id: 'playstation-network',
    name: 'PlayStation Network',
    description:
      'Monitor recent game activity and online status via the PlayStation Network API',
    category: ProviderCategory.ENTERTAINMENT,
    icon: 'playstation',
    baseUrl: 'https://m.np.playstation.com/api',
    auth: {
      type: 'oauth2',
      oauth2: {
        authorizationUrl:
          'https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize',
        tokenUrl:
          'https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/token',
        clientId: '',
        clientSecret: '',
        scopes: ['psn:s2s'],
        redirectUri: '',
      },
    },
    rateLimit: {
      maxRequests: 300,
      windowMs: 15 * 60 * 1000, // 15 minutes
      minDelayMs: 500,
    },
    endpoints: {
      activity: {
        path: '/gamelist/v2/users/{userId}/titles',
        method: 'GET',
        queryParams: {
          limit: '20',
          offset: '0',
        },
        responseMapping: {
          eventsPath: '$.titles',
          timestampPath: 'lastPlayedDateTime',
          timestampFormat: 'iso8601',
          activityTypePath: 'name',
          eventIdPath: 'titleId',
        },
      },
      healthCheck: {
        path: '/userProfile/v1/users/me/profile2',
        method: 'GET',
        expectedStatus: 200,
      },
      userProfile: {
        path: '/userProfile/v1/users/me/profile2',
        method: 'GET',
        userIdPath: 'profile.accountId',
        usernamePath: 'profile.onlineId',
      },
    },
    defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
    supportsWebhooks: false,
    enabledByDefault: false,
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
    },
  };

/**
 * Last.fm provider configuration.
 * Monitors recent scrobbles and listening activity.
 */
export const LASTFM_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'lastfm',
  name: 'Last.fm',
  description:
    'Monitor recent scrobbles and listening activity via the Last.fm API',
  category: ProviderCategory.ENTERTAINMENT,
  icon: 'lastfm',
  baseUrl: 'https://ws.audioscrobbler.com/2.0',
  auth: {
    type: 'api_key',
    apiKey: {
      headerName: 'api_key',
      headerPrefix: '',
    },
  },
  rateLimit: {
    maxRequests: 300,
    windowMs: 5 * 60 * 1000, // 5 minutes
    minDelayMs: 200,
  },
  endpoints: {
    activity: {
      path: '/',
      method: 'GET',
      queryParams: {
        method: 'user.getrecenttracks',
        user: '{userId}',
        format: 'json',
        limit: '50',
        from: '{sinceUnix}',
      },
      responseMapping: {
        eventsPath: '$.recenttracks.track',
        timestampPath: 'date.uts',
        timestampFormat: 'unix',
        activityTypePath: 'name',
        eventIdPath: 'mbid',
      },
    },
    healthCheck: {
      path: '/',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/',
      method: 'GET',
      userIdPath: 'user.name',
      usernamePath: 'user.realname',
    },
  },
  defaultLookbackMs: 3 * 24 * 60 * 60 * 1000, // 3 days
  minCheckIntervalMs: 15 * 60 * 1000, // 15 minutes
  supportsWebhooks: false,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Plex provider configuration.
 * Monitors recently watched media and server activity.
 */
export const PLEX_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'plex',
  name: 'Plex',
  description:
    'Monitor recently watched media and server activity via the Plex API',
  category: ProviderCategory.ENTERTAINMENT,
  icon: 'plex',
  baseUrl: 'https://plex.tv/api/v2',
  auth: {
    type: 'custom',
    customHeaderTemplate: 'X-Plex-Token: {token}',
  },
  rateLimit: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    minDelayMs: 200,
  },
  endpoints: {
    activity: {
      path: '/status/sessions/history/all',
      method: 'GET',
      queryParams: {
        sort: 'viewedAt:desc',
        'viewedAt>': '{sinceUnix}',
        'X-Plex-Container-Size': '50',
      },
      responseMapping: {
        eventsPath: '$.MediaContainer.Metadata',
        timestampPath: 'viewedAt',
        timestampFormat: 'unix',
        activityTypePath: 'type',
        eventIdPath: 'ratingKey',
      },
    },
    healthCheck: {
      path: '/user',
      method: 'GET',
      expectedStatus: 200,
    },
    userProfile: {
      path: '/user',
      method: 'GET',
      userIdPath: 'id',
      usernamePath: 'username',
    },
  },
  defaultLookbackMs: 3 * 24 * 60 * 60 * 1000, // 3 days
  minCheckIntervalMs: 30 * 60 * 1000, // 30 minutes
  supportsWebhooks: true,
  enabledByDefault: false,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Custom webhook provider template.
 * Users can clone and customize this for their own services.
 */
export const CUSTOM_WEBHOOK_TEMPLATE: ICanaryProviderConfig<string> = {
  id: 'custom-webhook-template',
  name: 'Custom Webhook',
  description: 'Template for creating custom webhook-based providers',
  category: ProviderCategory.CUSTOM_WEBHOOK,
  icon: 'webhook',
  baseUrl: 'https://your-service.example.com',
  auth: {
    type: 'webhook',
    webhook: {
      webhookSecret: '', // Set by user
      signatureAlgorithm: 'sha256',
      signatureHeader: 'X-Signature-256',
    },
  },
  endpoints: {
    activity: {
      path: '/api/heartbeat',
      method: 'POST',
      bodyTemplate: JSON.stringify({
        userId: '{userId}',
        since: '{sinceISO}',
      }),
      responseMapping: {
        eventsPath: '$.events',
        timestampPath: 'timestamp',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        eventIdPath: 'id',
      },
    },
  },
  defaultLookbackMs: 24 * 60 * 60 * 1000, // 1 day
  minCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  supportsWebhooks: true,
  enabledByDefault: false,
};

/**
 * BrightChain/DigitalBurnbag native provider.
 * Monitors activity on our own platform.
 */
export const BIRDBAG_PROVIDER_CONFIG: ICanaryProviderConfig<string> = {
  id: 'birdbag',
  name: 'BrightChain / DigitalBurnbag',
  description: 'Monitor activity on BrightChain and DigitalBurnbag platforms',
  category: ProviderCategory.PLATFORM_NATIVE,
  icon: 'brightchain',
  baseUrl: '', // Internal - no external API needed
  auth: {
    type: 'custom',
    customHeaderTemplate: 'Internal-Auth {sessionToken}',
  },
  endpoints: {
    activity: {
      path: '/internal/user-activity',
      method: 'GET',
      queryParams: {
        since: '{sinceISO}',
      },
      responseMapping: {
        eventsPath: '$.activities',
        timestampPath: 'timestamp',
        timestampFormat: 'iso8601',
        activityTypePath: 'type',
        eventIdPath: 'id',
      },
    },
  },
  defaultLookbackMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minCheckIntervalMs: 60 * 1000, // 1 minute (internal, no rate limits)
  supportsWebhooks: true,
  enabledByDefault: true,
};

/**
 * All built-in provider configurations.
 */
export const BUILTIN_PROVIDER_CONFIGS: ICanaryProviderConfig<string>[] = [
  // Original providers
  GITHUB_PROVIDER_CONFIG,
  FITBIT_PROVIDER_CONFIG,
  STRAVA_PROVIDER_CONFIG,
  TWITTER_PROVIDER_CONFIG,
  GOOGLE_PROVIDER_CONFIG,
  SLACK_PROVIDER_CONFIG,
  DISCORD_PROVIDER_CONFIG,
  BIRDBAG_PROVIDER_CONFIG,

  // Health & Fitness
  APPLE_HEALTH_PROVIDER_CONFIG,
  GOOGLE_FIT_PROVIDER_CONFIG,
  GARMIN_PROVIDER_CONFIG,
  OURA_PROVIDER_CONFIG,
  WHOOP_PROVIDER_CONFIG,
  PELOTON_PROVIDER_CONFIG,
  MYFITNESSPAL_PROVIDER_CONFIG,

  // Communication
  GMAIL_PROVIDER_CONFIG,
  OUTLOOK_PROVIDER_CONFIG,
  TELEGRAM_PROVIDER_CONFIG,
  SIGNAL_PROVIDER_CONFIG,
  WHATSAPP_PROVIDER_CONFIG,
  TEAMS_PROVIDER_CONFIG,

  // Social Media
  REDDIT_PROVIDER_CONFIG,
  YOUTUBE_PROVIDER_CONFIG,
  INSTAGRAM_PROVIDER_CONFIG,
  LINKEDIN_PROVIDER_CONFIG,
  MASTODON_PROVIDER_CONFIG,
  TWITCH_PROVIDER_CONFIG,

  // Development/Productivity
  GITLAB_PROVIDER_CONFIG,
  JIRA_PROVIDER_CONFIG,
  NOTION_PROVIDER_CONFIG,
  TRELLO_PROVIDER_CONFIG,
  GOOGLE_DRIVE_PROVIDER_CONFIG,
  DROPBOX_PROVIDER_CONFIG,
  TODOIST_PROVIDER_CONFIG,

  // Smart Home
  SMARTTHINGS_PROVIDER_CONFIG,
  HOME_ASSISTANT_PROVIDER_CONFIG,
  PHILIPS_HUE_PROVIDER_CONFIG,
  RING_PROVIDER_CONFIG,
  NEST_PROVIDER_CONFIG,
  ALEXA_PROVIDER_CONFIG,

  // Financial
  PLAID_PROVIDER_CONFIG,
  COINBASE_PROVIDER_CONFIG,
  PAYPAL_PROVIDER_CONFIG,
  VENMO_PROVIDER_CONFIG,

  // Location
  GOOGLE_MAPS_TIMELINE_PROVIDER_CONFIG,
  LIFE360_PROVIDER_CONFIG,
  FOURSQUARE_PROVIDER_CONFIG,

  // Entertainment
  SPOTIFY_PROVIDER_CONFIG,
  NETFLIX_PROVIDER_CONFIG,
  STEAM_PROVIDER_CONFIG,
  XBOX_LIVE_PROVIDER_CONFIG,
  PLAYSTATION_NETWORK_PROVIDER_CONFIG,
  LASTFM_PROVIDER_CONFIG,
  PLEX_PROVIDER_CONFIG,
];

/**
 * Get a built-in provider config by ID.
 */
export function getBuiltinProviderConfig(
  id: string,
): ICanaryProviderConfig<string> | undefined {
  return BUILTIN_PROVIDER_CONFIGS.find((config) => config.id === id);
}
