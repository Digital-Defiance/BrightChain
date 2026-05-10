/**
 * Unit tests for BrightChatContext.
 *
 * Validates:
 * - useBrightChat() throws outside provider (Requirement 2.5)
 * - sessionStorage fallback behaviour on read/write failure
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
// Mock @brightchain/brightchain-lib to avoid deep initialization chain.

const PresenceStatusEnum = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  IDLE: 'idle',
  DO_NOT_DISTURB: 'dnd',
} as const;

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: PresenceStatusEnum,
}));

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { BrightChatProvider, useBrightChat } from '../BrightChatContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(BrightChatProvider, null, children);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BrightChatContext unit tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  /**
   * **Validates: Requirements 2.5**
   */
  it('useBrightChat() throws descriptive error outside provider', () => {
    // Suppress console.error noise from React for the expected throw
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useBrightChat());
    }).toThrow('useBrightChat must be used within a BrightChatProvider');

    spy.mockRestore();
  });

  /**
   * When sessionStorage.getItem throws, sidebar should default to true.
   */
  it('defaults sidebarOpen to true when sessionStorage.getItem throws', () => {
    const getItemSpy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('storage unavailable');
      });

    const { result } = renderHook(() => useBrightChat(), { wrapper });

    expect(result.current.sidebarOpen).toBe(true);

    getItemSpy.mockRestore();
  });

  /**
   * When sessionStorage.setItem throws, setSidebarOpen should still
   * update the React state (the write failure is silently caught).
   */
  it('updates React state even when sessionStorage.setItem throws', () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('storage full');
      });

    const { result } = renderHook(() => useBrightChat(), { wrapper });

    act(() => {
      result.current.setSidebarOpen(false);
    });

    expect(result.current.sidebarOpen).toBe(false);

    setItemSpy.mockRestore();
  });
});
