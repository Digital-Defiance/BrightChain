/**
 * Email Gateway Configuration
 *
 * Defines the `IEmailGatewayConfig` interface and a `loadGatewayConfig()` loader
 * that reads values from `environment.emailDomain` (EMAIL_DOMAIN env var) and
 * other environment variables with sensible defaults.
 *
 * All Node.js-specific gateway configuration lives here in brightchain-api-lib.
 * The shared `ISpamThresholds` interface is imported from brightchain-lib.
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 * @module emailGatewayConfig
 */

import {
  type ISpamThresholds,
} from '@brightchain/brightchain-lib';

/**
 * Complete configuration for the Email Gateway.
 *
 * Each field maps to an environment variable (noted in comments) with a
 * default value applied by `loadGatewayConfig()` when the variable is unset.
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */
export interface IEmailGatewayConfig {
  /** Canonical email domain for this BrightChain instance (from environment.emailDomain / EMAIL_DOMAIN env var). Req 8.1 */
  canonicalDomain: string;

  /** Postfix MTA hostname. env: GATEWAY_POSTFIX_HOST. Req 8.2 */
  postfixHost: string;

  /** Postfix MTA port. env: GATEWAY_POSTFIX_PORT. Req 8.2 */
  postfixPort: number;

  /** Optional Postfix authentication credentials. env: GATEWAY_POSTFIX_USER / GATEWAY_POSTFIX_PASS. Req 8.2 */
  postfixAuth?: { user: string; pass: string };

  /** Path to the DKIM private key file. env: GATEWAY_DKIM_KEY_PATH. Req 8.3 */
  dkimKeyPath: string;

  /** DKIM selector for DNS lookup. env: GATEWAY_DKIM_SELECTOR. Req 8.3 */
  dkimSelector: string;

  /** Directory where Postfix deposits inbound mail (Maildir format). env: GATEWAY_MAIL_DROP_DIR. Req 8.6 */
  mailDropDirectory: string;

  /** Directory for messages that fail inbound processing. env: GATEWAY_ERROR_DIR. Req 8.6 */
  errorDirectory: string;

  /** Maximum outbound message size in bytes. env: GATEWAY_MAX_MESSAGE_SIZE. Req 8.4 */
  maxMessageSizeBytes: number;

  /** TCP port for the Recipient Lookup Service (socketmap). env: GATEWAY_LOOKUP_PORT. Req 8.7 */
  recipientLookupPort: number;

  /** Cache TTL in seconds for positive recipient lookups. env: GATEWAY_LOOKUP_CACHE_TTL. Req 8.7 */
  recipientLookupCacheTtlSeconds: number;

  /** Anti-spam engine selection. env: GATEWAY_SPAM_ENGINE. Req 8.4 */
  spamEngine: 'spamassassin' | 'rspamd';

  /** Score thresholds for spam classification. env: GATEWAY_SPAM_PROBABLE / GATEWAY_SPAM_DEFINITE. Req 8.4 */
  spamThresholds: ISpamThresholds;

  /** Maximum concurrent outbound SMTP connections. env: GATEWAY_QUEUE_CONCURRENCY. Req 8.4 */
  queueConcurrency: number;

  /** Maximum number of delivery retry attempts. env: GATEWAY_RETRY_MAX_COUNT. Req 8.4 */
  retryMaxCount: number;

  /** Maximum total retry duration in milliseconds. env: GATEWAY_RETRY_MAX_DURATION. Req 8.4 */
  retryMaxDurationMs: number;

  /** Base interval in milliseconds for exponential back-off. env: GATEWAY_RETRY_BASE_INTERVAL. Req 8.4 */
  retryBaseIntervalMs: number;
}

/** Default mail drop directory path */
const DEFAULT_MAIL_DROP_DIR = '/var/spool/brightchain/incoming/';

/** Default error directory path */
const DEFAULT_ERROR_DIR = '/var/spool/brightchain/errors/';

/** Default maximum message size: 25 MB */
const DEFAULT_MAX_MESSAGE_SIZE = 25 * 1024 * 1024;

/** Default recipient lookup port */
const DEFAULT_LOOKUP_PORT = 2526;

/** Default recipient lookup cache TTL in seconds */
const DEFAULT_LOOKUP_CACHE_TTL = 300;

