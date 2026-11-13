/**
 * Block sources: where a merge reads another replica from. A source needs only
 * its current root and any block by digest, so a replica can be a directory,
 * another process, an HTTP server or any storage that can answer those two
 * calls. Every block a source returns is verified against its digest.
 */
import { digestPayload } from './codec';
import {
  BrightDbV2MissingBlockError,
  BrightDbV2StorageError,
  type BrightDbV2Storage,
} from './storage';

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
    // Calling the global fetch as a method of another object throws "Illegal invocation" in browsers.
    this.fetcher = options.fetch ?? ((input, init) => fetch(input, init));
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
