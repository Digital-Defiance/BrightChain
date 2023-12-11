/**
 * Property-based tests for the BrightDb code symbol rename.
 *
 * Feature: brightdb-code-symbol-rename
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { BrightDbError } from '../lib/errors';

/**
 * Property 3: Error name property reflects new branding
 *
 * For any error code (integer) and message (string), when BrightDbError
 * is instantiated, .name SHALL equal 'BrightDbError'.
 *
 * Feature: brightdb-code-symbol-rename, Property 3: Error name property reflects new branding
 * Validates: Requirements 4.1
 */
describe('Property 3: Error name property reflects new branding', () => {
  it('BrightDbError.name equals "BrightDbError" for any message and code', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.integer(),
        (message: string, code: number) => {
          const error = new BrightDbError(message, code);
          expect(error.name).toBe('BrightDbError');
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Recursively collect all `.ts` and `.tsx` files under `dir`,
 * skipping directories whose names appear in `excludeSegments`.
 */
function collectTsFiles(dir: string, excludeSegments: string[] = []): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (excludeSegments.includes(entry.name)) continue;
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full, excludeSegments));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
    ) {
      results.push(full);
    }
  }
  return results;
}

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..', '..');
const EXCLUDE_SEGMENTS = ['node_modules', 'dist', '.git', '.kiro'];

// Build deprecated symbol strings dynamically so this file itself is not
// flagged by its own scan (the scanner looks for literal occurrences).
const _prefix = 'Bright';
const _chain = 'Chain';
const _db = 'Db';
const OLD_SYMBOLS = [
  `${_prefix}${_chain}${_db}`,
  `${_prefix}${_chain}${_db}Options`,
  `${_prefix}${_chain}${_db}Error`,
];

const tsFiles = collectTsFiles(WORKSPACE_ROOT, EXCLUDE_SEGMENTS);

/**
 * Property 1: No old symbol names in TypeScript source
 *
 * For any .ts/.tsx file in the codebase (excluding node_modules, dist, .git, .kiro),
 * the file SHALL NOT contain the deprecated DB symbol names.
 *
 * Feature: brightdb-code-symbol-rename, Property 1: No old symbol names in TypeScript source
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.2, 5.1, 5.2, 5.3, 5.4, 6.3, 6.4, 8.1
 */
describe('Property 1: No old symbol names in TypeScript source', () => {
  it('no .ts/.tsx file contains deprecated DB symbol names', () => {
    expect(tsFiles.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...tsFiles), (filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const oldSymbol of OLD_SYMBOLS) {
          if (content.includes(oldSymbol)) {
            const relPath = path.relative(WORKSPACE_ROOT, filePath);
            throw new Error(
              `File "${relPath}" still contains old symbol "${oldSymbol}"`,
            );
          }
        }
      }),
      { numRuns: Math.max(100, tsFiles.length) },
    );
  });
});

/**
 * Property 2: New symbol names exist at expected declaration sites
 *
 * For each symbol in {BrightDb, BrightDbOptions, BrightDbError}, there SHALL
 * exist a .ts file with the corresponding declaration, and barrel exports SHALL
 * reference the new names.
 *
 * Feature: brightdb-code-symbol-rename, Property 2: New symbol names exist at expected declaration sites
 * Validates: Requirements 1.1, 2.1, 3.1, 1.3, 2.3, 3.3, 3.4
 */
