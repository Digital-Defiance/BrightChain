/**
 * Unit tests for WCAP configuration validation.
 *
 * Feature: digitalburnbag-wcap-signing
 * Requirements: 4.3
 */

import type { IWcapConfig } from '@brightchain/digitalburnbag-lib';
import { WCAP_DEFAULTS } from '@brightchain/digitalburnbag-lib';
import { validateWcapConfig } from '../../config/wcapConfig';

describe('validateWcapConfig', () => {
  it('does not log a warning for the default algorithm suite', () => {
    const warnMessages: string[] = [];
    const logger = { warn: (msg: string) => warnMessages.push(msg) };

    const config: IWcapConfig = { ...WCAP_DEFAULTS };

    validateWcapConfig(config, logger);

    expect(warnMessages).toHaveLength(0);
  });

  it('logs a warning for an unknown algorithm suite', () => {
    const warnMessages: string[] = [];
    const logger = { warn: (msg: string) => warnMessages.push(msg) };

    const config: IWcapConfig = {
      ...WCAP_DEFAULTS,
      algorithmSuite: 'rsa-sha512-unknown',
    };

    validateWcapConfig(config, logger);

    expect(warnMessages).toHaveLength(1);
    expect(warnMessages[0]).toContain('[WCAP]');
    expect(warnMessages[0]).toContain('unsupported algorithm suite');
    expect(warnMessages[0]).toContain('rsa-sha512-unknown');
  });
});
