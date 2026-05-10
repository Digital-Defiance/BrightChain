/**
 * Canary Provider System
 *
 * This module provides a flexible, extensible system for monitoring user
 * "heartbeat" activity across multiple online services. It supports:
 *
 * - PRESENCE detection: User activity detected (they're alive)
 * - ABSENCE detection: No activity within threshold (dead man's switch)
 * - DURESS detection: Distress signal detected (panic button, keyword, pattern)
 *
 * Providers can be:
 * - Built-in (GitHub, Fitbit, Twitter, etc.)
 * - Custom webhook-based (user defines their own)
 * - Configuration-driven (define new providers via JSON config)
 */

export * from './analytics-types';
export * from './canary-provider-adapter';
export * from './canary-provider-registry';
export * from './expansion-types';
export * from './failure-policy';
export * from './multi-canary-binding';
export * from './native-canary-config';
export * from './provider-connection-base';
export * from './provider-registration';
export * from './status-history-entry';
export * from './webhook-endpoint';
