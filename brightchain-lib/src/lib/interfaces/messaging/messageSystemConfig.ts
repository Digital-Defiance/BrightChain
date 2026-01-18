export interface IMessageSystemConfig {
  enableMessageSizedBlocks: boolean;
  minMessageSizeThreshold: number;
  maxMessageSizeThreshold: number;
  paddingStrategy: 'zero' | 'random';
  storageRetryAttempts: number;
  storageRetryDelayMs: number;
  routingTimeoutMs: number;
  queryTimeoutMs: number;
  eventEmissionRetries: number;
  defaultMessageTTLMs: number;
  maxRecipientsPerMessage: number;
}

export const DEFAULT_MESSAGE_SYSTEM_CONFIG: IMessageSystemConfig = {
  enableMessageSizedBlocks: true,
  minMessageSizeThreshold: 256,
  maxMessageSizeThreshold: 1048576,
  paddingStrategy: 'zero',
  storageRetryAttempts: 3,
  storageRetryDelayMs: 1000,
  routingTimeoutMs: 30000,
  queryTimeoutMs: 5000,
  eventEmissionRetries: 3,
  defaultMessageTTLMs: 86400000,
  maxRecipientsPerMessage: 1000,
};

export function loadMessageSystemConfig(): IMessageSystemConfig {
  return {
    enableMessageSizedBlocks: process.env['MESSAGE_ENABLE_SIZED_BLOCKS'] === 'true' || DEFAULT_MESSAGE_SYSTEM_CONFIG.enableMessageSizedBlocks,
    minMessageSizeThreshold: parseInt(process.env['MESSAGE_MIN_SIZE_THRESHOLD'] || '') || DEFAULT_MESSAGE_SYSTEM_CONFIG.minMessageSizeThreshold,
    maxMessageSizeThreshold: parseInt(process.env['MESSAGE_MAX_SIZE_THRESHOLD'] || '') || DEFAULT_MESSAGE_SYSTEM_CONFIG.maxMessageSizeThreshold,
    paddingStrategy: (process.env['MESSAGE_PADDING_STRATEGY'] as 'zero' | 'random') || DEFAULT_MESSAGE_SYSTEM_CONFIG.paddingStrategy,
    storageRetryAttempts: parseInt(process.env['MESSAGE_STORAGE_RETRY_ATTEMPTS'] || '') || DEFAULT_MESSAGE_SYSTEM_CONFIG.storageRetryAttempts,
    storageRetryDelayMs: parseInt(process.env['MESSAGE_STORAGE_RETRY_DELAY_MS'] || '') || DEFAULT_MESSAGE_SYSTEM_CONFIG.storageRetryDelayMs,
    routingTimeoutMs: parseInt(process.env['MESSAGE_ROUTING_TIMEOUT_MS'] || '') || DEFAULT_MESSAGE_SYSTEM_CONFIG.routingTimeoutMs,
    queryTimeoutMs: parseInt(process.env['MESSAGE_QUERY_TIMEOUT_MS'] || '') || DEFAULT_MESSAGE_SYSTEM_CONFIG.queryTimeoutMs,
    eventEmissionRetries: parseInt(process.env['MESSAGE_EVENT_EMISSION_RETRIES'] || '') || DEFAULT_MESSAGE_SYSTEM_CONFIG.eventEmissionRetries,
    defaultMessageTTLMs: parseInt(process.env['MESSAGE_DEFAULT_TTL_MS'] || '') || DEFAULT_MESSAGE_SYSTEM_CONFIG.defaultMessageTTLMs,
    maxRecipientsPerMessage: parseInt(process.env['MESSAGE_MAX_RECIPIENTS'] || '') || DEFAULT_MESSAGE_SYSTEM_CONFIG.maxRecipientsPerMessage,
  };
}
