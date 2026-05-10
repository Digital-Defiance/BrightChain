/**
 * Unit tests for BrightMailContext, BrightMailProvider, and useBrightMail hook.
 */
import { act, renderHook } from '@testing-library/react';
import { FC, ReactNode } from 'react';
import { BrightMailProvider, useBrightMail } from '../BrightMailContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
  <BrightMailProvider>{children}</BrightMailProvider>
);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BrightMailContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('useBrightMail throws when used outside provider', () => {
    // Suppress console.error for the expected error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {
      /* noop */
    });
    expect(() => renderHook(() => useBrightMail())).toThrow(
      'useBrightMail must be used within a BrightMailProvider',
    );
    spy.mockRestore();
  });

  it('provides default sidebar open state (true)', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });
    expect(result.current.sidebarOpen).toBe(true);
  });

  it('toggles sidebar and persists to sessionStorage', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });

    act(() => result.current.setSidebarOpen(false));
    expect(result.current.sidebarOpen).toBe(false);
    expect(sessionStorage.getItem('brightmail:sidebarOpen')).toBe('false');

    act(() => result.current.setSidebarOpen(true));
    expect(result.current.sidebarOpen).toBe(true);
    expect(sessionStorage.getItem('brightmail:sidebarOpen')).toBe('true');
  });

  it('reads sidebar state from sessionStorage on mount', () => {
    sessionStorage.setItem('brightmail:sidebarOpen', 'false');
    const { result } = renderHook(() => useBrightMail(), { wrapper });
    expect(result.current.sidebarOpen).toBe(false);
  });

  it('compose modal starts closed', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });
    expect(result.current.composeModal).toEqual({ status: 'closed' });
  });

  it('openCompose transitions to open state', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });

    act(() => result.current.openCompose());
    expect(result.current.composeModal.status).toBe('open');
    const modal = result.current.composeModal as {
      status: 'open';
      minimized: boolean;
      maximized: boolean;
      prefill?: unknown;
    };
    expect(modal.minimized).toBe(false);
    expect(modal.maximized).toBe(false);
    expect(modal.prefill).toBeUndefined();
  });

  it('openCompose with prefill stores prefill data', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });
    const prefill = {
      mode: 'reply' as const,
      to: ['test@example.com'],
      subject: 'Re: Hello',
    };

    act(() => result.current.openCompose(prefill));
    const modal = result.current.composeModal as {
      status: 'open';
      prefill?: unknown;
    };
    expect(modal.prefill).toEqual(prefill);
  });

  it('minimizeCompose sets minimized to true', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });

    act(() => result.current.openCompose());
    act(() => result.current.minimizeCompose());

    const modal = result.current.composeModal as {
      status: 'open';
      minimized: boolean;
    };
    expect(modal.minimized).toBe(true);
  });

  it('minimizeCompose is a no-op when modal is closed', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });

    act(() => result.current.minimizeCompose());
    expect(result.current.composeModal).toEqual({ status: 'closed' });
  });

  it('toggleMaximize sets maximized to true when open', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });

    act(() => result.current.openCompose());
    act(() => result.current.toggleMaximize());

    const modal = result.current.composeModal as {
      status: 'open';
      maximized: boolean;
    };
    expect(modal.maximized).toBe(true);
  });

  it('toggleMaximize toggles maximized back to false', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });

    act(() => result.current.openCompose());
    act(() => result.current.toggleMaximize());
    act(() => result.current.toggleMaximize());

    const modal = result.current.composeModal as {
      status: 'open';
      maximized: boolean;
    };
    expect(modal.maximized).toBe(false);
  });

  it('toggleMaximize is a no-op when modal is closed', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });

    act(() => result.current.toggleMaximize());
    expect(result.current.composeModal).toEqual({ status: 'closed' });
  });

  it('closeCompose transitions to closed state', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });

    act(() => result.current.openCompose());
    act(() => result.current.closeCompose());
    expect(result.current.composeModal).toEqual({ status: 'closed' });
  });

  it('selectedEmailId starts as null', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });
    expect(result.current.selectedEmailId).toBeNull();
  });

  it('setSelectedEmailId updates the selected email', () => {
    const { result } = renderHook(() => useBrightMail(), { wrapper });

    act(() => result.current.setSelectedEmailId('msg-123'));
    expect(result.current.selectedEmailId).toBe('msg-123');

    act(() => result.current.setSelectedEmailId(null));
    expect(result.current.selectedEmailId).toBeNull();
  });
});
