/**
 * @fileoverview Phase 5 tests — AssetsSubsystemPlugin capability gating and
 * system-quorum policy enforcement.
 *
 * Tests:
 *   1. When BRIGHTCHAIN_ASSETS_ENABLED is set and systemSignerSet is absent →
 *      initialize() throws (Req 7.3).
 *   2. When BRIGHTCHAIN_ASSETS_ENABLED is not set → initialize() resolves
 *      without throwing regardless of options (Req 7.2).
 *   3. When BRIGHTCHAIN_ASSETS_ENABLED is set and systemSignerSet is present →
 *      initialize() mounts the router without throwing (Req 7.1, 7.3).
 *   4. stop() before initialize() is a no-op (never throws).
 *   5. stop() after a skipped initialize() (flag off) is a no-op.
 *
 * @see Requirements 7.1, 7.2, 7.3
 */

import {
  AuthorizedSignerSet,
  QuorumType,
  SignerRole,
  SignerStatus,
  type ILedgerSigner,
  type ISubsystemContext,
} from '@brightchain/brightchain-lib';
import type { Application as ExpressApp } from 'express';
import express from 'express';
import { AssetsSubsystemPlugin } from '../assetsSubsystemPlugin.js';
import type { IAssetLedgerWriter } from '../submissionService.js';

// ── Minimal mocks ─────────────────────────────────────────────────────────────

function makeMockLedger(): IAssetLedgerWriter {
  return {
    ledgerId: 'test-ledger-plugin',
    append: jest.fn().mockResolvedValue(undefined),
    head: jest.fn().mockResolvedValue({ sequenceNumber: 0 }),
    entries: jest.fn().mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        /* empty */
      },
    }),
  } as unknown as IAssetLedgerWriter;
}

// 33-byte mock public key
function makePk(seed: number): Uint8Array {
  const k = new Uint8Array(33);
  k[0] = 0x02;
  k[1] = seed & 0xff;
  return k;
}

function makeMockSigner(): ILedgerSigner {
  return {
    publicKey: makePk(0xaa),
    sign: jest.fn().mockResolvedValue(new Uint8Array(64)),
  } as unknown as ILedgerSigner;
}

function makeMockSignerSet(): AuthorizedSignerSet {
  return new AuthorizedSignerSet(
    [
      {
        publicKey: makePk(0xbb),
        role: SignerRole.Admin,
        status: SignerStatus.Active,
        metadata: new Map(),
      },
    ],
    { type: QuorumType.Majority },
  );
}

function makeMockContext(expressApp?: ExpressApp): ISubsystemContext {
  const app = expressApp ?? express();
  return {
    expressApp: app,
    apiRouter: undefined,
    services: {
      register: jest.fn(),
      resolve: jest.fn(),
      has: jest.fn().mockReturnValue(false),
    },
  } as unknown as ISubsystemContext;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AssetsSubsystemPlugin', () => {
  const ORIGINAL_ENV = process.env['BRIGHTCHAIN_ASSETS_ENABLED'];

  afterEach(() => {
    // Restore env flag after each test
    if (ORIGINAL_ENV === undefined) {
      delete process.env['BRIGHTCHAIN_ASSETS_ENABLED'];
    } else {
      process.env['BRIGHTCHAIN_ASSETS_ENABLED'] = ORIGINAL_ENV;
    }
  });

  // ── Req 7.3 ────────────────────────────────────────────────────────────────
  describe('when BRIGHTCHAIN_ASSETS_ENABLED is set', () => {
    beforeEach(() => {
      process.env['BRIGHTCHAIN_ASSETS_ENABLED'] = '1';
    });

    it('throws during initialize() when systemSignerSet is absent', async () => {
      const plugin = new AssetsSubsystemPlugin(
        makeMockLedger(),
        'test-ledger-plugin',
        makeMockSigner(),
        // no systemSignerSet
      );
      const context = makeMockContext();

      await expect(plugin.initialize(context)).rejects.toThrow(
        'system-quorum policy',
      );
    });

    it('does not throw during initialize() when systemSignerSet is present', async () => {
      const app = express();
      const plugin = new AssetsSubsystemPlugin(
        makeMockLedger(),
        'test-ledger-plugin',
        makeMockSigner(),
        { systemSignerSet: makeMockSignerSet() },
      );
      const context = makeMockContext(app);

      await expect(plugin.initialize(context)).resolves.not.toThrow();
    });
  });

  // ── Req 7.2 ────────────────────────────────────────────────────────────────
  describe('when BRIGHTCHAIN_ASSETS_ENABLED is not set', () => {
    beforeEach(() => {
      delete process.env['BRIGHTCHAIN_ASSETS_ENABLED'];
    });

    it('initialize() resolves without throwing even without systemSignerSet', async () => {
      const plugin = new AssetsSubsystemPlugin(
        makeMockLedger(),
        'test-ledger-plugin',
        makeMockSigner(),
        // no systemSignerSet — would normally throw when flag is set
      );
      const context = makeMockContext();

      await expect(plugin.initialize(context)).resolves.not.toThrow();
    });

    it('initialize() resolves without registering services', async () => {
      const plugin = new AssetsSubsystemPlugin(
        makeMockLedger(),
        'test-ledger-plugin',
        makeMockSigner(),
      );
      const context = makeMockContext();

      await plugin.initialize(context);

      expect(context.services.register).not.toHaveBeenCalled();
    });
  });

  // ── stop() safety ──────────────────────────────────────────────────────────
  describe('stop()', () => {
    it('is a no-op when called before initialize()', async () => {
      const plugin = new AssetsSubsystemPlugin(
        makeMockLedger(),
        'test-ledger-plugin',
        makeMockSigner(),
      );

      await expect(plugin.stop()).resolves.not.toThrow();
    });

    it('is a no-op when called after a skipped initialize() (flag off)', async () => {
      delete process.env['BRIGHTCHAIN_ASSETS_ENABLED'];
      const plugin = new AssetsSubsystemPlugin(
        makeMockLedger(),
        'test-ledger-plugin',
        makeMockSigner(),
      );
      const context = makeMockContext();
      await plugin.initialize(context);

      await expect(plugin.stop()).resolves.not.toThrow();
    });
  });
});
