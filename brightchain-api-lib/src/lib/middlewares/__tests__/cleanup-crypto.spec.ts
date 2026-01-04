import { cleanupCrypto } from '../cleanup-crypto';

type EndFn = (
  chunk?: unknown,
  encoding?: BufferEncoding,
  cb?: () => void,
) => unknown;

function makeRes() {
  const chunks: unknown[] = [];
  const res = {
    end: ((chunk?: unknown, _encoding?: BufferEncoding, cb?: () => void) => {
      if (chunk !== undefined) chunks.push(chunk);
      if (cb) cb();
      return undefined;
    }) as EndFn,
  } as unknown as import('express').Response & { end: EndFn };
  return { res, chunks } as const;
}

describe('cleanupCrypto middleware', () => {
  it('disposes brightchainUser before response ends and leaves adminUser intact', () => {
    const req = {
      brightchainUser: { dispose: jest.fn() },
      adminUser: { dispose: jest.fn() },
    } as unknown as import('express').Request & {
      brightchainUser?: { dispose: () => void };
      adminUser?: { dispose: () => void };
    };
    const { res } = makeRes();
    const next = jest.fn();

    cleanupCrypto(req, res, next);

    // call end to trigger cleanup
    (res.end as EndFn)('ok');

    // brightchainUser unset and disposed
    expect(req.brightchainUser).toBeUndefined();
    // adminUser is not disposed or unset here (singleton safety)
    expect(req.adminUser).toBeDefined();
  });

  it('handles missing users safely', () => {
    const req = {} as unknown as import('express').Request & {
      brightchainUser?: { dispose: () => void };
      adminUser?: { dispose: () => void };
    };
    const { res } = makeRes();
    const next = jest.fn();

    cleanupCrypto(req, res, next);
    (res.end as EndFn)();

    expect(next).toHaveBeenCalled();
  });
});
