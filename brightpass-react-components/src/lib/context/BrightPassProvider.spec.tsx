/**
 * Unit tests for BrightPassProvider context.
 *
 * Validates:
 * - unlockVault() populates vault state from API
 * - lockVault() clears all decrypted data
 * - isVaultUnlocked() reflects current state
 * - Auto-lock fires after inactivity timeout
 * - Accelerated lock timer on tab visibility hidden
 * - Cleanup on unmount
 *
 * Requirements: 4.10, 14.4
 */

import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';

// Mock the API hook before importing the provider
const mockOpenVault = jest.fn();

jest.mock('../hooks/useBrightPassApi', () => ({
  useBrightPassApi: () => ({
    openVault: (...args: unknown[]) => mockOpenVault(...args),
  }),
}));

import {
  BrightPassProvider,
  DEFAULT_AUTO_LOCK_MS,
  HIDDEN_TAB_LOCK_MS,
  useBrightPass,
} from './BrightPassProvider';

// ---------------------------------------------------------------------------
// Test consumer component
// ---------------------------------------------------------------------------

function TestConsumer() {
  const { vault, unlockVault, lockVault, isVaultUnlocked, autoLockTimeout } =
    useBrightPass();

  return (
    <div>
      <span data-testid="vault-id">{vault?.vaultId ?? 'none'}</span>
      <span data-testid="vault-name">{vault?.metadata.name ?? 'none'}</span>
      <span data-testid="is-unlocked">{String(isVaultUnlocked())}</span>
      <span data-testid="timeout">{autoLockTimeout}</span>
      <button
        data-testid="unlock"
        onClick={() => unlockVault('v1', 'pass123')}
      />
      <button data-testid="lock" onClick={() => lockVault()} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDecryptedVault(id = 'v1') {
  return {
    metadata: {
      id,
      name: 'Test Vault',
      ownerId: 'owner1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entryCount: 1,
      sharedWith: [],
      vcblBlockId: undefined,
    },
    propertyRecords: [
      {
        entryType: 'login' as const,
        title: 'GitHub',
        tags: ['dev'],
        favorite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        siteUrl: 'https://github.com',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BrightPassProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockOpenVault.mockResolvedValue(makeDecryptedVault());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('provides default locked state', () => {
    render(
      <BrightPassProvider>
        <TestConsumer />
      </BrightPassProvider>,
    );

    expect(screen.getByTestId('vault-id').textContent).toBe('none');
    expect(screen.getByTestId('is-unlocked').textContent).toBe('false');
    expect(screen.getByTestId('timeout').textContent).toBe(
      String(DEFAULT_AUTO_LOCK_MS),
    );
  });

  it('unlockVault populates vault state from API', async () => {
    render(
      <BrightPassProvider>
        <TestConsumer />
      </BrightPassProvider>,
    );

    await act(async () => {
      screen.getByTestId('unlock').click();
    });

    expect(mockOpenVault).toHaveBeenCalledWith('v1', 'pass123');
    expect(screen.getByTestId('vault-id').textContent).toBe('v1');
    expect(screen.getByTestId('vault-name').textContent).toBe('Test Vault');
    expect(screen.getByTestId('is-unlocked').textContent).toBe('true');
  });

  it('lockVault clears all decrypted data', async () => {
    render(
      <BrightPassProvider>
        <TestConsumer />
      </BrightPassProvider>,
    );

    await act(async () => {
      screen.getByTestId('unlock').click();
    });
    expect(screen.getByTestId('is-unlocked').textContent).toBe('true');

    act(() => {
      screen.getByTestId('lock').click();
    });

    expect(screen.getByTestId('vault-id').textContent).toBe('none');
    expect(screen.getByTestId('is-unlocked').textContent).toBe('false');
  });

  it('auto-locks after inactivity timeout', async () => {
    const shortTimeout = 1000;

    render(
      <BrightPassProvider initialAutoLockMs={shortTimeout}>
        <TestConsumer />
      </BrightPassProvider>,
    );

    await act(async () => {
      screen.getByTestId('unlock').click();
    });
    expect(screen.getByTestId('is-unlocked').textContent).toBe('true');

    // Advance past the inactivity timeout
    act(() => {
      jest.advanceTimersByTime(shortTimeout + 100);
    });

    expect(screen.getByTestId('vault-id').textContent).toBe('none');
    expect(screen.getByTestId('is-unlocked').textContent).toBe('false');
  });

  it('resets inactivity timer on user activity', async () => {
    const shortTimeout = 2000;

    render(
      <BrightPassProvider initialAutoLockMs={shortTimeout}>
        <TestConsumer />
      </BrightPassProvider>,
    );

    await act(async () => {
      screen.getByTestId('unlock').click();
    });

    // Advance halfway
    act(() => {
      jest.advanceTimersByTime(shortTimeout / 2);
    });
    expect(screen.getByTestId('is-unlocked').textContent).toBe('true');

    // Simulate user activity
    act(() => {
      document.dispatchEvent(new Event('mousedown'));
    });

    // Advance past original timeout but not past reset
    act(() => {
      jest.advanceTimersByTime(shortTimeout / 2 + 100);
    });
    expect(screen.getByTestId('is-unlocked').textContent).toBe('true');

    // Now advance past the full reset timeout
    act(() => {
      jest.advanceTimersByTime(shortTimeout);
    });
    expect(screen.getByTestId('is-unlocked').textContent).toBe('false');
  });

  it('starts accelerated lock timer when tab becomes hidden', async () => {
    render(
      <BrightPassProvider>
        <TestConsumer />
      </BrightPassProvider>,
    );

    await act(async () => {
      screen.getByTestId('unlock').click();
    });

    // Simulate tab going hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should still be unlocked before the hidden timer fires
    expect(screen.getByTestId('is-unlocked').textContent).toBe('true');

    // Advance past the hidden tab timer
    act(() => {
      jest.advanceTimersByTime(HIDDEN_TAB_LOCK_MS + 100);
    });

    expect(screen.getByTestId('is-unlocked').textContent).toBe('false');

    // Restore
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
  });

  it('cancels accelerated timer when tab becomes visible again', async () => {
    render(
      <BrightPassProvider>
        <TestConsumer />
      </BrightPassProvider>,
    );

    await act(async () => {
      screen.getByTestId('unlock').click();
    });

    // Tab goes hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Advance partway
    act(() => {
      jest.advanceTimersByTime(HIDDEN_TAB_LOCK_MS / 2);
    });

    // Tab comes back
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Advance past the original hidden timer — should NOT lock
    act(() => {
      jest.advanceTimersByTime(HIDDEN_TAB_LOCK_MS);
    });

    expect(screen.getByTestId('is-unlocked').textContent).toBe('true');

    // Restore
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
  });

  it('clears state on unmount', async () => {
    const { unmount } = render(
      <BrightPassProvider>
        <TestConsumer />
      </BrightPassProvider>,
    );

    await act(async () => {
      screen.getByTestId('unlock').click();
    });

    // Unmount should not throw and should clean up timers
    expect(() => unmount()).not.toThrow();
  });

  it('throws when useBrightPass is used outside provider', () => {
    // Suppress console.error for the expected error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'useBrightPass must be used within a BrightPassProvider',
    );

    spy.mockRestore();
  });
});
