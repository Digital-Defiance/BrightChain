/**
 * Property-based tests for ImportDialog — Properties 14, 15
 *
 * Property 14: Import format to file type mapping
 * Property 15: Import result rendering completeness
 *
 * **Validates: Requirements 11.2, 11.4**
 */

import fc from 'fast-check';

// Mock brightchain-lib to avoid the heavy ECIES/GUID init chain
jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  BrightPassStrings: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

jest.mock('../hooks/useBrightPassTranslation', () => ({
  __esModule: true,
  useBrightPassTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../hooks/useBrightPassApi', () => ({
  __esModule: true,
  useBrightPassApi: () => ({
    importEntries: jest.fn(),
  }),
}));

// Import AFTER mocks
import { formatImportSummary, getAcceptedFileTypes } from './ImportDialog';

const KNOWN_FORMATS = [
  '1password_1pux',
  '1password_csv',
  'lastpass_csv',
  'bitwarden_json',
  'bitwarden_csv',
  'chrome_csv',
  'firefox_csv',
  'keepass_xml',
  'dashlane_json',
] as const;

describe('Property 14: Import format to file type mapping', () => {
  it('returns non-empty extensions for all known formats', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KNOWN_FORMATS), (format) => {
        const result = getAcceptedFileTypes(format);
        expect(result.extensions.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('returns empty extensions for unknown formats', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 30 })
          .filter((s) => !(KNOWN_FORMATS as readonly string[]).includes(s)),
        (format) => {
          const result = getAcceptedFileTypes(format);
          expect(result.extensions).toEqual([]);
          expect(result.mimeTypes).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('CSV formats return .csv extension', () => {
    const csvFormats = [
      '1password_csv',
      'lastpass_csv',
      'bitwarden_csv',
      'chrome_csv',
      'firefox_csv',
    ];
    fc.assert(
      fc.property(fc.constantFrom(...csvFormats), (format) => {
        const result = getAcceptedFileTypes(format);
        expect(result.extensions).toContain('.csv');
        expect(result.mimeTypes).toContain('text/csv');
      }),
      { numRuns: 100 },
    );
  });

  it('JSON formats return .json extension', () => {
    const jsonFormats = ['bitwarden_json', 'dashlane_json'];
    fc.assert(
      fc.property(fc.constantFrom(...jsonFormats), (format) => {
        const result = getAcceptedFileTypes(format);
        expect(result.extensions).toContain('.json');
        expect(result.mimeTypes).toContain('application/json');
      }),
      { numRuns: 100 },
    );
  });

  it('is deterministic — same format always yields same result', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KNOWN_FORMATS), (format) => {
        const a = getAcceptedFileTypes(format);
        const b = getAcceptedFileTypes(format);
        expect(a).toEqual(b);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 15: Import result rendering completeness', () => {
  it('total equals imported + skipped', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.nat({ max: 10000 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 20 }),
        (imported, skipped, errors) => {
          const summary = formatImportSummary({ imported, skipped, errors });
          expect(summary.total).toBe(imported + skipped);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('hasErrors is true when errors array is non-empty', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.nat({ max: 10000 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (imported, skipped, errors) => {
          const summary = formatImportSummary({ imported, skipped, errors });
          expect(summary.hasErrors).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('hasErrors is false when errors array is empty', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.nat({ max: 10000 }),
        (imported, skipped) => {
          const summary = formatImportSummary({
            imported,
            skipped,
            errors: [],
          });
          expect(summary.hasErrors).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('is deterministic', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.nat({ max: 10000 }),
        fc.array(fc.string({ minLength: 0, maxLength: 50 }), { maxLength: 10 }),
        (imported, skipped, errors) => {
          const a = formatImportSummary({ imported, skipped, errors });
          const b = formatImportSummary({ imported, skipped, errors });
          expect(a).toEqual(b);
        },
      ),
      { numRuns: 100 },
    );
  });
});
