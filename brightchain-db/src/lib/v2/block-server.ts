/**
 * Serve a replica read-only over HTTP. Node only; browsers read replicas with
 * HttpBlockSource from block-source.ts.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import './node-hash';
import type { BrightDbV2BlockSource } from './block-source';
import { BrightDbV2MissingBlockError } from './storage';

export interface BlockServer {
  /** Base URL to give to `HttpBlockSource`. */
  url: string;
  close(): Promise<void>;
}

/**
 * Serve a replica read-only over HTTP: `GET /head` and `GET /blocks/<digest>`.
 * The server returns blocks exactly as the storage reads them (plaintext for an
 * encrypted directory), so put it behind TLS and set a token whenever the
 * network is not trusted.
 */
export async function serveBlocks(
  source: BrightDbV2BlockSource,
  options: { port?: number; host?: string; token?: string } = {},
): Promise<BlockServer> {
  const handle = async (request: IncomingMessage, response: ServerResponse) => {
    const send = (status: number, body: string | Uint8Array = '', type = 'text/plain') => {
      response.writeHead(status, { 'content-type': type });
      response.end(body);
    };
    try {
      if (request.method !== 'GET') return send(405);
      if (options.token && request.headers.authorization !== `Bearer ${options.token}`) {
        return send(401);
      }
      const path = (request.url ?? '').split('?')[0];
      if (path === '/head') return send(200, `${await source.readHead()}\n`);
      const match = /^\/blocks\/([0-9a-f]{128})$/u.exec(path);
      if (!match) return send(404);
      return send(200, await source.readBlock(match[1]), 'application/octet-stream');
    } catch (error) {
      return send(error instanceof BrightDbV2MissingBlockError ? 404 : 500);
    }
  };
  const server: Server = createServer((request, response) => void handle(request, response));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, options.host ?? '127.0.0.1', resolve);
  });
  const { port, address } = server.address() as AddressInfo;
  return {
    url: `http://${address.includes(':') ? `[${address}]` : address}:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
