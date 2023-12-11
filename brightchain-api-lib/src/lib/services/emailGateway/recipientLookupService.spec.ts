/**
 * Unit tests for RecipientLookupService.
 *
 * Validates:
 * - Socketmap protocol parsing and response formatting
 * - Lookup logic: OK / NOTFOUND / TEMP
 * - LRU cache behaviour (positive caching, TTL expiry, eviction)
 * - Timeout handling (5-second max)
 * - TCP server lifecycle (start / stop)
 * - Connection handling with multiple requests
 *
 * @see Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 4.1, 4.2, 4.3
 */

import * as net from 'net';

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IUserRegistry } from './recipientLookupService';
import {
  RecipientLookupCache,
  RecipientLookupService,
} from './recipientLookupService';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal config stub. */
function makeConfig(
  overrides: Partial<IEmailGatewayConfig> = {},
): IEmailGatewayConfig {
  return {
    canonicalDomain: 'brightchain.org',
    postfixHost: 'localhost',
    postfixPort: 25,
    dkimKeyPath: '/etc/dkim/private.key',
    dkimSelector: 'default',
    mailDropDirectory: '/var/spool/brightchain/incoming/',
    errorDirectory: '/var/spool/brightchain/errors/',
    maxMessageSizeBytes: 25 * 1024 * 1024,
    recipientLookupPort: 0,
    recipientLookupCacheTtlSeconds: 300,
    spamEngine: 'spamassassin',
    spamThresholds: { probableSpamScore: 5, definiteSpamScore: 10 },
    queueConcurrency: 10,
    retryMaxCount: 5,
    retryMaxDurationMs: 48 * 60 * 60 * 1000,
    retryBaseIntervalMs: 60_000,
    ...overrides,
  };
}

/** Create a mock user registry. */
function makeMockRegistry(
  users: Set<string> = new Set(),
): IUserRegistry & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async hasUser(email: string): Promise<boolean> {
      calls.push(email);
      return users.has(email.toLowerCase());
    },
  };
}

/** Create a registry that always throws (simulates unavailability). */
function makeFailingRegistry(): IUserRegistry {
  return {
    async hasUser(): Promise<boolean> {
      throw new Error('Registry unavailable');
    },
  };
}

/** Create a registry that never resolves (simulates timeout). */
function makeHangingRegistry(): IUserRegistry {
  return {
    hasUser(): Promise<boolean> {
      return new Promise(() => {
        /* never resolves */
      });
    },
  };
}

// ─── RecipientLookupCache Tests ─────────────────────────────────────────────

describe('RecipientLookupCache', () => {
  it('returns false for unknown keys', () => {
    const cache = new RecipientLookupCache(100, 60_000);
    expect(cache.get('unknown@brightchain.org')).toBe(false);
  });

  it('returns true for cached keys within TTL', () => {
    const cache = new RecipientLookupCache(100, 60_000);
    cache.set('alice@brightchain.org');
    expect(cache.get('alice@brightchain.org')).toBe(true);
  });

  it('returns false for expired entries', () => {
    const cache = new RecipientLookupCache(100, 0);
    cache.set('alice@brightchain.org');
    expect(cache.get('alice@brightchain.org')).toBe(false);
  });

  it('evicts the least-recently used entry when at capacity', () => {
    const cache = new RecipientLookupCache(2, 60_000);
    cache.set('a@brightchain.org');
    cache.set('b@brightchain.org');
    cache.set('c@brightchain.org');
    expect(cache.get('a@brightchain.org')).toBe(false);
    expect(cache.get('b@brightchain.org')).toBe(true);
    expect(cache.get('c@brightchain.org')).toBe(true);
  });

  it('refreshes LRU order on get', () => {
    const cache = new RecipientLookupCache(2, 60_000);
    cache.set('a@brightchain.org');
    cache.set('b@brightchain.org');
    cache.get('a@brightchain.org');
    cache.set('c@brightchain.org');
    expect(cache.get('a@brightchain.org')).toBe(true);
    expect(cache.get('b@brightchain.org')).toBe(false);
  });

  it('clear removes all entries', () => {
    const cache = new RecipientLookupCache(100, 60_000);
    cache.set('a@brightchain.org');
    cache.set('b@brightchain.org');
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a@brightchain.org')).toBe(false);
  });
});

// ─── RecipientLookupService.lookup() Tests ──────────────────────────────────

