/**
 * Property-based tests for OrgApiClient endpoint correctness.
 * Feature: org-role-ui-components, Property 6: API client methods call correct endpoints
 *
 * For any valid request DTO passed to an OrgApiClient method, the method
 * SHALL call the correct HTTP method and URL path on the underlying Axios
 * instance, with the DTO as the request body (or URL parameter for DELETE).
 *
 * **Validates: Requirements 9.4**
 */

// Async React property tests can exceed 5 s under parallel load — give them room.
jest.retryTimes(2, { logErrorsBeforeRetry: false });
jest.setTimeout(30000);

import type { IApiEnvelope } from '@brightchain/brightchain-lib';
import type { AxiosInstance } from 'axios';
import { AxiosHeaders } from 'axios';
import fc from 'fast-check';
import { createOrgApiClient } from '../services/orgApi';

/** Creates a mock AxiosInstance that records calls and returns a success envelope */
function createMockAxios() {
  const calls: {
    method: string;
    url: string;
    data?: unknown;
    params?: unknown;
  }[] = [];

  const successResponse = <T>(data: T) => ({
    data: { status: 'success' as const, data } as IApiEnvelope<T>,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

  const mock: AxiosInstance = {
    get: jest.fn((url: string, config?: { params?: unknown }) => {
      calls.push({ method: 'GET', url, params: config?.params });
      return Promise.resolve(successResponse({}));
    }),
    post: jest.fn((url: string, data?: unknown) => {
      calls.push({ method: 'POST', url, data });
      return Promise.resolve(successResponse({}));
    }),
    put: jest.fn((url: string, data?: unknown) => {
      calls.push({ method: 'PUT', url, data });
      return Promise.resolve(successResponse({}));
    }),
    delete: jest.fn((url: string) => {
      calls.push({ method: 'DELETE', url });
      return Promise.resolve(successResponse({}));
    }),
  } as unknown as AxiosInstance;

  return { mock, calls };
}

/** Arbitrary for simple non-empty alphanumeric strings (safe for URL segments) */
const arbId = fc.stringMatching(/^[a-zA-Z0-9]{1,24}$/);

describe('Feature: org-role-ui-components, Property 6: API client methods call correct endpoints', () => {
  it('listOrganizations calls GET /brightchart/organizations with params', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          search: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
            nil: undefined,
          }),
          page: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
          limit: fc.option(fc.integer({ min: 1, max: 100 }), {
            nil: undefined,
          }),
        }),
        async (params) => {
          const { mock, calls } = createMockAxios();
          const client = createOrgApiClient(mock);
          await client.listOrganizations(params);
          expect(calls).toHaveLength(1);
          expect(calls[0].method).toBe('GET');
          expect(calls[0].url).toBe('/brightchart/organizations');
          expect(calls[0].params).toEqual(params);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getOrganization calls GET /brightchart/organizations/:id', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, async (id) => {
        const { mock, calls } = createMockAxios();
        const client = createOrgApiClient(mock);
        await client.getOrganization(id);
        expect(calls).toHaveLength(1);
        expect(calls[0].method).toBe('GET');
        expect(calls[0].url).toBe(
          `/brightchart/organizations/${encodeURIComponent(id)}`,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('createOrganization calls POST /brightchart/organizations with body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (data) => {
          const { mock, calls } = createMockAxios();
          const client = createOrgApiClient(mock);
          await client.createOrganization(data);
          expect(calls).toHaveLength(1);
          expect(calls[0].method).toBe('POST');
          expect(calls[0].url).toBe('/brightchart/organizations');
          expect(calls[0].data).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('updateOrganization calls PUT /brightchart/organizations/:id with body', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbId,
        fc.record({
          name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
            nil: undefined,
          }),
          active: fc.option(fc.boolean(), { nil: undefined }),
          enrollmentMode: fc.option(
            fc.constantFrom('open' as const, 'invite-only' as const),
            { nil: undefined },
          ),
        }),
        async (id, data) => {
          const { mock, calls } = createMockAxios();
          const client = createOrgApiClient(mock);
          await client.updateOrganization(id, data);
          expect(calls).toHaveLength(1);
          expect(calls[0].method).toBe('PUT');
          expect(calls[0].url).toBe(
            `/brightchart/organizations/${encodeURIComponent(id)}`,
          );
          expect(calls[0].data).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getOrgMembers calls GET /brightchart/organizations/:id/members', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, async (id) => {
        const { mock, calls } = createMockAxios();
        const client = createOrgApiClient(mock);
        await client.getOrgMembers(id);
        expect(calls).toHaveLength(1);
        expect(calls[0].method).toBe('GET');
        expect(calls[0].url).toBe(
          `/brightchart/organizations/${encodeURIComponent(id)}/members`,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('assignStaff calls POST /brightchart/healthcare-roles/staff with body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          memberId: fc.string({ minLength: 1, maxLength: 50 }),
          roleCode: fc.string({ minLength: 1, maxLength: 20 }),
          organizationId: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (data) => {
          const { mock, calls } = createMockAxios();
          const client = createOrgApiClient(mock);
          await client.assignStaff(data);
          expect(calls).toHaveLength(1);
          expect(calls[0].method).toBe('POST');
          expect(calls[0].url).toBe('/brightchart/healthcare-roles/staff');
          expect(calls[0].data).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('registerPatient calls POST /brightchart/healthcare-roles/patient with body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.string({ minLength: 1, maxLength: 50 }),
          invitationToken: fc.option(
            fc.string({ minLength: 1, maxLength: 100 }),
            { nil: undefined },
          ),
        }),
        async (data) => {
          const { mock, calls } = createMockAxios();
          const client = createOrgApiClient(mock);
          await client.registerPatient(data);
          expect(calls).toHaveLength(1);
          expect(calls[0].method).toBe('POST');
          expect(calls[0].url).toBe('/brightchart/healthcare-roles/patient');
          expect(calls[0].data).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('removeRole calls DELETE /brightchart/healthcare-roles/:roleId', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, async (roleId) => {
        const { mock, calls } = createMockAxios();
        const client = createOrgApiClient(mock);
        await client.removeRole(roleId);
        expect(calls).toHaveLength(1);
        expect(calls[0].method).toBe('DELETE');
        expect(calls[0].url).toBe(
          `/brightchart/healthcare-roles/${encodeURIComponent(roleId)}`,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('createInvitation calls POST /brightchart/invitations with body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          organizationId: fc.string({ minLength: 1, maxLength: 50 }),
          roleCode: fc.string({ minLength: 1, maxLength: 20 }),
          targetEmail: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
            nil: undefined,
          }),
        }),
        async (data) => {
          const { mock, calls } = createMockAxios();
          const client = createOrgApiClient(mock);
          await client.createInvitation(data);
          expect(calls).toHaveLength(1);
          expect(calls[0].method).toBe('POST');
          expect(calls[0].url).toBe('/brightchart/invitations');
          expect(calls[0].data).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('redeemInvitation calls POST /brightchart/invitations/redeem with body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          token: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (data) => {
          const { mock, calls } = createMockAxios();
          const client = createOrgApiClient(mock);
          await client.redeemInvitation(data);
          expect(calls).toHaveLength(1);
          expect(calls[0].method).toBe('POST');
          expect(calls[0].url).toBe('/brightchart/invitations/redeem');
          expect(calls[0].data).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  });
});
