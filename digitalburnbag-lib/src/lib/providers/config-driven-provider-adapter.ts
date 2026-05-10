import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  HeartbeatSignalType,
  ICanaryProviderAdapter,
  ICanaryProviderConfig,
  IDuressDetectionConfig,
  IHeartbeatCheckOptions,
  IHeartbeatCheckResult,
  IHeartbeatEvent,
  IProviderCredentials,
} from '../interfaces/canary-provider';

/**
 * HTTP client interface for making API requests.
 * Allows injection of different HTTP implementations (fetch, axios, etc.)
 */
export interface IHttpClient {
  request<T>(options: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  }): Promise<{
    status: number;
    data: T;
    headers: Record<string, string>;
  }>;
}

/**
 * JSONPath-like value extractor.
 * Supports simple dot notation and array indexing.
 */
function extractValue(obj: unknown, path: string): unknown {
  if (!path || path === '$') return obj;

  const parts = path
    .replace(/^\$\.?/, '')
    .split(/\.|\[|\]/)
    .filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Parse a timestamp based on the configured format.
 */
function parseTimestamp(value: unknown, format: string): Date | null {
  if (value === null || value === undefined) return null;

  switch (format) {
    case 'iso8601':
      return new Date(String(value));
    case 'unix':
      return new Date(Number(value) * 1000);
    case 'unix_ms':
      return new Date(Number(value));
    default:
      // Try ISO8601 as fallback
      return new Date(String(value));
  }
}

/**
 * Check if text contains any duress keywords or patterns.
 */
function checkForDuress(
  text: string,
  config: IDuressDetectionConfig,
): { detected: boolean; type?: string; match?: string } {
  if (!config.enabled) return { detected: false };

  const lowerText = text.toLowerCase();

  // Check keywords
  if (config.duressKeywords) {
    for (const keyword of config.duressKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return { detected: true, type: 'keyword', match: keyword };
      }
    }
  }

  // Check regex patterns
  if (config.duressPatterns) {
    for (const pattern of config.duressPatterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        const match = text.match(regex);
        if (match) {
          return { detected: true, type: 'pattern', match: match[0] };
        }
      } catch {
        // Invalid regex, skip
      }
    }
  }

  return { detected: false };
}

/**
 * A configuration-driven provider adapter that can handle any provider
 * defined via ICanaryProviderConfig without custom code.
 *
 * This enables users to add new providers by simply providing a JSON config.
 */