describe('Property 2: New symbol names exist at expected declaration sites', () => {
  interface SymbolDeclaration {
    symbol: string;
    declarationPattern: RegExp;
    declarationFiles: string[];
    barrelFile: string;
    barrelPattern: RegExp;
  }

  const declarations: SymbolDeclaration[] = [
    {
      symbol: 'BrightDb',
      declarationPattern: /class\s+BrightDb\b/,
      declarationFiles: [
        path.join(WORKSPACE_ROOT, 'brightchain-db/src/lib/database.ts'),
      ],
      barrelFile: path.join(WORKSPACE_ROOT, 'brightchain-db/src/index.ts'),
      barrelPattern: /\bBrightDb\b/,
    },
    {
      symbol: 'BrightDbOptions',
      declarationPattern: /interface\s+BrightDbOptions\b/,
      declarationFiles: [
        path.join(WORKSPACE_ROOT, 'brightchain-db/src/lib/database.ts'),
      ],
      barrelFile: path.join(WORKSPACE_ROOT, 'brightchain-db/src/index.ts'),
      barrelPattern: /\bBrightDbOptions\b/,
    },
    {
      symbol: 'BrightDbError',
      declarationPattern: /class\s+BrightDbError\b/,
      declarationFiles: [
        path.join(WORKSPACE_ROOT, 'brightchain-db/src/lib/errors.ts'),
        path.join(WORKSPACE_ROOT, 'brightchain-lib/src/lib/db/errors.ts'),
      ],
      barrelFile: path.join(WORKSPACE_ROOT, 'brightchain-db/src/index.ts'),
      barrelPattern: /\bBrightDbError\b/,
    },
  ];

  it('each new symbol has a declaration in the expected file(s)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...declarations),
        (decl: SymbolDeclaration) => {
          for (const declFile of decl.declarationFiles) {
            const content = fs.readFileSync(declFile, 'utf-8');
            if (!decl.declarationPattern.test(content)) {
              const relPath = path.relative(WORKSPACE_ROOT, declFile);
              throw new Error(
                `Expected declaration of "${decl.symbol}" in "${relPath}" but pattern not found`,
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('barrel exports in brightchain-db/src/index.ts reference the new names', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...declarations),
        (decl: SymbolDeclaration) => {
          const content = fs.readFileSync(decl.barrelFile, 'utf-8');
          if (!decl.barrelPattern.test(content)) {
            const relPath = path.relative(WORKSPACE_ROOT, decl.barrelFile);
            throw new Error(
              `Expected barrel export of "${decl.symbol}" in "${relPath}" but not found`,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('brightchain-lib/src/lib/index.ts re-exports BrightDbError', () => {
    const libIndex = path.join(
      WORKSPACE_ROOT,
      'brightchain-lib/src/lib/index.ts',
    );
    const content = fs.readFileSync(libIndex, 'utf-8');
    expect(content).toMatch(/\bBrightDbError\b/);
  });
});

/**
 * Collect language files under brightchain-lib/src/lib/i18n/strings/.
 * Only top-level .ts files (not index.ts or subdirectories).
 */
function collectLanguageFiles(): string[] {
  const stringsDir = path.join(
    WORKSPACE_ROOT,
    'brightchain-lib/src/lib/i18n/strings',
  );
  return fs
    .readdirSync(stringsDir, { withFileTypes: true })
    .filter(
      (e) => e.isFile() && e.name.endsWith('.ts') && e.name !== 'index.ts',
    )
    .map((e) => path.join(stringsDir, e.name));
}

const languageFiles = collectLanguageFiles();

/**
 * Property 4: No old deprecated DB text in i18n string values
 *
 * For any language file under brightchain-lib/src/lib/i18n/strings/,
 * no key-value pair SHALL contain the deprecated DB symbol in the value,
 * and no key SHALL reference old Splash_ keys.
 *
 * Feature: brightdb-code-symbol-rename, Property 4: No old deprecated DB text in i18n string values
 * Validates: Requirements 7.1, 7.2
 */
describe('Property 4: No old deprecated DB text in i18n string values', () => {
  // Build search strings dynamically to avoid self-detection
  const oldDbText = `${_prefix}${_chain}${_db}`;
  const oldSplashKey = `Splash_${_prefix}${_chain}${_db}`;
  const oldSplashDescKey = `Splash_${_prefix}${_chain}${_db}Description`;

  it('no language file contains deprecated DB text in values or old Splash_ keys', () => {
    expect(languageFiles.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...languageFiles), (filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(WORKSPACE_ROOT, filePath);

        // Check for old deprecated DB text anywhere in the file content
        if (content.includes(oldDbText)) {
          throw new Error(
            `Language file "${relPath}" still contains old text "${oldDbText}"`,
          );
        }

        // Check for old Splash_ key references
        if (content.includes(oldSplashKey)) {
          throw new Error(
            `Language file "${relPath}" still references old key "${oldSplashKey}"`,
          );
        }

        if (content.includes(oldSplashDescKey)) {
          throw new Error(
            `Language file "${relPath}" still references old key "${oldSplashDescKey}"`,
          );
        }
      }),
      { numRuns: Math.max(100, languageFiles.length) },
    );
  });
});

/**
 * Collect all `package.json` files under `dir`, excluding specified segments.
 */
function collectPackageJsonFiles(
  dir: string,
  excludeSegments: string[] = [],
): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (excludeSegments.includes(entry.name)) continue;
    if (entry.isDirectory()) {
      results.push(...collectPackageJsonFiles(full, excludeSegments));
    } else if (entry.isFile() && entry.name === 'package.json') {
      results.push(full);
    }
  }
  return results;
}

/**
 * Property 5: Import paths and non-symbol identifiers preserved
 *
 * For any .ts file importing from @brightchain/db, the import path SHALL
 * remain @brightchain/db (not renamed). package.json name SHALL remain
 * @brightchain/db. References to .brightchain-db.lock SHALL remain unchanged.
 *
 * Feature: brightdb-code-symbol-rename, Property 5: Import paths and non-symbol identifiers preserved
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */
describe('Property 5: Import paths and non-symbol identifiers preserved', () => {
  const IMPORT_PATH_REGEX = /from\s+['"]@brightchain\/db['"]/;
  const tsFilesWithDbImport = tsFiles.filter((filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    return IMPORT_PATH_REGEX.test(content);
  });

  it('all .ts files importing from @brightchain/db use the exact path "@brightchain/db"', () => {
    expect(tsFilesWithDbImport.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.constantFrom(...tsFilesWithDbImport),
        (filePath: string) => {
          const content = fs.readFileSync(filePath, 'utf-8');
          const relPath = path.relative(WORKSPACE_ROOT, filePath);

          // Every import/export from @brightchain/db must use the exact path
          const importLines = content
            .split('\n')
            .filter(
              (line) =>
                line.includes('@brightchain/db') &&
                /(?:import|export)\s/.test(line),
            );

          for (const line of importLines) {
            // The import path must be exactly @brightchain/db, not some renamed variant
            if (!/@brightchain\/db['"]/.test(line)) {
              throw new Error(
                `File "${relPath}" has a @brightchain/db import with unexpected path: ${line.trim()}`,
              );
            }
          }
        },
      ),
      { numRuns: Math.max(100, tsFilesWithDbImport.length) },
    );
  });

  it('brightchain-db/package.json has name "@brightchain/db"', () => {
    const pkgPath = path.join(WORKSPACE_ROOT, 'brightchain-db/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.name).toBe('@brightchain/db');
  });

  it('".brightchain-db.lock" references exist in the codebase', () => {
    const lockPattern = /\.brightchain-db\.lock/;
    const filesWithLockRef = tsFiles.filter((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      return lockPattern.test(content);
    });

    // There should be at least one .ts file referencing .brightchain-db.lock
    expect(filesWithLockRef.length).toBeGreaterThan(0);
  });

  it('@brightchain/db appears in package.json files that reference it', () => {
    const packageJsonFiles = collectPackageJsonFiles(
      WORKSPACE_ROOT,
      EXCLUDE_SEGMENTS,
    );
    const pkgFilesWithRef = packageJsonFiles.filter((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.includes('@brightchain/db');
    });

    expect(pkgFilesWithRef.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...pkgFilesWithRef), (filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(WORKSPACE_ROOT, filePath);

        // Verify the package reference uses the exact name @brightchain/db
        if (!content.includes('@brightchain/db')) {
          throw new Error(
            `Package file "${relPath}" should reference "@brightchain/db" but does not`,
          );
        }
      }),
      { numRuns: Math.max(100, pkgFilesWithRef.length) },
    );
  });
});
