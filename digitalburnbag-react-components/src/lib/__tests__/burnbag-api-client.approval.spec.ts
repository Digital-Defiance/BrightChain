/**
 * URL and request-shape tests for the approval endpoints of BurnbagApiClient.
 */
import { BurnbagApiClient } from '../services/burnbag-api-client';

describe('BurnbagApiClient approval endpoints', () => {
  // The jsdom test environment has no fetch; install a minimal one that only
  // provides what BurnbagApiClient.request reads from a 204 response.
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  let fetchMock: jest.Mock<
    Promise<Pick<Response, 'ok' | 'status'>>,
    Parameters<typeof fetch>
  >;
  let client: BurnbagApiClient;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true,
      writable: true,
    });
    client = new BurnbagApiClient('http://localhost/burnbag', () => 'token');
  });

  afterEach(() => {
    if (originalFetch) {
      Object.defineProperty(globalThis, 'fetch', originalFetch);
    } else {
      Reflect.deleteProperty(globalThis, 'fetch');
    }
  });

  it('approveRequest posts to /approval/:id/approve', async () => {
    await client.approveRequest('req-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost/burnbag/approval/req-1/approve');
    expect(init?.method).toBe('POST');
  });

  it('rejectRequest posts the reason to /approval/:id/reject', async () => {
    await client.rejectRequest('req-2', 'not allowed');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost/burnbag/approval/req-2/reject');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ reason: 'not allowed' }));
  });

  it('encodes the request id as a single path segment', async () => {
    await client.approveRequest('a/b c');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost/burnbag/approval/a%2Fb%20c/approve');
  });
});
