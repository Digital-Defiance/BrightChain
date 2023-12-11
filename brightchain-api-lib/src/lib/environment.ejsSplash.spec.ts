/**
 * Unit tests for Environment EJS splash page properties.
 *
 * Validates: Requirements 3.1, 3.7, 3.8, 3.9
 */
import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Environment } from './environment';

/**
 * Required base env vars that Environment's parent constructor needs.
 */
function setBaseEnvVars(): void {
  process.env['JWT_SECRET'] =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env['MNEMONIC_HMAC_SECRET'] =
    'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  process.env['MNEMONIC_ENCRYPTION_KEY'] =
    'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  process.env['API_DIST_DIR'] = process.cwd();
  process.env['REACT_DIST_DIR'] = process.cwd();
}

/** EJS-related env vars to clean between tests. */
const ejsEnvVars = ['EJS_SPLASH_ROOT', 'SPLASH_TEMPLATE_PATH'];

function clearEjsEnvVars(): void {
  for (const key of ejsEnvVars) {
    delete process.env[key];
  }
}

describe('Environment EJS Splash Properties', () => {
  beforeEach(() => {
    setBaseEnvVars();
    clearEjsEnvVars();
  });

  afterEach(() => {
    clearEjsEnvVars();
    jest.restoreAllMocks();
  });

  describe('ejsSplashRoot (Requirement 3.1)', () => {
    it('should be undefined when EJS_SPLASH_ROOT is not set', () => {
      const env = new Environment(undefined, true);
      expect(env.ejsSplashRoot).toBeUndefined();
    });

    it('should read EJS_SPLASH_ROOT from environment', () => {
      process.env['EJS_SPLASH_ROOT'] = '/tmp/my-templates';
      const env = new Environment(undefined, true);
      expect(env.ejsSplashRoot).toBe('/tmp/my-templates');
    });
  });

  describe('splashTemplatePath backward compatibility (Requirement 3.9)', () => {
    it('should be undefined when SPLASH_TEMPLATE_PATH is not set', () => {
      const env = new Environment(undefined, true);
      expect(env.splashTemplatePath).toBeUndefined();
    });

    it('should read SPLASH_TEMPLATE_PATH from environment', () => {
      process.env['SPLASH_TEMPLATE_PATH'] = '/tmp/splash.ejs';
      const env = new Environment(undefined, true);
      expect(env.splashTemplatePath).toBe('/tmp/splash.ejs');
    });
  });

  describe('deprecation warning when both are set (Requirement 3.8)', () => {
    it('should log a deprecation warning when both EJS_SPLASH_ROOT and SPLASH_TEMPLATE_PATH are set', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      process.env['EJS_SPLASH_ROOT'] = '/tmp/ejs-root';
      process.env['SPLASH_TEMPLATE_PATH'] = '/tmp/splash.ejs';
      new Environment(undefined, true);

      const deprecationCall = warnSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('SPLASH_TEMPLATE_PATH') &&
          call[0].includes('deprecated'),
      );
      expect(deprecationCall).toBeDefined();
    });

    it('should not log a deprecation warning when only EJS_SPLASH_ROOT is set', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      process.env['EJS_SPLASH_ROOT'] = '/tmp/ejs-root';
      new Environment(undefined, true);

      const deprecationCall = warnSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('SPLASH_TEMPLATE_PATH') &&
          call[0].includes('deprecated'),
      );
      expect(deprecationCall).toBeUndefined();
    });

    it('should not log a deprecation warning when only SPLASH_TEMPLATE_PATH is set', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      process.env['SPLASH_TEMPLATE_PATH'] = '/tmp/splash.ejs';
      new Environment(undefined, true);

      const deprecationCall = warnSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('SPLASH_TEMPLATE_PATH') &&
          call[0].includes('deprecated'),
      );
      expect(deprecationCall).toBeUndefined();
    });
  });

  describe('relative and absolute path handling (Requirement 3.7)', () => {
    it('should resolve an absolute EJS_SPLASH_ROOT path as-is', () => {
      process.env['EJS_SPLASH_ROOT'] = '/absolute/path/to/templates';
      const env = new Environment(undefined, true);
      expect(env.ejsSplashRoot).toBe('/absolute/path/to/templates');
    });

    it('should resolve a relative EJS_SPLASH_ROOT path against process.cwd()', () => {
      process.env['EJS_SPLASH_ROOT'] = 'relative/templates';
      const env = new Environment(undefined, true);
      expect(env.ejsSplashRoot).toBe(
        resolve(process.cwd(), 'relative/templates'),
      );
    });

    it('should resolve an absolute SPLASH_TEMPLATE_PATH as-is', () => {
      process.env['SPLASH_TEMPLATE_PATH'] = '/absolute/path/splash.ejs';
      const env = new Environment(undefined, true);
      expect(env.splashTemplatePath).toBe('/absolute/path/splash.ejs');
    });

    it('should resolve a relative SPLASH_TEMPLATE_PATH against process.cwd()', () => {
      process.env['SPLASH_TEMPLATE_PATH'] = 'relative/splash.ejs';
      const env = new Environment(undefined, true);
      expect(env.splashTemplatePath).toBe(
        resolve(process.cwd(), 'relative/splash.ejs'),
      );
    });

    it('should resolve both properties when both are set', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      process.env['EJS_SPLASH_ROOT'] = '/abs/ejs-root';
      process.env['SPLASH_TEMPLATE_PATH'] = 'rel/splash.ejs';
      const env = new Environment(undefined, true);

      expect(env.ejsSplashRoot).toBe('/abs/ejs-root');
      expect(env.splashTemplatePath).toBe(
        resolve(process.cwd(), 'rel/splash.ejs'),
      );
    });
  });
});
