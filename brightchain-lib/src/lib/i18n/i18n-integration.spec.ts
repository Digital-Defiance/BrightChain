/**
 * Integration tests for BrightChain i18n setup.
 *
 * Verifies that:
 * - {Site} resolves to 'BrightChain' (not the suite-core default 'New Site')
 * - {SiteTagline} and {SiteDescription} resolve to BrightChain values
 * - All SuiteCore template variables have matching constants registered
 */
import { validateConstantsCoverage } from '@digitaldefiance/i18n-lib';
import {
  SuiteCoreComponentId,
  SuiteCoreComponentStrings,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { CoreConstants, CoreOverrides } from '../constants';
import {
  getBrightChainI18nEngine,
  resetBrightChainI18nEngine,
  translateCore,
} from './i18n-setup';

describe('i18n integration: SuiteCore constants override', () => {
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

  it('should resolve {SiteTagline} to BrightChain tagline in Common_SiteTaglineTemplate', () => {
    const result = translateCore(SuiteCoreStringKey.Common_SiteTaglineTemplate);
    expect(result).toBe(CoreOverrides.SiteTagline);
  });

  it('should resolve {SiteDescription} to BrightChain description in Common_SiteDescriptionTemplate', () => {
    const result = translateCore(
      SuiteCoreStringKey.Common_SiteDescriptionTemplate,
    );
    expect(result).toBe(CoreOverrides.SiteDescription);
  });

  it('should NOT resolve {Site} to the default "New Site"', () => {
    const result = translateCore(SuiteCoreStringKey.Common_SiteTemplate);
    expect(result).not.toBe('New Site');
  });

  it('should have SuiteCore constants registered with BrightChain values', () => {
    const engine = getBrightChainI18nEngine();
    const constants = engine.getConstants(SuiteCoreComponentId);
    expect(constants).toBeDefined();
    expect(constants?.['Site']).toBe(CoreConstants.Site);
    expect(constants?.['SiteTagline']).toBe(CoreConstants.SiteTagline);
    expect(constants?.['SiteDescription']).toBe(CoreConstants.SiteDescription);
    expect(constants?.['SiteEmailDomain']).toBe(CoreConstants.SiteEmailDomain);
    expect(constants?.['SiteHostname']).toBe(CoreConstants.SiteHostname);
  });

  it('should have constants coverage for all SuiteCore template variables', () => {
    const engine = getBrightChainI18nEngine();
    const constants = engine.getConstants(SuiteCoreComponentId);
    expect(constants).toBeDefined();

    // Cast the branded strings collection to the shape validateConstantsCoverage expects
    const stringsRecord = SuiteCoreComponentStrings as Record<
      string,
      Record<string, string>
    >;

    const coverage = validateConstantsCoverage(stringsRecord, constants!, {
      // Runtime variables that aren't constants (passed inline by callers)
      ignoreVariables: [
        // Lowercase runtime variables
        'count',
        'username',
        'email',
        'role',
        'model',
        'key',
        'index',
        'error',
        'hash',
        'path',
        'variable',
        'timeout',
        'language',
        'enum',
        'value',
        'regex',
        'hostname',
        'max',
        'type',
        'name',
        'service',
        'expected',
        'actual',
        'shardSize',
        'maxShardSize',
        'available',
        'required',
        'dataShards',
        'parityShards',
        'length',
        'version',
        'remaining',
        'interval',
        'dir',
        'file',
        'env',
        'currency',
        'detail',
        'enumName',
        'field',
        'lang',
        'modelKey',
        'modelName',
        'timeMs',
        'timeRemaining',
        'timezone',
        'user',
        'userId',
        'variable1',
        // UPPER_CASE runtime template variables
        'AVAILABLE',
        'BRAND',
        'DEFAULT_LANGUAGE',
        'ERROR',
        'EXPECTED',
        'GUID',
        'ID',
        'KEY_BYTES',
        'LANG',
        'LANGUAGE',
        'LENGTH',
        'MAXIMUM',
        'NAME',
        'PATH',
        'REQUIRED',
        'ROLE',
        'ROLEID',
        'ROLE_ID',
        'SIZE',
        'STATE',
        'TOKEN',
        'TYPE',
        'USERID',
        'USER_ID',
        'VAR',
        // Constants that come from CoreConstants (not registered as i18n constants)
        'AdministratorEmail',
        'LoginChallengeExpiration',
        'PasswordMinLength',
        'UsernameMaxLength',
        'UsernameMinLength',
      ],
    });

    expect(coverage.missingConstants).toEqual([]);
  });
});
