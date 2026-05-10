/**
 * Feature: brightchain-vfs-explorer, Property 20: Unauthenticated command guard
 *
 * For any command other than `brightchain.login`, when auth state is
 * `{ authenticated: false }`, the command does not perform its action
 * and instead prompts login.
 *
 * **Validates: Requirements 15.2, 15.3**
 */

import * as fc from 'fast-check';
import * as vscode from 'vscode';
import type { AuthManager } from '../../auth/auth-manager';
import { requireAuth } from '../../extension';
import type { LoginWebview } from '../../ui/login-webview';

// Commands that require auth (everything except brightchain.login)
const GUARDED_COMMANDS = [
  'brightchain.logout',
  'brightchain.uploadFile',
  'brightchain.downloadFile',
  'brightchain.searchFiles',
  'brightchain.viewVersions',
  'brightchain.newFolder',
  'brightchain.refreshExplorer',
] as const;

/** Arbitrary that picks one of the guarded command names. */
const arbGuardedCommand = fc.constantFrom(...GUARDED_COMMANDS);

describe('Property 20: Unauthenticated command guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should block any guarded command when unauthenticated and prompt login', async () => {
    await fc.assert(
      fc.asyncProperty(arbGuardedCommand, async (_commandName) => {
        // Arrange: unauthenticated auth manager
        const authManager = {
          state: { authenticated: false },
        } as unknown as AuthManager;

        const showCalled: boolean[] = [];
        const loginWebview = {
          show: () => {
            showCalled.push(true);
          },
        } as unknown as LoginWebview;

        // Simulate user clicking "Sign In" on the warning
        (vscode.window.showWarningMessage as jest.Mock).mockResolvedValueOnce(
          'Sign In',
        );

        // Act
        const result = await requireAuth(authManager, loginWebview);

        // Assert: guard returns false (command should not proceed)
        expect(result).toBe(false);

        // Assert: warning message was shown
        expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
          'You must sign in to BrightChain before using this command.',
          'Sign In',
        );

        // Assert: login webview was opened because user chose "Sign In"
        expect(showCalled.length).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  it('should not prompt login webview when user dismisses the warning', async () => {
    await fc.assert(
      fc.asyncProperty(arbGuardedCommand, async (_commandName) => {
        // Arrange: unauthenticated
        const authManager = {
          state: { authenticated: false },
        } as unknown as AuthManager;

        const showCalled: boolean[] = [];
        const loginWebview = {
          show: () => {
            showCalled.push(true);
          },
        } as unknown as LoginWebview;

        // Simulate user dismissing the warning (returns undefined)
        (vscode.window.showWarningMessage as jest.Mock).mockResolvedValueOnce(
          undefined,
        );

        // Act
        const result = await requireAuth(authManager, loginWebview);

        // Assert: guard returns false
        expect(result).toBe(false);

        // Assert: login webview was NOT opened
        expect(showCalled.length).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('should allow any command when authenticated', async () => {
    await fc.assert(
      fc.asyncProperty(arbGuardedCommand, async (_commandName) => {
        // Arrange: authenticated
        const authManager = {
          state: { authenticated: true },
        } as unknown as AuthManager;

        const loginWebview = {
          show: jest.fn(),
        } as unknown as LoginWebview;

        // Act
        const result = await requireAuth(authManager, loginWebview);

        // Assert: guard returns true (command proceeds)
        expect(result).toBe(true);

        // Assert: no warning shown, no login webview opened
        expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
        expect(loginWebview.show).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});
