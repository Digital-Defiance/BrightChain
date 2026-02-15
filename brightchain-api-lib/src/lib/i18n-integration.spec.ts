/**
 * Integration tests for BrightChain i18n from the API-lib perspective.
 *
 * Verifies that when brightchain-lib's i18n engine is initialized,
 * the SuiteCore template variables resolve to BrightChain values
 * (not the suite-core defaults).
 */
import {
  CoreConstants,
  CoreOverrides,
  getBrightChainI18nEngine,
  resetBrightChainI18nEngine,
} from '@brightchain/brightchain-lib';
import {
  SuiteCoreComponentId,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';

describe('i18n integration (api-lib): SuiteCore constants override', () => {
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
    expect(constants?.['SiteHostname']).toBe('brightchain.org');
    expect(constants?.['SiteEmailDomain']).toBe('brightchain.org');
  });
});
