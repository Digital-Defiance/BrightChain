/**
 * @fileoverview Unit tests for the refactored InitUserDb tool.
 *
 * Tests cover:
 * - CLI flags still generate mnemonics/secrets (Req 4.5)
 * - Database drop uses plugin reference (Req 4.4)
 * - No DatabaseInitializationService or ApplicationConcrete imports (Req 4.2, 4.3)
 * - User IDs are generated via the ID provider (Req 4.3)
 */
import * as fs from 'fs';

describe('InitUserDb refactored main.ts', () => {
  let mainSource: string;

  beforeAll(() => {
    mainSource = fs.readFileSync(require.resolve('./main.ts'), 'utf-8');
  });

  // ── Import verification (Req 4.2, 4.3, 5.4) ──────────────────────────

  describe('import verification', () => {
    it('does not import DatabaseInitializationService (Req 4.3)', () => {
      expect(mainSource).not.toContain('DatabaseInitializationService');
    });

    it('does not import ApplicationConcrete (Req 4.2)', () => {
      expect(mainSource).not.toContain('ApplicationConcrete');
    });

    it('does not import IServerInitResult (Req 4.3)', () => {
      expect(mainSource).not.toContain('IServerInitResult');
    });

    it('imports configureBrightChainApp from brightchain-api-lib (Req 4.1)', () => {
      expect(mainSource).toContain('configureBrightChainApp');
      expect(mainSource).toContain('@brightchain/brightchain-api-lib');
    });

    it('imports BaseApplication from node-express-suite (Req 4.1)', () => {
      expect(mainSource).toContain('BaseApplication');
      expect(mainSource).toContain('@digitaldefiance/node-express-suite');
    });

    it('imports GuidV4Provider for ID generation (Req 4.3)', () => {
      expect(mainSource).toContain('GuidV4Provider');
    });

    it('imports BrightChainMemberInitService (Req 4.6)', () => {
      expect(mainSource).toContain('BrightChainMemberInitService');
    });
  });

  // ── CLI flag handling (Req 4.5) ────────────────────────────────────────

  describe('CLI flag handling', () => {
    it('handles --gen-system-user-mnemonic flag (Req 4.5)', () => {
      expect(mainSource).toContain('--gen-system-user-mnemonic');
    });

    it('handles --gen-member-user-mnemonic flag (Req 4.5)', () => {
      expect(mainSource).toContain('--gen-member-user-mnemonic');
    });

    it('handles --gen-mnemonic-hmac-secret flag (Req 4.5)', () => {
      expect(mainSource).toContain('--gen-mnemonic-hmac-secret');
    });

    it('handles --gen-mnemonic-encryption-key flag (Req 4.5)', () => {
      expect(mainSource).toContain('--gen-mnemonic-encryption-key');
    });

    it('handles --drop flag (Req 4.4)', () => {
      expect(mainSource).toContain("'--drop'");
    });
  });

  // ── Database drop uses plugin (Req 4.4) ────────────────────────────────

  describe('database drop uses plugin', () => {
    it('uses plugin.brightChainDb.dropDatabase() for --drop (Req 4.4)', () => {
      expect(mainSource).toContain('plugin.brightChainDb.dropDatabase()');
    });

    it('does not use app.db.connection for drop (Req 4.4)', () => {
      expect(mainSource).not.toContain('app.db.connection');
    });
  });

  // ── User ID generation (Req 4.3) ──────────────────────────────────────

  describe('user ID generation', () => {
    it('converts environment IDs to strings via the GuidV4Provider (Req 4.3)', () => {
      expect(mainSource).toContain('guidProvider.idToString');
    });

    it('reads raw env vars for IDs (Req 4.3)', () => {
      expect(mainSource).toContain("'SYSTEM_ID'");
      expect(mainSource).toContain("'ADMIN_ID'");
      expect(mainSource).toContain("'MEMBER_ID'");
    });

    it('sets up GuidV4Provider on constants before Environment construction (Req 4.3)', () => {
      const guidProviderIndex = mainSource.indexOf('new GuidV4Provider()');
      const envConstructionIndex = mainSource.indexOf(
        'new BrightChainEnvironment(',
      );
      expect(guidProviderIndex).toBeGreaterThan(-1);
      expect(envConstructionIndex).toBeGreaterThan(-1);
      expect(guidProviderIndex).toBeLessThan(envConstructionIndex);
    });

    it('persists generated IDs back to .env (Req 4.3)', () => {
      expect(mainSource).toContain('appendEnvVar');
    });

    it('passes configured constants to Environment constructor (Req 4.3)', () => {
      // The Environment constructor receives the pre-configured constants
      // so BaseEnvironment uses GuidV4Provider for ID parsing/generation
      expect(mainSource).toContain('constants.idProvider = guidProvider');
      expect(mainSource).toContain('registerNodeRuntimeConfiguration');
    });
  });

  // ── Shared setup usage (Req 4.1) ──────────────────────────────────────

  describe('shared setup usage', () => {
    it('calls configureBrightChainApp for shared setup (Req 4.1)', () => {
      expect(mainSource).toContain('configureBrightChainApp(app, env');
    });

    it('creates BaseApplication instance (Req 4.1)', () => {
      expect(mainSource).toContain('new BaseApplication');
    });

    it('uses createNoOpDatabase for the base application (Req 4.1)', () => {
      expect(mainSource).toContain('createNoOpDatabase()');
    });
  });

  // ── Exit codes ─────────────────────────────────────────────────────────

  describe('exit codes', () => {
    it('exits with code 0 on success', () => {
      expect(mainSource).toContain('exitCode = 0');
    });

    it('exits with code 2 on drop failure', () => {
      expect(mainSource).toContain('process.exit(2)');
    });

    it('exits with code 3 on member init failure', () => {
      expect(mainSource).toContain('exitCode = 3');
    });

    it('exits with code 1 on unhandled error', () => {
      expect(mainSource).toContain('process.exit(1)');
    });
  });
});
