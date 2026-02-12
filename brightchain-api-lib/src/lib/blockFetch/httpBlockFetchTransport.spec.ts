/**
 * @fileoverview Unit tests for HttpBlockFetchTransport
 *
 * Tests the HTTP-based block fetch transport including:
 * - Successful fetch with base64 decoding
 * - Unknown node address resolution
 * - HTTP error mapping to BlockFetchError
 * - Network error handling
 * - Invalid JSON response handling
 * - Missing data field handling
 * - Pool ID query parameter inclusion
 * - URL construction without pool ID
 *
 * @see Requirements 1.1, 5.2
 */

import { BlockFetchError } from '@brightchain/brightchain-lib';
import {
  HttpBlockFetchTransport,
  MapNodeAddressResolver,
} from './httpBlockFetchTransport';

// Helper to create a mock Response
function mockResponse(options: {
  ok: boolean;
  status: number;
  statusText?: string;
  json?: () => Promise<Record<string, unknown>>;
  jsonError?: boolean;
}): Response {
  const resp: Response = {
    ok: options.ok,
    status: options.status,
    statusText: options.statusText ?? '',
    json: options.jsonError
      ? () => Promise.reject(new SyntaxError('Unexpected token'))
      : (options.json ?? (() => Promise.resolve({}))),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone(): Response {
      return resp;
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(''),
    bytes: () => Promise.resolve(new Uint8Array()),
  };
  return resp;
}

describe('HttpBlockFetchTransport', () => {
  const nodeId = 'node-1';
  const blockId = 'abc123def456';
  const baseUrl = 'http://remote-node:3000';

  let transport: HttpBlockFetchTransport;
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    const resolver = new MapNodeAddressResolver(new Map([[nodeId, baseUrl]]));
    transport = new HttpBlockFetchTransport(resolver);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should return decoded block data on successful fetch', async () => {
    const rawData = new Uint8Array([1, 2, 3, 4, 5]);
    const base64Data = Buffer.from(rawData).toString('base64');

    fetchSpy.mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            message: 'OK',
            blockId,
            data: base64Data,
          }),
      }),
    );

    const result = await transport.fetchBlockFromNode(nodeId, blockId);
    expect(new Uint8Array(result)).toEqual(rawData);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/sync/blocks/${blockId}`,
    );
  });

  it('should throw BlockFetchError for unknown node', async () => {
    const unknownNodeId = 'unknown-node';

    await expect(
      transport.fetchBlockFromNode(unknownNodeId, blockId),
    ).rejects.toThrow(BlockFetchError);

    await expect(
      transport.fetchBlockFromNode(unknownNodeId, blockId),
    ).rejects.toMatchObject({
      blockId,
      attemptedNodes: [expect.objectContaining({ nodeId: unknownNodeId })],
    });

    // fetch should not have been called
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should throw BlockFetchError on HTTP error (e.g. 404)', async () => {
    fetchSpy.mockResolvedValue(
      mockResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }),
    );

    await expect(transport.fetchBlockFromNode(nodeId, blockId)).rejects.toThrow(
      BlockFetchError,
    );

    await expect(
      transport.fetchBlockFromNode(nodeId, blockId),
    ).rejects.toMatchObject({
      blockId,
      attemptedNodes: [
        expect.objectContaining({
          nodeId,
          error: expect.stringContaining('404'),
        }),
      ],
    });
  });

  it('should throw BlockFetchError on network error', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(transport.fetchBlockFromNode(nodeId, blockId)).rejects.toThrow(
      BlockFetchError,
    );

    await expect(
      transport.fetchBlockFromNode(nodeId, blockId),
    ).rejects.toMatchObject({
      blockId,
      attemptedNodes: [
        expect.objectContaining({
          nodeId,
          error: expect.stringContaining('ECONNREFUSED'),
        }),
      ],
    });
  });

  it('should throw BlockFetchError on invalid JSON response', async () => {
    fetchSpy.mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        jsonError: true,
      }),
    );

    await expect(transport.fetchBlockFromNode(nodeId, blockId)).rejects.toThrow(
      BlockFetchError,
    );

    await expect(
      transport.fetchBlockFromNode(nodeId, blockId),
    ).rejects.toMatchObject({
      blockId,
      attemptedNodes: [
        expect.objectContaining({
          nodeId,
          error: expect.stringContaining('Invalid JSON'),
        }),
      ],
    });
  });

  it('should throw BlockFetchError when response is missing data field', async () => {
    fetchSpy.mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'OK', blockId }),
      }),
    );

    await expect(transport.fetchBlockFromNode(nodeId, blockId)).rejects.toThrow(
      BlockFetchError,
    );

    await expect(
      transport.fetchBlockFromNode(nodeId, blockId),
    ).rejects.toMatchObject({
      blockId,
      attemptedNodes: [
        expect.objectContaining({
          nodeId,
          error: expect.stringContaining('data'),
        }),
      ],
    });
  });

  it('should include poolId query parameter when provided', async () => {
    const poolId = 'pool-abc';
    const base64Data = Buffer.from([10, 20]).toString('base64');

    fetchSpy.mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ message: 'OK', blockId, data: base64Data }),
      }),
    );

    await transport.fetchBlockFromNode(nodeId, blockId, poolId);

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/sync/blocks/${blockId}?poolId=${poolId}`,
    );
  });

  it('should not include poolId query parameter when not provided', async () => {
    const base64Data = Buffer.from([10, 20]).toString('base64');

    fetchSpy.mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ message: 'OK', blockId, data: base64Data }),
      }),
    );

    await transport.fetchBlockFromNode(nodeId, blockId);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('poolId');
    expect(calledUrl).toBe(`${baseUrl}/api/sync/blocks/${blockId}`);
  });
});
