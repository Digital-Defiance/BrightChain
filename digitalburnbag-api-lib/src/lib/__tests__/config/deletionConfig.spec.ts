/**
 * Unit tests for Burnbag deletion configuration validation.
 *
 * Feature: vault-deletion-certificate
 * Requirements: 10
 */

import { validateDeletionConfig } from '../../config/deletionConfig';

describe('validateDeletionConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS'];
    delete process.env['BURNBAG_CERTIFICATE_RETENTION_DAYS'];
    delete process.env['BURNBAG_COOLDOWN_JOB_INTERVAL_MS'];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('default values', () => {
    it('returns default cooldownDays of 30 when env var is not set', () => {
      const config = validateDeletionConfig();
      expect(config.cooldownDays).toBe(30);
    });

    it('returns default certificateRetentionDays of 3650 when env var is not set', () => {
      const config = validateDeletionConfig();
      expect(config.certificateRetentionDays).toBe(3650);
    });

    it('returns default cooldownJobIntervalMs of 3600000 when env var is not set', () => {
      const config = validateDeletionConfig();
      expect(config.cooldownJobIntervalMs).toBe(3_600_000);
    });
  });

  describe('custom values from env vars', () => {
    it('uses custom cooldownDays from env var', () => {
      process.env['BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS'] = '7';
      const config = validateDeletionConfig();
      expect(config.cooldownDays).toBe(7);
    });

    it('uses custom certificateRetentionDays from env var', () => {
      process.env['BURNBAG_CERTIFICATE_RETENTION_DAYS'] = '365';
      const config = validateDeletionConfig();
      expect(config.certificateRetentionDays).toBe(365);
    });

    it('uses custom cooldownJobIntervalMs from env var', () => {
      process.env['BURNBAG_COOLDOWN_JOB_INTERVAL_MS'] = '60000';
      const config = validateDeletionConfig();
      expect(config.cooldownJobIntervalMs).toBe(60_000);
    });
  });

  describe('non-numeric values use defaults', () => {
    it('uses default cooldownDays when env var is non-numeric', () => {
      process.env['BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS'] = 'abc';
      const config = validateDeletionConfig();
      expect(config.cooldownDays).toBe(30);
    });

    it('uses default certificateRetentionDays when env var is non-numeric', () => {
      process.env['BURNBAG_CERTIFICATE_RETENTION_DAYS'] = 'not-a-number';
      const config = validateDeletionConfig();
      expect(config.certificateRetentionDays).toBe(3650);
    });

    it('uses default cooldownJobIntervalMs when env var is non-numeric', () => {
      process.env['BURNBAG_COOLDOWN_JOB_INTERVAL_MS'] = 'xyz';
      const config = validateDeletionConfig();
      expect(config.cooldownJobIntervalMs).toBe(3_600_000);
    });

    it('uses default when env var is an empty string', () => {
      process.env['BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS'] = '';
      const config = validateDeletionConfig();
      expect(config.cooldownDays).toBe(30);
    });
  });

  describe('out-of-range values throw errors', () => {
    it('throws when cooldownDays is less than 1', () => {
      process.env['BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS'] = '-5';
      expect(() => validateDeletionConfig()).toThrow(
        'CONFIG_INVALID_VALUE: BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS must be >= 1',
      );
    });

    it('throws when certificateRetentionDays is less than 1', () => {
      process.env['BURNBAG_CERTIFICATE_RETENTION_DAYS'] = '-10';
      expect(() => validateDeletionConfig()).toThrow(
        'CONFIG_INVALID_VALUE: BURNBAG_CERTIFICATE_RETENTION_DAYS must be >= 1',
      );
    });
  });

  describe('zero values throw errors', () => {
    it('throws when cooldownDays is zero', () => {
      process.env['BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS'] = '0';
      expect(() => validateDeletionConfig()).toThrow(
        'CONFIG_INVALID_VALUE: BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS must be >= 1',
      );
    });

    it('throws when certificateRetentionDays is zero', () => {
      process.env['BURNBAG_CERTIFICATE_RETENTION_DAYS'] = '0';
      expect(() => validateDeletionConfig()).toThrow(
        'CONFIG_INVALID_VALUE: BURNBAG_CERTIFICATE_RETENTION_DAYS must be >= 1',
      );
    });
  });
});
