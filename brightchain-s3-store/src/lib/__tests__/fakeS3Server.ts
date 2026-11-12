/**
 * A small in-process S3-compatible HTTP server (path-style) for tests: bucket
 * create and delete, object put, get, head and delete, and ListObjectsV2. It
 * lets the real AWS SDK code path run without LocalStack. It is a stand-in:
 * run the opt-in specs against LocalStack or a real endpoint for full fidelity.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface FakeS3 {
  endpoint: string;
  objects: Map<string, Buffer>;
  close(): Promise<void>;
}

const xml = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>${body}`;
const escapeXml = (value: string) =>
  value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');

export async function startFakeS3(): Promise<FakeS3> {
  const buckets = new Set<string>();
  const objects = new Map<string, Buffer>(); // "bucket/key" -> bytes
  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const [bucket, ...rest] = decodeURIComponent(url.pathname).split('/').filter(Boolean);
      const key = rest.join('/');
      const send = (status: number, body: string | Buffer = '', headers: Record<string, string> = {}) => {
        response.writeHead(status, { 'content-length': Buffer.byteLength(body), ...headers });
        response.end(request.method === 'HEAD' ? undefined : body);
      };
      const missing = (code: string) =>
        send(404, xml(`<Error><Code>${code}</Code><Message>${code}</Message></Error>`), { 'content-type': 'application/xml' });

      if (!bucket) return send(404);
      if (!key) {
        if (request.method === 'PUT') { buckets.add(bucket); return send(200); }
        if (request.method === 'DELETE') { buckets.delete(bucket); return send(204); }
        if (request.method === 'GET') {
          if (!buckets.has(bucket)) return missing('NoSuchBucket');
          const prefix = url.searchParams.get('prefix') ?? '';
          const max = Number(url.searchParams.get('max-keys') ?? 1000);
          const start = url.searchParams.get('continuation-token') ?? '';
          const all = [...objects.keys()]
            .filter((full) => full.startsWith(`${bucket}/`))
            .map((full) => full.slice(bucket.length + 1))
            .filter((name) => name.startsWith(prefix) && name > start)
            .sort();
          const page = all.slice(0, max);
          const truncated = all.length > page.length;
          return send(
            200,
            xml(
              `<ListBucketResult><Name>${escapeXml(bucket)}</Name><Prefix>${escapeXml(prefix)}</Prefix>` +
                `<KeyCount>${page.length}</KeyCount><MaxKeys>${max}</MaxKeys><IsTruncated>${truncated}</IsTruncated>` +
                (truncated ? `<NextContinuationToken>${escapeXml(page[page.length - 1])}</NextContinuationToken>` : '') +
                page.map((name) => `<Contents><Key>${escapeXml(name)}</Key><Size>${objects.get(`${bucket}/${name}`)?.length ?? 0}</Size></Contents>`).join('') +
                '</ListBucketResult>',
            ),
            { 'content-type': 'application/xml' },
          );
        }
        return send(405);
      }
      const full = `${bucket}/${key}`;
      switch (request.method) {
        case 'PUT':
          objects.set(full, Buffer.concat(chunks));
          return send(200, '', { etag: '"fake"' });
        case 'GET': {
          const bytes = objects.get(full);
          return bytes ? send(200, bytes, { 'content-type': 'application/octet-stream', etag: '"fake"' }) : missing('NoSuchKey');
        }
        case 'HEAD': {
          const bytes = objects.get(full);
          return bytes ? send(200, bytes, { etag: '"fake"' }) : send(404);
        }
        case 'DELETE':
          objects.delete(full);
          return send(204);
        default:
          return send(405);
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    endpoint: `http://127.0.0.1:${port}`,
    objects,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