export class ConfigDrivenProviderAdapter<TID extends PlatformID = string>
  implements ICanaryProviderAdapter<TID>
{
  constructor(
    private readonly config: ICanaryProviderConfig<TID>,
    private readonly httpClient: IHttpClient,
    private readonly generateEventId: () => TID,
  ) {}

  getConfig(): ICanaryProviderConfig<TID> {
    return this.config;
  }

  /**
   * Build the full URL with placeholder substitution.
   */
  private buildUrl(path: string, placeholders: Record<string, string>): string {
    let url = `${this.config.baseUrl}${path}`;
    for (const [key, value] of Object.entries(placeholders)) {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    }
    return url;
  }

  /**
   * Build headers for the request including auth.
   */
  private buildHeaders(
    credentials: IProviderCredentials<TID>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.customHeaders,
    };

    switch (this.config.auth.type) {
      case 'oauth2':
        if (credentials.accessToken) {
          headers['Authorization'] = `Bearer ${credentials.accessToken}`;
        }
        break;
      case 'api_key':
        if (credentials.apiKey && this.config.auth.apiKey) {
          const prefix = this.config.auth.apiKey.headerPrefix || '';
          headers[this.config.auth.apiKey.headerName] =
            `${prefix}${credentials.apiKey}`;
        }
        break;
      case 'custom':
        if (this.config.auth.customHeaderTemplate && credentials.accessToken) {
          headers['Authorization'] =
            this.config.auth.customHeaderTemplate.replace(
              '{sessionToken}',
              credentials.accessToken,
            );
        }
        break;
    }

    return headers;
  }

  /**
   * Parse API response into normalized heartbeat events.
   */
  private parseEvents(
    data: unknown,
    duressConfig?: IDuressDetectionConfig,
  ): IHeartbeatEvent<TID>[] {
    const mapping = this.config.endpoints.activity.responseMapping;
    const eventsData = extractValue(data, mapping.eventsPath);

    if (!Array.isArray(eventsData)) {
      // Single event or no events
      if (eventsData && typeof eventsData === 'object') {
        const event = this.parseEvent(eventsData, duressConfig);
        return event ? [event] : [];
      }
      return [];
    }

    return eventsData
      .map((item) => this.parseEvent(item, duressConfig))
      .filter((e): e is IHeartbeatEvent<TID> => e !== null);
  }

  /**
   * Parse a single event from the API response.
   */
  private parseEvent(
    item: unknown,
    duressConfig?: IDuressDetectionConfig,
  ): IHeartbeatEvent<TID> | null {
    const mapping = this.config.endpoints.activity.responseMapping;

    const timestampValue = extractValue(item, mapping.timestampPath);
    const timestamp = parseTimestamp(timestampValue, mapping.timestampFormat);
    if (!timestamp || isNaN(timestamp.getTime())) return null;

    const activityType = mapping.activityTypePath
      ? String(
          extractValue(item, mapping.activityTypePath) ||
            mapping.defaultActivityType ||
            'activity',
        )
      : mapping.defaultActivityType || 'activity';

    const eventId = mapping.eventIdPath
      ? (extractValue(item, mapping.eventIdPath) as TID)
      : this.generateEventId();

    const numericValue = mapping.numericValuePath
      ? Number(extractValue(item, mapping.numericValuePath))
      : undefined;

    // Check for duress indicators in text content
    let isDuressIndicator = false;
    let duressType: string | undefined;

    if (duressConfig?.enabled) {
      // Look for text content to check for duress keywords
      const textFields = [
        'text',
        'message',
        'body',
        'content',
        'commit.message',
      ];
      for (const field of textFields) {
        const text = extractValue(item, field);
        if (typeof text === 'string') {
          const duressCheck = checkForDuress(text, duressConfig);
          if (duressCheck.detected) {
            isDuressIndicator = true;
            duressType = duressCheck.type;
            break;
          }
        }
      }

      // Check if activity type itself indicates duress
      if (duressConfig.duressActivityTypes?.includes(activityType)) {
        isDuressIndicator = true;
        duressType = 'activity_type';
      }
    }

    // Extract location if configured
    let location: IHeartbeatEvent<TID>['location'];
    if (mapping.locationPaths) {
      const lat = extractValue(item, mapping.locationPaths.latitude || '');
      const lng = extractValue(item, mapping.locationPaths.longitude || '');
      if (lat !== undefined && lng !== undefined) {
        location = {
          latitude: Number(lat),
          longitude: Number(lng),
          accuracy: mapping.locationPaths.accuracy
            ? Number(extractValue(item, mapping.locationPaths.accuracy))
            : undefined,
        };
      }
    }

    return {
      eventId,
      providerId: this.config.id as TID,
      timestamp,
      activityType,
      rawData: item as Record<string, unknown>,
      numericValue,
      location,
      isActiveEngagement: true, // Assume all events are active engagement
      isDuressIndicator,
      duressType,
    };
  }

  async checkHeartbeat(
    credentials: IProviderCredentials<TID>,
    since: Date,
    until?: Date,
    options?: IHeartbeatCheckOptions,
  ): Promise<IHeartbeatCheckResult<TID>> {
    const now = until || new Date();
    const checkedAt = new Date();

    // Build placeholders for URL substitution
    const placeholders: Record<string, string> = {
      userId: credentials.providerUserId || '',
      since: since.toISOString(),
      sinceISO: since.toISOString(),
      sinceUnix: String(Math.floor(since.getTime() / 1000)),
      until: now.toISOString(),
      untilISO: now.toISOString(),
      untilUnix: String(Math.floor(now.getTime() / 1000)),
      date: now.toISOString().split('T')[0],
    };

    try {
      const endpoint = this.config.endpoints.activity;
      let url = this.buildUrl(endpoint.path, placeholders);

      // Add query parameters
      if (endpoint.queryParams) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(endpoint.queryParams)) {
          let substituted = value;
          for (const [pk, pv] of Object.entries(placeholders)) {
            substituted = substituted.replace(`{${pk}}`, pv);
          }
          params.append(key, substituted);
        }
        url += `?${params.toString()}`;
      }

      const headers = this.buildHeaders(credentials);

      let body: string | undefined;
      if (endpoint.method === 'POST' && endpoint.bodyTemplate) {
        body = endpoint.bodyTemplate;
        for (const [key, value] of Object.entries(placeholders)) {
          body = body.replace(`{${key}}`, value);
        }
      }

      const response = await this.httpClient.request<unknown>({
        url,
        method: endpoint.method,
        headers,
        body,
        timeout: 30000,
      });

      const events = this.parseEvents(response.data, options?.duressConfig);
      const latestEvent =
        events.length > 0
          ? events.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
          : undefined;

      // Calculate time since last activity
      const timeSinceLastActivityMs = latestEvent
        ? now.getTime() - latestEvent.timestamp.getTime()
        : null;

      // Determine signal type
      let signalType: HeartbeatSignalType;
      let isAlive: boolean | undefined;
      let duressDetected = false;
      let duressDetails: IHeartbeatCheckResult<TID>['duressDetails'];

      // Check for duress first (highest priority)
      const duressEvent = events.find((e) => e.isDuressIndicator);
      if (duressEvent) {
        signalType = HeartbeatSignalType.DURESS;
        duressDetected = true;
        duressDetails = {
          type: duressEvent.duressType || 'unknown',
          triggerEvent: duressEvent,
        };
        isAlive = true; // User is alive but under duress
      } else if (events.length > 0) {
        // Check for absence based on threshold
        const absenceThresholdMs = options?.absenceConfig?.thresholdMs;
        if (
          absenceThresholdMs &&
          timeSinceLastActivityMs !== null &&
          timeSinceLastActivityMs > absenceThresholdMs
        ) {
          signalType = HeartbeatSignalType.ABSENCE;
          isAlive = false;
        } else {
          signalType = HeartbeatSignalType.PRESENCE;
          isAlive = true;
        }
      } else {
        // No events found
        const absenceThresholdMs = options?.absenceConfig?.thresholdMs;
        if (absenceThresholdMs) {
          signalType = HeartbeatSignalType.ABSENCE;
          isAlive = false;
        } else {
          signalType = HeartbeatSignalType.INCONCLUSIVE;
          isAlive = undefined;
        }
      }

      // Calculate confidence based on event count and recency
      let confidence = 0.5;
      if (events.length > 0) {
        // More events = higher confidence
        confidence = Math.min(0.9, 0.5 + events.length * 0.05);
        // More recent = higher confidence
        if (timeSinceLastActivityMs !== null) {
          const hoursSinceActivity = timeSinceLastActivityMs / (60 * 60 * 1000);
          confidence = Math.max(0.3, confidence - hoursSinceActivity * 0.02);
        }
      }

      return {
        success: true,
        checkedAt,
        latestEvent,
        events:
          options?.includeEventDetails !== false
            ? events.slice(0, options?.maxEvents || 100)
            : [],
        eventCount: events.length,
        signalType,
        isAlive,
        confidence,
        timeSinceLastActivityMs,
        absenceThresholdMs: options?.absenceConfig?.thresholdMs,
        duressDetected,
        duressDetails,
        providerMetadata: {
          statusCode: response.status,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        checkedAt,
        events: [],
        eventCount: 0,
        signalType: HeartbeatSignalType.CHECK_FAILED,
        isAlive: undefined,
        confidence: 0,
        timeSinceLastActivityMs: null,
        duressDetected: false,
      };
    }
  }

  async validateCredentials(
    credentials: IProviderCredentials<TID>,
  ): Promise<{ valid: boolean; error?: string }> {
    if (!this.config.endpoints.healthCheck) {
      // No health check endpoint, assume valid if we have credentials
      return { valid: !!credentials.accessToken || !!credentials.apiKey };
    }

    try {
      const url = this.buildUrl(this.config.endpoints.healthCheck.path, {});
      const headers = this.buildHeaders(credentials);

      const response = await this.httpClient.request<unknown>({
        url,
        method: this.config.endpoints.healthCheck.method,
        headers,
        timeout: 10000,
      });

      return {
        valid:
          response.status === this.config.endpoints.healthCheck.expectedStatus,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  supportsDuressDetection(): boolean {
    // All config-driven providers support basic keyword/pattern duress detection
    return true;
  }

  getSupportedDuressTypes(): string[] {
    return ['keyword', 'pattern', 'activity_type'];
  }

  getRecommendedCheckIntervalMs(): number {
    return this.config.minCheckIntervalMs;
  }
}
