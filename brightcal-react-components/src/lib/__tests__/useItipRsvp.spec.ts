/**
 * useItipRsvp — unit tests.
 *
 * Verifies:
 *  - rsvp() POSTs to the correct endpoint with uid, partstat, rawIcs.
 *  - Authorization header is included when authToken is provided.
 *  - Authorization header is omitted when authToken is absent.
 *  - responding is true while request is in-flight, false after.
 *  - On success: responding false, error null, onSuccess called with partstat.
 *  - On HTTP error: responding false, error contains the response body.
 *  - On network error: responding false, error contains the error message.
 *
 * @see Requirements 10.3
 */

import { act, renderHook } from '@testing-library/react';
import type { UseItipRsvpOptions } from '../hooks/useItipRsvp';
import { useItipRsvp } from '../hooks/useItipRsvp';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: UseItipRsvpOptions = {
  apiBaseUrl: 'http://localhost:3000',
  authToken: 'test-bearer-token',
};

function okResponse(partstat: string) {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue({ partstat }),
    text: jest.fn().mockResolvedValue(''),
    status: 200,
    statusText: 'OK',
  };
}

function errorResponse(status: number, body: string) {
  return {
    ok: false,
    json: jest.fn().mockRejectedValue(new Error('no json')),
    text: jest.fn().mockResolvedValue(body),
    status,
    statusText: 'Error',
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useItipRsvp', () => {
  describe('initial state', () => {
    it('starts with responding=false and error=null', () => {
      const { result } = renderHook(() => useItipRsvp(DEFAULT_OPTIONS));
      expect(result.current.responding).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('rsvp() request format', () => {
    it('POSTs to /calendar/itip/rsvp with correct body', async () => {
      mockFetch.mockResolvedValueOnce(okResponse('ACCEPTED'));
      const { result } = renderHook(() => useItipRsvp(DEFAULT_OPTIONS));

      await act(async () => {
        await result.current.rsvp('uid-001', 'BEGIN:VCAL\r\nEND:VCAL', 'ACCEPTED' as never);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/calendar/itip/rsvp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            uid: 'uid-001',
            partstat: 'ACCEPTED',
            rawIcs: 'BEGIN:VCAL\r\nEND:VCAL',
          }),
        }),
      );
    });

    it('includes Authorization header when authToken provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse('ACCEPTED'));
      const { result } = renderHook(() =>
        useItipRsvp({ ...DEFAULT_OPTIONS, authToken: 'my-token' }),
      );

      await act(async () => {
        await result.current.rsvp('uid-1', 'ics', 'ACCEPTED' as never);
      });

      const [, init] = mockFetch.mock.calls[0];
      expect((init as RequestInit).headers).toMatchObject({
        Authorization: 'Bearer my-token',
      });
    });

    it('omits Authorization header when authToken is not provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse('ACCEPTED'));
      const { result } = renderHook(() =>
        useItipRsvp({ apiBaseUrl: 'http://localhost:3000' }),
      );

      await act(async () => {
        await result.current.rsvp('uid-1', 'ics', 'ACCEPTED' as never);
      });

      const [, init] = mockFetch.mock.calls[0];
      expect((init as RequestInit).headers).not.toMatchObject({
        Authorization: expect.anything(),
      });
    });

    it('sets Content-Type to application/json', async () => {
      mockFetch.mockResolvedValueOnce(okResponse('ACCEPTED'));
      const { result } = renderHook(() => useItipRsvp(DEFAULT_OPTIONS));

      await act(async () => {
        await result.current.rsvp('uid-1', 'ics', 'ACCEPTED' as never);
      });

      const [, init] = mockFetch.mock.calls[0];
      expect((init as RequestInit).headers).toMatchObject({
        'Content-Type': 'application/json',
      });
    });
  });

  describe('successful response', () => {
    it('sets responding=false and error=null after success', async () => {
      mockFetch.mockResolvedValueOnce(okResponse('ACCEPTED'));
      const { result } = renderHook(() => useItipRsvp(DEFAULT_OPTIONS));

      await act(async () => {
        await result.current.rsvp('uid-1', 'ics', 'ACCEPTED' as never);
      });

      expect(result.current.responding).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('calls onSuccess with the returned partstat', async () => {
      mockFetch.mockResolvedValueOnce(okResponse('TENTATIVE'));
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useItipRsvp({ ...DEFAULT_OPTIONS, onSuccess }),
      );

      await act(async () => {
        await result.current.rsvp('uid-1', 'ics', 'TENTATIVE' as never);
      });

      expect(onSuccess).toHaveBeenCalledWith('TENTATIVE');
    });
  });

  describe('error states', () => {
    it('sets error from response body on non-ok HTTP status', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(422, 'Invalid UID'));
      const { result } = renderHook(() => useItipRsvp(DEFAULT_OPTIONS));

      await act(async () => {
        await result.current.rsvp('uid-1', 'ics', 'ACCEPTED' as never);
      });

      expect(result.current.error).toBe('Invalid UID');
      expect(result.current.responding).toBe(false);
    });

    it('sets error message on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network offline'));
      const { result } = renderHook(() => useItipRsvp(DEFAULT_OPTIONS));

      await act(async () => {
        await result.current.rsvp('uid-1', 'ics', 'ACCEPTED' as never);
      });

      expect(result.current.error).toBe('Network offline');
      expect(result.current.responding).toBe(false);
    });

    it('does not call onSuccess on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'));
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useItipRsvp({ ...DEFAULT_OPTIONS, onSuccess }),
      );

      await act(async () => {
        await result.current.rsvp('uid-1', 'ics', 'ACCEPTED' as never);
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('resets error on subsequent successful call', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(okResponse('ACCEPTED'));

      const { result } = renderHook(() => useItipRsvp(DEFAULT_OPTIONS));

      await act(async () => {
        await result.current.rsvp('uid-1', 'ics', 'ACCEPTED' as never);
      });
      expect(result.current.error).toBe('fail');

      await act(async () => {
        await result.current.rsvp('uid-1', 'ics', 'ACCEPTED' as never);
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('responding state', () => {
    it('is true while request is in-flight', async () => {
      let resolveRequest!: () => void;
      const pendingPromise = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });

      mockFetch.mockReturnValueOnce(
        pendingPromise.then(() => okResponse('ACCEPTED')),
      );

      const { result } = renderHook(() => useItipRsvp(DEFAULT_OPTIONS));

      // Start the request without awaiting
      let rsvpPromise: Promise<void>;
      act(() => {
        rsvpPromise = result.current.rsvp('uid-1', 'ics', 'ACCEPTED' as never);
      });

      // Give the act cycle a moment to run setState(responding=true)
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.responding).toBe(true);

      // Resolve and complete
      await act(async () => {
        resolveRequest();
        await rsvpPromise;
      });

      expect(result.current.responding).toBe(false);
    });
  });
});
