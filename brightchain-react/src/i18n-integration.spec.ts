/**
 * @jest-environment node
 */

/**
 * Integration tests for BrightChain i18n from the React app perspective.
 *
 * Verifies that when brightchain-lib's i18n engine is initialized,
 * the SuiteCore template variables resolve to BrightChain values
 * (not the suite-core defaults like 'New Site').
 *
 * Uses node test environment because brightchain-lib's init chain creates
 * an ECIESService at module load time, and the GuidV4Provider.serialize()
 * method uses Buffer.from() internally. In jsdom, Node's Buffer fails
 * `instanceof Uint8Array` due to cross-realm prototype differences,
 * causing GUID validation to fail.
 *
 * Imports use sub-module paths rather than the barrel export because
 * the barrel's circular init chain causes CoreConstants to be undefined
 * in the i18n-setup module's closure on first evaluation.
 */
import {
  CoreConstants,
  CoreOverrides,
} from '@brightchain/brightchain-lib/lib/constants';
import {
  getBrightChainI18nEngine,
  resetBrightChainI18nEngine,
} from '@brightchain/brightchain-lib/lib/i18n/i18n-setup';
import {
  SuiteCoreComponentId,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';

describe('i18n integration (react): SuiteCore constants override', () => {
  beforeEach(() => {
    resetBrightChainI18nEngine();
  });

  afterAll(() => {
    resetBrightChainI18nEngine();
  });

  it('should resolve {Site} to "BrightChain" in Common_SiteTemplate', () => {
    const engine = getBrightChainI18nEngine();
    const result = engine.translate(
      SuiteCoreComponentId,
      SuiteCoreStringKey.Common_SiteTemplate,
    );
    expect(result).toBe('BrightChain');
  });

  it('should resolve {SiteTagline} to BrightChain tagline', () => {
    const engine = getBrightChainI18nEngine();
    const result = engine.translate(
      SuiteCoreComponentId,
      SuiteCoreStringKey.Common_SiteTaglineTemplate,
    );
    expect(result).toBe(CoreOverrides.SiteTagline);
  });

  it('should resolve {SiteDescription} to BrightChain description', () => {
    const engine = getBrightChainI18nEngine();
    const result = engine.translate(
      SuiteCoreComponentId,
      SuiteCoreStringKey.Common_SiteDescriptionTemplate,
    );
    expect(result).toBe(CoreOverrides.SiteDescription);
  });

  it('should have SuiteCore constants with BrightChain Site value', () => {
    const engine = getBrightChainI18nEngine();
    const constants = engine.getConstants(SuiteCoreComponentId);
    expect(constants).toBeDefined();
    expect(constants?.['Site']).toBe(CoreConstants.Site);
  });
});
