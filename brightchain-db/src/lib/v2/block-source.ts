/**
 * Block sources: where a merge reads another replica from. A source needs only
 * its current root and any block by digest, so a replica can be a directory,
 * another process, an HTTP server or any storage that can answer those two
 * calls. Every block a source returns is verified against its digest.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { digestPayload } from './codec';
import {
  BrightDbV2MissingBlockError,
  BrightDbV2StorageError,
  type BrightDbV2Storage,
} from './disk-store';

/** What a merge needs from the replica it reads. Any `BrightDbV2Storage` already has it. */
export type BrightDbV2BlockSource = Pick<BrightDbV2Storage, 'readHead' | 'readBlock'>;

const DIGEST = /^[0-9a-f]{128}$/u;

/** Reads a replica served by `serveBlocks` (or anything with the same two routes). */
export class HttpBlockSource implements BrightDbV2BlockSource {
  private readonly base: string;
  private readonly fetcher: typeof fetch;
  private readonly token?: string;

  constructor(
    baseUrl: string,
    options: { token?: string; fetch?: typeof fetch } = {},
  ) {
    this.base = baseUrl.replace(/\/+$/u, '');
    this.fetcher = options.fetch ?? fetch;
    this.token = options.token;
  }

  private async get(path: string): Promise<Response> {
    return this.fetcher(`${this.base}${path}`, {
      headers: this.token ? { authorization: `Bearer ${this.token}` } : {},
    });
  }

  async readHead(): Promise<string> {
    const response = await this.get('/head');
    if (!response.ok) {
      throw new BrightDbV2StorageError(`Cannot read the remote head (HTTP ${response.status})`);
    }
    const head = (await response.text()).trim();
    if (!DIGEST.test(head)) throw new BrightDbV2StorageError('The remote head is not a digest');
    return head;
  }

  async readBlock(digest: string): Promise<Uint8Array> {
    if (!DIGEST.test(digest)) throw new BrightDbV2StorageError('Invalid block digest');
    const response = await this.get(`/blocks/${digest}`);
    if (response.status === 404) throw new BrightDbV2MissingBlockError(digest);
    if (!response.ok) {
      throw new BrightDbV2StorageError(`Cannot read remote block ${digest} (HTTP ${response.status})`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (digestPayload(bytes) !== digest) {
      throw new BrightDbV2StorageError(`Remote block failed its digest check: ${digest}`);
    }
    return bytes;
  }
}

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
