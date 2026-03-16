/**
 * Unit tests for Email Gateway configuration loader.
 *
 * Validates that `loadGatewayConfig()` correctly reads from environment
 * variables (including EMAIL_DOMAIN), applying defaults when variables are unset.
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

import { createTestModeConfig, loadGatewayConfig } from './emailGatewayConfig';

describe('loadGatewayConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Isolate env mutations per test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should read canonicalDomain from EMAIL_DOMAIN env var', () => {
    process.env['EMAIL_DOMAIN'] = 'mynetwork.org';
    const config = loadGatewayConfig();
    expect(config.canonicalDomain).toBe('mynetwork.org');
  });

  it('should default canonicalDomain to example.com when EMAIL_DOMAIN is unset', () => {
    delete process.env['EMAIL_DOMAIN'];
    const config = loadGatewayConfig();
    expect(config.canonicalDomain).toBe('example.com');
  });

  it('should apply default values when no env vars are set', () => {
    // Clear all gateway env vars
    delete process.env['GATEWAY_POSTFIX_HOST'];
    delete process.env['GATEWAY_POSTFIX_PORT'];
    delete process.env['GATEWAY_POSTFIX_USER'];
    delete process.env['GATEWAY_POSTFIX_PASS'];
    delete process.env['GATEWAY_DKIM_KEY_PATH'];
    delete process.env['GATEWAY_DKIM_SELECTOR'];
    delete process.env['GATEWAY_MAIL_DROP_DIR'];
    delete process.env['GATEWAY_ERROR_DIR'];
    delete process.env['GATEWAY_MAX_MESSAGE_SIZE'];
    delete process.env['GATEWAY_LOOKUP_PORT'];
    delete process.env['GATEWAY_LOOKUP_CACHE_TTL'];
    delete process.env['GATEWAY_SPAM_ENGINE'];
    delete process.env['GATEWAY_SPAM_PROBABLE'];
    delete process.env['GATEWAY_SPAM_DEFINITE'];
    delete process.env['GATEWAY_QUEUE_CONCURRENCY'];
    delete process.env['GATEWAY_RETRY_MAX_COUNT'];
    delete process.env['GATEWAY_RETRY_MAX_DURATION'];
    delete process.env['GATEWAY_RETRY_BASE_INTERVAL'];

    const config = loadGatewayConfig();

    expect(config.postfixHost).toBe('localhost');
    expect(config.postfixPort).toBe(25);
    expect(config.postfixAuth).toBeUndefined();
    expect(config.dkimKeyPath).toBe('/etc/dkim/private.key');
    expect(config.dkimSelector).toBe('default');
    expect(config.mailDropDirectory).toBe(
      '/var/spool/brightchain/incoming/',
    );
    expect(config.errorDirectory).toBe('/var/spool/brightchain/errors/');
    expect(config.maxMessageSizeBytes).toBe(25 * 1024 * 1024);
    expect(config.recipientLookupPort).toBe(2526);
    expect(config.recipientLookupCacheTtlSeconds).toBe(300);
    expect(config.spamEngine).toBe('spamassassin');
    expect(config.spamThresholds).toEqual({
      probableSpamScore: 5.0,
      definiteSpamScore: 10.0,
    });
    expect(config.queueConcurrency).toBe(10);
    expect(config.retryMaxCount).toBe(5);
    expect(config.retryMaxDurationMs).toBe(48 * 60 * 60 * 1000);
    expect(config.retryBaseIntervalMs).toBe(60_000);
  });

  it('should read values from environment variables', () => {
    process.env['GATEWAY_POSTFIX_HOST'] = 'mail.example.com';
    process.env['GATEWAY_POSTFIX_PORT'] = '587';
    process.env['GATEWAY_DKIM_KEY_PATH'] = '/custom/dkim.key';
    process.env['GATEWAY_DKIM_SELECTOR'] = 'selector1';
    process.env['GATEWAY_MAIL_DROP_DIR'] = '/tmp/mail/';
    process.env['GATEWAY_ERROR_DIR'] = '/tmp/errors/';
    process.env['GATEWAY_MAX_MESSAGE_SIZE'] = '10485760';
    process.env['GATEWAY_LOOKUP_PORT'] = '3000';
    process.env['GATEWAY_LOOKUP_CACHE_TTL'] = '600';
    process.env['GATEWAY_SPAM_ENGINE'] = 'rspamd';
    process.env['GATEWAY_SPAM_PROBABLE'] = '3.5';
    process.env['GATEWAY_SPAM_DEFINITE'] = '8.0';
    process.env['GATEWAY_QUEUE_CONCURRENCY'] = '20';
    process.env['GATEWAY_RETRY_MAX_COUNT'] = '10';
    process.env['GATEWAY_RETRY_MAX_DURATION'] = '86400000';
    process.env['GATEWAY_RETRY_BASE_INTERVAL'] = '30000';

    const config = loadGatewayConfig();

    expect(config.postfixHost).toBe('mail.example.com');
    expect(config.postfixPort).toBe(587);
    expect(config.dkimKeyPath).toBe('/custom/dkim.key');
    expect(config.dkimSelector).toBe('selector1');
    expect(config.mailDropDirectory).toBe('/tmp/mail/');
    expect(config.errorDirectory).toBe('/tmp/errors/');
    expect(config.maxMessageSizeBytes).toBe(10485760);
    expect(config.recipientLookupPort).toBe(3000);
    expect(config.recipientLookupCacheTtlSeconds).toBe(600);
    expect(config.spamEngine).toBe('rspamd');
    expect(config.spamThresholds).toEqual({
      probableSpamScore: 3.5,
      definiteSpamScore: 8.0,
    });
    expect(config.queueConcurrency).toBe(20);
    expect(config.retryMaxCount).toBe(10);
    expect(config.retryMaxDurationMs).toBe(86400000);
    expect(config.retryBaseIntervalMs).toBe(30000);
  });

  it('should set postfixAuth when both user and pass are provided', () => {
    process.env['GATEWAY_POSTFIX_USER'] = 'smtp-user';
    process.env['GATEWAY_POSTFIX_PASS'] = 'smtp-pass';

    const config = loadGatewayConfig();

    expect(config.postfixAuth).toEqual({
      user: 'smtp-user',
      pass: 'smtp-pass',
    });
  });

  it('should not set postfixAuth when only user is provided', () => {
    process.env['GATEWAY_POSTFIX_USER'] = 'smtp-user';
    delete process.env['GATEWAY_POSTFIX_PASS'];

    const config = loadGatewayConfig();
    expect(config.postfixAuth).toBeUndefined();
  });

  it('should not set postfixAuth when only pass is provided', () => {
    delete process.env['GATEWAY_POSTFIX_USER'];
    process.env['GATEWAY_POSTFIX_PASS'] = 'smtp-pass';

    const config = loadGatewayConfig();
    expect(config.postfixAuth).toBeUndefined();
  });

  it('should fall back to defaults for invalid numeric env vars', () => {
    process.env['GATEWAY_POSTFIX_PORT'] = 'not-a-number';
    process.env['GATEWAY_MAX_MESSAGE_SIZE'] = 'abc';
    process.env['GATEWAY_SPAM_PROBABLE'] = 'xyz';

    const config = loadGatewayConfig();

    expect(config.postfixPort).toBe(25);
    expect(config.maxMessageSizeBytes).toBe(25 * 1024 * 1024);
    expect(config.spamThresholds.probableSpamScore).toBe(5.0);
  });

  describe('test mode configuration', () => {
    beforeEach(() => {
      // Clear all test mode env vars
      delete process.env['GATEWAY_TEST_MODE'];
      delete process.env['GATEWAY_TEST_CATCHALL'];
      delete process.env['GATEWAY_TEST_CATCHALL_DIR'];
      delete process.env['GATEWAY_TEST_SKIP_DKIM'];
      delete process.env['GATEWAY_TEST_SKIP_SPAM'];
      delete process.env['GATEWAY_TEST_ACCEPT_ALL_RECIPIENTS'];
      delete process.env['GATEWAY_TEST_RECIPIENTS'];
    });

    it('should default test mode to disabled', () => {
      const config = loadGatewayConfig();
      expect(config.testMode.enabled).toBe(false);
      expect(config.testMode.catchallEnabled).toBe(false);
      expect(config.testMode.skipDkim).toBe(false);
      expect(config.testMode.skipSpamFilter).toBe(false);
      expect(config.testMode.acceptAllRecipients).toBe(false);
      expect(config.testMode.testRecipients).toEqual([]);
    });

    it('should enable test mode from GATEWAY_TEST_MODE env var', () => {
      process.env['GATEWAY_TEST_MODE'] = 'true';
      const config = loadGatewayConfig();
      expect(config.testMode.enabled).toBe(true);
    });

    it('should accept various truthy values for boolean env vars', () => {
      process.env['GATEWAY_TEST_MODE'] = '1';
      process.env['GATEWAY_TEST_CATCHALL'] = 'yes';
      process.env['GATEWAY_TEST_SKIP_DKIM'] = 'TRUE';

      const config = loadGatewayConfig();

      expect(config.testMode.enabled).toBe(true);
      expect(config.testMode.catchallEnabled).toBe(true);
      expect(config.testMode.skipDkim).toBe(true);
    });

    it('should read catchall directory from env var', () => {
      process.env['GATEWAY_TEST_CATCHALL_DIR'] = '/custom/catchall/';
      const config = loadGatewayConfig();
      expect(config.testMode.catchallDirectory).toBe('/custom/catchall/');
    });

    it('should parse comma-separated test recipients', () => {
      process.env['GATEWAY_TEST_RECIPIENTS'] =
        'alice@test.local, bob@test.local, charlie@test.local';
      const config = loadGatewayConfig();
      expect(config.testMode.testRecipients).toEqual([
        'alice@test.local',
        'bob@test.local',
        'charlie@test.local',
      ]);
    });

    it('should handle empty test recipients', () => {
      process.env['GATEWAY_TEST_RECIPIENTS'] = '';
      const config = loadGatewayConfig();
      expect(config.testMode.testRecipients).toEqual([]);
    });

    it('should filter empty entries from test recipients', () => {
      process.env['GATEWAY_TEST_RECIPIENTS'] = 'alice@test.local,,bob@test.local,';
      const config = loadGatewayConfig();
      expect(config.testMode.testRecipients).toEqual([
        'alice@test.local',
        'bob@test.local',
      ]);
    });
  });

  describe('createTestModeConfig', () => {
    it('should create a config with all test mode features enabled', () => {
      const config = createTestModeConfig();

      expect(config.testMode.enabled).toBe(true);
      expect(config.testMode.catchallEnabled).toBe(true);
      expect(config.testMode.skipDkim).toBe(true);
      expect(config.testMode.skipSpamFilter).toBe(true);
      expect(config.testMode.acceptAllRecipients).toBe(true);
    });

    it('should allow overriding specific config values', () => {
      const config = createTestModeConfig({
        canonicalDomain: 'custom.local',
        postfixPort: 2525,
      });

      expect(config.canonicalDomain).toBe('custom.local');
      expect(config.postfixPort).toBe(2525);
      expect(config.testMode.enabled).toBe(true);
    });

    it('should use default catchall directory', () => {
      const config = createTestModeConfig();
      expect(config.testMode.catchallDirectory).toBe(
        '/var/spool/brightchain/catchall/',
      );
    });
  });
});
