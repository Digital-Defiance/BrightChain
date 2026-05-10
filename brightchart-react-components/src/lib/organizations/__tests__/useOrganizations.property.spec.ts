/**
 * Property-based tests for query hook interface shape.
 * Feature: org-role-ui-components, Property 5: Query hooks expose consistent interface shape
 *
 * For each hook (useOrganizations, useOrganization, useOrgMembers), verify
 * the result always has `data`, `loading` (boolean), `error` (string | null),
 * and `refetch` (function).
 *
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */

// Async React property tests can exceed 5 s under parallel load — give them room.
jest.retryTimes(2, { logErrorsBeforeRetry: false });
jest.setTimeout(30000);

import type { IApiEnvelope } from '@brightchain/brightchain-lib';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import { AxiosHeaders } from 'axios';
import fc from 'fast-check';
import { useOrganization } from '../hooks/useOrganization';
import { useOrganizations } from '../hooks/useOrganizations';
import { useOrgMembers } from '../hooks/useOrgMembers';

// --- Mock useAuthenticatedApi so useOrgApi can build a client ---

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuthenticatedApi: (): AxiosInstance =>
    ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
    }) as unknown as AxiosInstance,
}));

/** Helper to build a success Axios response wrapping an IApiEnvelope */
function successEnvelope<T>(data: T) {
  return {
    data: { status: 'success' as const, data } as IApiEnvelope<T>,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

// --- Arbitraries ---

const arbOrgListParams = fc.record({
  search: fc.option(fc.string({ minLength: 0, maxLength: 30 }), {
    nil: undefined,
  }),
  page: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
});

const arbId = fc.stringMatching(/^[a-zA-Z0-9]{1,24}$/);

// --- Shared shape assertion ---

function assertQueryHookShape(result: {
  data: unknown;
  loading: unknown;
  error: unknown;
  refetch: unknown;
}) {
  // `data` exists (may be null or a value)
  expect(result).toHaveProperty('data');
  // `loading` is a boolean
  expect(typeof result.loading).toBe('boolean');
  // `error` is string or null
  expect(result.error === null || typeof result.error === 'string').toBe(true);
  // `refetch` is a function
  expect(typeof result.refetch).toBe('function');
}

// --- Tests ---

describe('Feature: org-role-ui-components, Property 5: Query hooks expose consistent interface shape', () => {
  afterEach(() => {
    cleanup();
    mockGet.mockReset();
  });

  it('useOrganizations always exposes { data, loading, error, refetch } for any params', async () => {
    await fc.assert(
      fc.asyncProperty(arbOrgListParams, async (params) => {
        mockGet.mockResolvedValue(
          successEnvelope({
            organizations: [],
            total: 0,
            page: params.page ?? 1,
            limit: params.limit ?? 20,
          }),
        );

        const { result, unmount } = renderHook(() => useOrganizations(params));

        // Immediately after render, shape must hold (loading state)
        assertQueryHookShape(result.current);

        // After settling, shape must still hold
        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });
        assertQueryHookShape(result.current);

        unmount();
      }),
      { numRuns: 100 },
    );
  }, 60_000);

  it('useOrganization always exposes { data, loading, error, refetch } for any id', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, async (id) => {
        mockGet.mockResolvedValue(
          successEnvelope({ _id: id, name: 'Test Org' }),
        );

        const { result, unmount } = renderHook(() => useOrganization(id));

        assertQueryHookShape(result.current);

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });
        assertQueryHookShape(result.current);

        unmount();
      }),
      { numRuns: 100 },
    );
  }, 60_000);

  it('useOrgMembers always exposes { data, loading, error, refetch } for any orgId', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, async (orgId) => {
        mockGet.mockResolvedValue(successEnvelope({ members: {} }));

        const { result, unmount } = renderHook(() => useOrgMembers(orgId));

        assertQueryHookShape(result.current);

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });
        assertQueryHookShape(result.current);

        unmount();
      }),
      { numRuns: 100 },
    );
  }, 60_000);

  it('useOrganizations exposes correct shape even when API errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMsg) => {
          // The mock rejects at the Axios level; handleApiCall re-throws
          // with the original Error message
          mockGet.mockRejectedValue(new Error(errorMsg));

          const { result, unmount } = renderHook(() => useOrganizations());

          assertQueryHookShape(result.current);

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });
          assertQueryHookShape(result.current);
          // error should be a string (the message) or null — shape is valid either way
          expect(result.current.data).toBeNull();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  }, 60_000);

  it('useOrganization exposes correct shape even when API errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbId,
        fc.string({ minLength: 1, maxLength: 100 }),
        async (id, errorMsg) => {
          mockGet.mockRejectedValue(new Error(errorMsg));

          const { result, unmount } = renderHook(() => useOrganization(id));

          assertQueryHookShape(result.current);

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });
          assertQueryHookShape(result.current);
          expect(result.current.data).toBeNull();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  }, 60_000);

  it('useOrgMembers exposes correct shape even when API errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbId,
        fc.string({ minLength: 1, maxLength: 100 }),
        async (orgId, errorMsg) => {
          mockGet.mockRejectedValue(new Error(errorMsg));

          const { result, unmount } = renderHook(() => useOrgMembers(orgId));

          assertQueryHookShape(result.current);

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });
          assertQueryHookShape(result.current);
          expect(result.current.data).toBeNull();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  }, 60_000);
});
