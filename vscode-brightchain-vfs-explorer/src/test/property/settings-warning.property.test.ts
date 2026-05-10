/**
 * Feature: brightchain-vfs-explorer, Property 2: Non-brightchain.org hostnames trigger warning
 *
 * For any URL string whose parsed hostname is not `brightchain.org`, the
 * SettingsManager's `validateAndApplyHostUrl` should flag it as requiring a
 * warning confirmation (i.e. call `vscode.window.showWarningMessage`).
 * For any URL whose hostname is `brightchain.org`, no warning should be
 * triggered.
 *
 * **Validates: Requirements 1.3**
 */

import fc from 'fast-check';
import * as vscode from 'vscode';
import { SettingsManager } from '../../services/settings-manager';

// Cast to access the jest mock
const showWarningMessage = vscode.window.showWarningMessage as jest.Mock;

/**
 * Arbitrary for non-brightchain.org URLs: generate a domain that is
 * guaranteed NOT to be `brightchain.org`, then wrap it in a valid URL.
 */
const nonBrightchainUrl: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/).filter((s) => s.length > 0),
    fc.constantFrom('.com', '.net', '.io', '.dev', '.org', '.co'),
  )
  .map(([name, tld]) => `${name}${tld}`)
  .filter((domain) => domain !== 'brightchain.org')
  .map((domain) => `https://${domain}`);

/**
 * Arbitrary for brightchain.org URLs: always use brightchain.org as the
 * hostname, with optional path segments.
 */
const brightchainOrgUrl: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom('https', 'http'),
    fc
      .stringMatching(/^(\/[a-z0-9-]{1,10}){0,3}$/)
      .filter((s) => s.length <= 40),
  )
  .map(([scheme, path]) => `${scheme}://brightchain.org${path}`);

describe('Property 2: Non-brightchain.org hostnames trigger warning', () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    (vscode.workspace as unknown as { _reset: () => void })._reset();
    showWarningMessage.mockClear();
    settingsManager = new SettingsManager();
  });

  afterEach(() => {
    settingsManager.dispose();
  });

  it('non-brightchain.org hostnames trigger showWarningMessage', async () => {
    await fc.assert(
      fc.asyncProperty(nonBrightchainUrl, async (url: string) => {
        showWarningMessage.mockClear();
        // User dismisses the warning (returns undefined)
        showWarningMessage.mockResolvedValueOnce(undefined);

        await settingsManager.validateAndApplyHostUrl(
          url,
          'https://brightchain.org',
        );

        expect(showWarningMessage).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 },
    );
  });

  it('brightchain.org hostnames do NOT trigger showWarningMessage', async () => {
    await fc.assert(
      fc.asyncProperty(brightchainOrgUrl, async (url: string) => {
        showWarningMessage.mockClear();

        const result = await settingsManager.validateAndApplyHostUrl(
          url,
          'https://brightchain.org',
        );

        expect(showWarningMessage).not.toHaveBeenCalled();
        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('non-brightchain.org URL returns false when user dismisses warning', async () => {
    await fc.assert(
      fc.asyncProperty(nonBrightchainUrl, async (url: string) => {
        showWarningMessage.mockClear();
        showWarningMessage.mockResolvedValueOnce(undefined);

        const result = await settingsManager.validateAndApplyHostUrl(
          url,
          'https://brightchain.org',
        );

        expect(result).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('non-brightchain.org URL returns true when user confirms warning', async () => {
    await fc.assert(
      fc.asyncProperty(nonBrightchainUrl, async (url: string) => {
        showWarningMessage.mockClear();
        showWarningMessage.mockResolvedValueOnce('Continue');

        const result = await settingsManager.validateAndApplyHostUrl(
          url,
          'https://brightchain.org',
        );

        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