describe('RecipientLookupService.lookup()', () => {
  it('returns OK for a registered user (Req 13.3)', async () => {
    const registry = makeMockRegistry(new Set(['alice@brightchain.org']));
    const service = new RecipientLookupService(makeConfig(), registry);
    const result = await service.lookup('alice@brightchain.org');
    expect(result).toBe('OK');
  });

  it('returns NOTFOUND for an unregistered user (Req 13.4)', async () => {
    const registry = makeMockRegistry(new Set());
    const service = new RecipientLookupService(makeConfig(), registry);
    const result = await service.lookup('nobody@brightchain.org');
    expect(result).toBe('NOTFOUND');
  });

  it('returns NOTFOUND for an address on a different domain', async () => {
    const registry = makeMockRegistry(new Set(['alice@other.com']));
    const service = new RecipientLookupService(makeConfig(), registry);
    const result = await service.lookup('alice@other.com');
    expect(result).toBe('NOTFOUND');
  });

  it('returns NOTFOUND for a malformed address (no @)', async () => {
    const registry = makeMockRegistry(new Set());
    const service = new RecipientLookupService(makeConfig(), registry);
    const result = await service.lookup('malformed');
    expect(result).toBe('NOTFOUND');
  });

  it('returns TEMP when the registry throws (Req 13.5)', async () => {
    const service = new RecipientLookupService(
      makeConfig(),
      makeFailingRegistry(),
    );
    const result = await service.lookup('alice@brightchain.org');
    expect(result).toBe('TEMP');
  });

  it('returns TEMP when the registry times out (Req 4.3)', async () => {
    const service = new RecipientLookupService(
      makeConfig(),
      makeHangingRegistry(),
    );
    jest.useFakeTimers();
    const lookupPromise = service.lookup('alice@brightchain.org');
    jest.advanceTimersByTime(6_000);
    const result = await lookupPromise;
    expect(result).toBe('TEMP');
    jest.useRealTimers();
  });

  it('caches positive results and skips registry on second call (Req 13.6)', async () => {
    const registry = makeMockRegistry(new Set(['alice@brightchain.org']));
    const service = new RecipientLookupService(makeConfig(), registry);

    const first = await service.lookup('alice@brightchain.org');
    expect(first).toBe('OK');
    expect(registry.calls).toHaveLength(1);

    const second = await service.lookup('alice@brightchain.org');
    expect(second).toBe('OK');
    expect(registry.calls).toHaveLength(1);
  });

  it('does not cache NOTFOUND results', async () => {
    const registry = makeMockRegistry(new Set());
    const service = new RecipientLookupService(makeConfig(), registry);

    await service.lookup('nobody@brightchain.org');
    await service.lookup('nobody@brightchain.org');
    expect(registry.calls).toHaveLength(2);
  });

  it('normalises email addresses to lowercase', async () => {
    const registry = makeMockRegistry(new Set(['alice@brightchain.org']));
    const service = new RecipientLookupService(makeConfig(), registry);
    const result = await service.lookup('Alice@BrightChain.Org');
    expect(result).toBe('OK');
  });
});

// ─── TCP Server Integration Tests ───────────────────────────────────────────

describe('RecipientLookupService TCP server', () => {
  let service: RecipientLookupService;

  afterEach(async () => {
    if (service) {
      await service.stop();
    }
  });

  /** Helper: get the actual port the server is listening on. */
  function getPort(svc: RecipientLookupService): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const server = (svc as any).server as net.Server;
    const addr = server.address();
    if (typeof addr === 'object' && addr !== null) {
      return addr.port;
    }
    throw new Error('Server not listening');
  }

  /** Helper: send a socketmap request and read the response. */
  function sendRequest(port: number, request: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = net.createConnection({ port, host: '127.0.0.1' }, () => {
        client.write(request);
      });
      let data = '';
      client.setEncoding('utf-8');
      client.on('data', (chunk) => {
        data += chunk;
        if (data.includes('\n')) {
          client.end();
        }
      });
      client.on('end', () => resolve(data.trim()));
      client.on('error', reject);
      setTimeout(() => {
        client.destroy();
        reject(new Error('Client timeout'));
      }, 3_000);
    });
  }

  it('starts and stops without error (Req 13.1)', async () => {
    const registry = makeMockRegistry(new Set());
    service = new RecipientLookupService(makeConfig(), registry);
    await service.start();
    expect(service.isRunning()).toBe(true);
    await service.stop();
    expect(service.isRunning()).toBe(false);
  });

  it('responds OK for a registered user via socketmap protocol', async () => {
    const registry = makeMockRegistry(new Set(['alice@brightchain.org']));
    service = new RecipientLookupService(makeConfig(), registry);
    await service.start();
    const port = getPort(service);

    const response = await sendRequest(port, 'virtual alice@brightchain.org\n');
    expect(response).toBe('OK alice@brightchain.org');
  });

  it('responds NOTFOUND for an unknown user via socketmap protocol', async () => {
    const registry = makeMockRegistry(new Set());
    service = new RecipientLookupService(makeConfig(), registry);
    await service.start();
    const port = getPort(service);

    const response = await sendRequest(
      port,
      'virtual nobody@brightchain.org\n',
    );
    expect(response).toBe('NOTFOUND');
  });

  it('responds TEMP when registry is unavailable', async () => {
    service = new RecipientLookupService(makeConfig(), makeFailingRegistry());
    await service.start();
    const port = getPort(service);

    const response = await sendRequest(port, 'virtual alice@brightchain.org\n');
    expect(response).toBe('TEMP registry unavailable');
  });

  it('responds TEMP for malformed requests (no space)', async () => {
    const registry = makeMockRegistry(new Set());
    service = new RecipientLookupService(makeConfig(), registry);
    await service.start();
    const port = getPort(service);

    const response = await sendRequest(port, 'malformed\n');
    expect(response).toBe('TEMP malformed request');
  });

  it('handles multiple requests on the same connection', async () => {
    const registry = makeMockRegistry(new Set(['alice@brightchain.org']));
    service = new RecipientLookupService(makeConfig(), registry);
    await service.start();
    const port = getPort(service);

    const responses = await new Promise<string[]>((resolve, reject) => {
      const client = net.createConnection({ port, host: '127.0.0.1' }, () => {
        client.write('virtual alice@brightchain.org\n');
        client.write('virtual nobody@brightchain.org\n');
      });
      let data = '';
      const results: string[] = [];
      client.setEncoding('utf-8');
      client.on('data', (chunk) => {
        data += chunk;
        const lines = data.split('\n');
        data = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim().length > 0) {
            results.push(line.trim());
          }
        }
        if (results.length >= 2) {
          client.end();
        }
      });
      client.on('end', () => resolve(results));
      client.on('error', reject);
      setTimeout(() => {
        client.destroy();
        reject(new Error('Client timeout'));
      }, 3_000);
    });

    expect(responses).toHaveLength(2);
    expect(responses[0]).toBe('OK alice@brightchain.org');
    expect(responses[1]).toBe('NOTFOUND');
  });
});