/** Default queue concurrency */
const DEFAULT_QUEUE_CONCURRENCY = 10;

/** Default retry max count */
const DEFAULT_RETRY_MAX_COUNT = 5;

/** Default retry max duration: 48 hours in ms */
const DEFAULT_RETRY_MAX_DURATION = 48 * 60 * 60 * 1000;

/** Default retry base interval: 60 seconds in ms */
const DEFAULT_RETRY_BASE_INTERVAL = 60_000;

/** Default probable spam score threshold */
const DEFAULT_SPAM_PROBABLE = 5.0;

/** Default definite spam score threshold */
const DEFAULT_SPAM_DEFINITE = 10.0;

/**
 * Parse an integer from an environment variable, returning a default if unset or invalid.
 */
function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a float from an environment variable, returning a default if unset or invalid.
 */
function envFloat(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const parsed = parseFloat(raw);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Read a string environment variable, returning a default if unset.
 */
function envString(name: string, defaultValue: string): string {
  const raw = process.env[name];
  return raw !== undefined && raw !== '' ? raw : defaultValue;
}

/**
 * Load the Email Gateway configuration from environment variables.
 *
 * The canonical domain is read from the `EMAIL_DOMAIN` env var (matching
 * `environment.emailDomain`). All other settings are read from their
 * respective `GATEWAY_*` env vars with sensible defaults.
 *
 * @returns A fully populated `IEmailGatewayConfig`.
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */
export function loadGatewayConfig(): IEmailGatewayConfig {
  const postfixUser = process.env['GATEWAY_POSTFIX_USER'];
  const postfixPass = process.env['GATEWAY_POSTFIX_PASS'];

  return {
    canonicalDomain: envString('EMAIL_DOMAIN', 'example.com'),
    postfixHost: envString('GATEWAY_POSTFIX_HOST', 'localhost'),
    postfixPort: envInt('GATEWAY_POSTFIX_PORT', 25),
    postfixAuth:
      postfixUser && postfixPass
        ? { user: postfixUser, pass: postfixPass }
        : undefined,
    dkimKeyPath: envString('GATEWAY_DKIM_KEY_PATH', '/etc/dkim/private.key'),
    dkimSelector: envString('GATEWAY_DKIM_SELECTOR', 'default'),
    mailDropDirectory: envString(
      'GATEWAY_MAIL_DROP_DIR',
      DEFAULT_MAIL_DROP_DIR,
    ),
    errorDirectory: envString('GATEWAY_ERROR_DIR', DEFAULT_ERROR_DIR),
    maxMessageSizeBytes: envInt(
      'GATEWAY_MAX_MESSAGE_SIZE',
      DEFAULT_MAX_MESSAGE_SIZE,
    ),
    recipientLookupPort: envInt('GATEWAY_LOOKUP_PORT', DEFAULT_LOOKUP_PORT),
    recipientLookupCacheTtlSeconds: envInt(
      'GATEWAY_LOOKUP_CACHE_TTL',
      DEFAULT_LOOKUP_CACHE_TTL,
    ),
    spamEngine: envString('GATEWAY_SPAM_ENGINE', 'spamassassin') as
      | 'spamassassin'
      | 'rspamd',
    spamThresholds: {
      probableSpamScore: envFloat(
        'GATEWAY_SPAM_PROBABLE',
        DEFAULT_SPAM_PROBABLE,
      ),
      definiteSpamScore: envFloat(
        'GATEWAY_SPAM_DEFINITE',
        DEFAULT_SPAM_DEFINITE,
      ),
    },
    queueConcurrency: envInt(
      'GATEWAY_QUEUE_CONCURRENCY',
      DEFAULT_QUEUE_CONCURRENCY,
    ),
    retryMaxCount: envInt('GATEWAY_RETRY_MAX_COUNT', DEFAULT_RETRY_MAX_COUNT),
    retryMaxDurationMs: envInt(
      'GATEWAY_RETRY_MAX_DURATION',
      DEFAULT_RETRY_MAX_DURATION,
    ),
    retryBaseIntervalMs: envInt(
      'GATEWAY_RETRY_BASE_INTERVAL',
      DEFAULT_RETRY_BASE_INTERVAL,
    ),
  };
}
