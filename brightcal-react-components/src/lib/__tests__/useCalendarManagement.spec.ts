import { act, renderHook } from '@testing-library/react';
import type { UseCalendarManagementOptions } from '../hooks/useCalendarManagement';
import { useCalendarManagement } from '../hooks/useCalendarManagement';

// Mock global fetch
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

const defaultOptions: UseCalendarManagementOptions = {
  apiBaseUrl: 'http://localhost:3000',
  authToken: 'test-token',
};

const mockCalendar = {
  id: 'cal-1',
  ownerId: 'user-1',
  displayName: 'Work',
  color: '#ff0000',
  description: 'Work calendar',
  isDefault: false,
  isSubscription: false,
  defaultPermission: 'viewer',
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useCalendarManagement', () => {
  describe('createCalendar', () => {
    it('sends POST request and returns created calendar', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
      });

      const { result } = renderHook(() =>
        useCalendarManagement(defaultOptions),
      );

      let created: any;
      await act(async () => {
        created = await result.current.createCalendar(
          'Work',
          '#ff0000',
          'Work calendar',
        );
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/cal/calendars',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
          body: JSON.stringify({
            displayName: 'Work',
            color: '#ff0000',
            description: 'Work calendar',
          }),
        }),
      );
      expect(created).toEqual(mockCalendar);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('calls onSuccess callback after successful creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
      });

      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useCalendarManagement({ ...defaultOptions, onSuccess }),
      );

      await act(async () => {
        await result.current.createCalendar('Work', '#ff0000');
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('sets error on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });

      const { result } = renderHook(() =>
        useCalendarManagement(defaultOptions),
      );

      let created: any;
      await act(async () => {
        created = await result.current.createCalendar('Bad', '#000');
      });

      expect(created).toBeNull();
      expect(result.current.error).toBe('HTTP 400');
      expect(result.current.loading).toBe(false);
    });

    it('sets error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useCalendarManagement(defaultOptions),
      );

      let created: any;
      await act(async () => {
        created = await result.current.createCalendar('Fail', '#000');
      });

      expect(created).toBeNull();
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('updateCalendar', () => {
    it('sends PATCH request and returns updated calendar', async () => {
      const updated = { ...mockCalendar, displayName: 'Personal' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updated,
      });

      const { result } = renderHook(() =>
        useCalendarManagement(defaultOptions),
      );

      let response: any;
      await act(async () => {
        response = await result.current.updateCalendar('cal-1', {
          displayName: 'Personal',
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/cal/calendars/cal-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ displayName: 'Personal' }),
        }),
      );
      expect(response).toEqual(updated);
      expect(result.current.error).toBeNull();
    });

    it('sets error on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const { result } = renderHook(() =>
        useCalendarManagement(defaultOptions),
      );

      let response: any;
      await act(async () => {
        response = await result.current.updateCalendar('cal-missing', {
          displayName: 'X',
        });
      });

      expect(response).toBeNull();
      expect(result.current.error).toBe('HTTP 404');
    });
  });

  describe('deleteCalendar', () => {
    it('sends DELETE request and returns true on success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() =>
        useCalendarManagement(defaultOptions),
      );

      let deleted: boolean | undefined;
      await act(async () => {
        deleted = await result.current.deleteCalendar('cal-1');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/cal/calendars/cal-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(deleted).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('calls onSuccess callback after successful deletion', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useCalendarManagement({ ...defaultOptions, onSuccess }),
      );

      await act(async () => {
        await result.current.deleteCalendar('cal-1');
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('sets error on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

      const { result } = renderHook(() =>
        useCalendarManagement(defaultOptions),
      );

      let deleted: boolean | undefined;
      await act(async () => {
        deleted = await result.current.deleteCalendar('cal-1');
      });

      expect(deleted).toBe(false);
      expect(result.current.error).toBe('HTTP 403');
    });

    it('sets error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const { result } = renderHook(() =>
        useCalendarManagement(defaultOptions),
      );

      let deleted: boolean | undefined;
      await act(async () => {
        deleted = await result.current.deleteCalendar('cal-1');
      });

      expect(deleted).toBe(false);
      expect(result.current.error).toBe('Connection refused');
    });
  });

  describe('auth header', () => {
    it('omits Authorization header when no authToken provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
      });

      const { result } = renderHook(() =>
        useCalendarManagement({ apiBaseUrl: 'http://localhost:3000' }),
      );

      await act(async () => {
        await result.current.createCalendar('Test', '#000');
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders).not.toHaveProperty('Authorization');
    });
  });
});
