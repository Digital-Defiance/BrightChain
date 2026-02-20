/**
 * Feature: move-node-types-to-api-lib, Property 1: Zero node-express-suite references in brightchain-lib
 *
 * For all TypeScript files in `brightchain-lib/src/`, no file shall contain
 * an import or re-export statement referencing `@digitaldefiance/node-express-suite`.
 *
 * JSDoc comments mentioning `node-express-suite` as documentation are acceptable —
 * only actual import/export statements should be flagged.
 *
 * **Validates: Requirements 1.2, 3.2, 4.2, 4.3, 7.1, 7.3**
 */
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Recursively collect all `.ts` file paths under a given directory.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (stat.isFile() && fullPath.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Matches import or re-export statements referencing node-express-suite.
 *
 * Covers:
 *   import ... from '@digitaldefiance/node-express-suite'
 *   import ... from "@digitaldefiance/node-express-suite"
 *   export ... from '@digitaldefiance/node-express-suite'
 *   export ... from "@digitaldefiance/node-express-suite"
 *   import('@digitaldefiance/node-express-suite')
 *   require('@digitaldefiance/node-express-suite')
 *
 * Does NOT match JSDoc/comment-only mentions.
 */
const IMPORT_EXPORT_PATTERN =
  /^\s*(?:import|export)\s.*from\s+['"]@digitaldefiance\/node-express-suite['"]/;
const DYNAMIC_IMPORT_PATTERN =
  /(?:import|require)\s*\(\s*['"]@digitaldefiance\/node-express-suite['"]\s*\)/;

/**
 * Returns true if a line of code (not inside a block comment) contains
 * an import or re-export of node-express-suite.
 */
function hasNodeExpressSuiteImport(content: string): boolean {
  const lines = content.split('\n');
  let inBlockComment = false;

  for (const line of lines) {
    // Track block comment state
    if (!inBlockComment && line.includes('/*')) {
      inBlockComment = true;
    }
    if (inBlockComment) {
      if (line.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    // Skip single-line comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) {
      continue;
    }

    // Check for static import/export
    if (IMPORT_EXPORT_PATTERN.test(line)) {
      return true;
    }

    // Check for dynamic import/require
    if (DYNAMIC_IMPORT_PATTERN.test(line)) {
      return true;
    }
  }

  return false;
}

// ─── Collect files ───────────────────────────────────────────────────────────

const BRIGHTCHAIN_LIB_SRC = join(__dirname, '..');
const allTsFiles = collectTsFiles(BRIGHTCHAIN_LIB_SRC);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Feature: move-node-types-to-api-lib, Property 1: Zero node-express-suite references in brightchain-lib', () => {
  it('Property 1: No .ts file in brightchain-lib/src/ contains an import or re-export of @digitaldefiance/node-express-suite', () => {
    // Use fast-check to sample from the collected file list and verify the property
    // holds for every file. Since the "input space" is the actual set of files,
    // we use fc.constantFrom to draw from them.
    expect(allTsFiles.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...allTsFiles), (filePath: string) => {
        const content = readFileSync(filePath, 'utf-8');
        const relativePath = filePath.replace(
          BRIGHTCHAIN_LIB_SRC,
          'brightchain-lib/src',
        );

        expect(hasNodeExpressSuiteImport(content)).toBe(false);

        // Belt-and-suspenders: also verify no raw import/export line matches
        // (this catches edge cases the comment-aware parser might miss)
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (
            trimmed.startsWith('//') ||
            trimmed.startsWith('*') ||
            trimmed.startsWith('/*')
          ) {
            continue;
          }
          if (
            (trimmed.startsWith('import ') || trimmed.startsWith('export ')) &&
            trimmed.includes('node-express-suite')
          ) {
            throw new Error(
              `Found node-express-suite import/export in ${relativePath}:\n  ${trimmed}`,
            );
          }
        }
      }),
      { numRuns: allTsFiles.length },
    );
  });
});

/**
 * Feature: move-node-types-to-api-lib, Property 2: All API response wrappers extend both IApiMessageResponse and a base data interface
 *
 * For all `api-*.ts` files in `brightchain-api-lib/src/lib/interfaces/responses/`
 * (excluding `api-error.ts`, `api-express-validation-error.ts`, and `api-status-code-response.ts`),
 * each file shall:
 *   1. Contain `extends IApiMessageResponse` in its interface declaration
 *   2. Import from `@brightchain/brightchain-lib` (for the base data interface)
 *
 * **Validates: Requirements 2.1, 8.2**
 */
describe('Feature: move-node-types-to-api-lib, Property 2: All API response wrappers extend both IApiMessageResponse and a base data interface', () => {
  // Files excluded from this property check — they are Express-specific error types
  // or use a generic constraint pattern rather than the standard wrapper pattern.
  const EXCLUDED_FILES = new Set([
    'api-error.ts',
    'api-express-validation-error.ts',
    'api-status-code-response.ts',
  ]);

  // Resolve the api-lib responses directory relative to workspace root.
  // __dirname = brightchain-lib/src/__tests__
  // workspace root = 3 levels up
  const API_LIB_RESPONSES_DIR = join(
    __dirname,
    '..',
    '..',
    '..',
    'brightchain-api-lib',
    'src',
    'lib',
    'interfaces',
    'responses',
  );

  /**
   * Collect all `api-*.ts` files in the responses directory, excluding
   * the known non-standard files and barrel files.
   */
  function collectApiResponseFiles(): string[] {
    const entries = readdirSync(API_LIB_RESPONSES_DIR);
    return entries
      .filter(
        (name) =>
          name.startsWith('api-') &&
          name.endsWith('.ts') &&
          !name.endsWith('.spec.ts') &&
          !EXCLUDED_FILES.has(name),
      )
      .map((name) => join(API_LIB_RESPONSES_DIR, name));
  }

  const apiResponseFiles = collectApiResponseFiles();

  it('should find at least one qualifying api-*.ts file', () => {
    expect(apiResponseFiles.length).toBeGreaterThan(0);
  });

  it('Property 2: Every qualifying api-*.ts wrapper extends IApiMessageResponse and imports a base data interface from @brightchain/brightchain-lib', () => {
    fc.assert(
      fc.property(fc.constantFrom(...apiResponseFiles), (filePath: string) => {
        const content = readFileSync(filePath, 'utf-8');
        const fileName = filePath.split('/').pop();

        // 1. Must contain `extends IApiMessageResponse`
        const extendsPattern = /extends\s+IApiMessageResponse/;
        if (!extendsPattern.test(content)) {
          throw new Error(`${fileName} does not extend IApiMessageResponse`);
        }

        // 2. Must import from @brightchain/brightchain-lib
        const brightchainLibImportPattern =
          /import\s+\{[^}]+\}\s+from\s+['"]@brightchain\/brightchain-lib['"]/;
        if (!brightchainLibImportPattern.test(content)) {
          throw new Error(
            `${fileName} does not import a base data interface from @brightchain/brightchain-lib`,
          );
        }
      }),
      { numRuns: apiResponseFiles.length },
    );
  });
});

/**
 * Feature: move-node-types-to-api-lib, Property 3: Every API response wrapper has a corresponding base data interface
 *
 * For all `api-*.ts` files in `brightchain-api-lib/src/lib/interfaces/responses/`
 * (excluding `api-error.ts`, `api-express-validation-error.ts`, and `api-status-code-response.ts`),
 * each file shall import at least one base data interface from `@brightchain/brightchain-lib`,
 * and that interface shall be exported from a file in `brightchain-lib/src/lib/interfaces/responses/`.
 *
 * **Validates: Requirements 1.1, 8.1**
 */
describe('Feature: move-node-types-to-api-lib, Property 3: Every API response wrapper has a corresponding base data interface', () => {
  const EXCLUDED_FILES = new Set([
    'api-error.ts',
    'api-express-validation-error.ts',
    'api-status-code-response.ts',
  ]);

  const API_LIB_RESPONSES_DIR = join(
    __dirname,
    '..',
    '..',
    '..',
    'brightchain-api-lib',
    'src',
    'lib',
    'interfaces',
    'responses',
  );

  const BRIGHTCHAIN_LIB_RESPONSES_DIR = join(
    __dirname,
    '..',
    'lib',
    'interfaces',
    'responses',
  );

  /**
   * Collect all qualifying `api-*.ts` wrapper files.
   */
  function collectApiWrapperFiles(): string[] {
    const entries = readdirSync(API_LIB_RESPONSES_DIR);
    return entries
      .filter(
        (name) =>
          name.startsWith('api-') &&
          name.endsWith('.ts') &&
          !name.endsWith('.spec.ts') &&
          !EXCLUDED_FILES.has(name),
      )
      .map((name) => join(API_LIB_RESPONSES_DIR, name));
  }

  /**
   * Extract interface names imported from `@brightchain/brightchain-lib` in a file.
   */
  function extractBrightchainLibImports(content: string): string[] {
    const importPattern =
      /import\s+\{([^}]+)\}\s+from\s+['"]@brightchain\/brightchain-lib['"]/g;
    const interfaces: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = importPattern.exec(content)) !== null) {
      const names = match[1]
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
      interfaces.push(...names);
    }
    return interfaces;
  }

  /**
   * Check whether a given interface name is exported from any file in the
   * brightchain-lib responses directory.
   */
  function isExportedFromBrightchainLibResponses(
    interfaceName: string,
  ): boolean {
    const entries = readdirSync(BRIGHTCHAIN_LIB_RESPONSES_DIR);
    const tsFiles = entries.filter(
      (name) => name.endsWith('.ts') && !name.endsWith('.spec.ts'),
    );

    for (const fileName of tsFiles) {
      const filePath = join(BRIGHTCHAIN_LIB_RESPONSES_DIR, fileName);
      const content = readFileSync(filePath, 'utf-8');

      // Check for direct export of the interface
      const exportPattern = new RegExp(
        `export\\s+(?:interface|type)\\s+${interfaceName}\\b`,
      );
      if (exportPattern.test(content)) {
        return true;
      }

      // Check for re-export via barrel (export type * from or export { ... })
      if (fileName === 'index.ts') {
        // The barrel uses `export type * from './...'` so the interface
        // is transitively exported if it exists in any of the referenced files.
        // We already check individual files above, so skip the barrel itself.
        continue;
      }
    }

    return false;
  }

  const apiWrapperFiles = collectApiWrapperFiles();

  it('should find at least one qualifying api-*.ts wrapper file', () => {
    expect(apiWrapperFiles.length).toBeGreaterThan(0);
  });

  it('Property 3: Every API response wrapper imports a base data interface that exists in brightchain-lib responses', () => {
    fc.assert(
      fc.property(fc.constantFrom(...apiWrapperFiles), (filePath: string) => {
        const content = readFileSync(filePath, 'utf-8');
        const fileName = filePath.split('/').pop();

        // Extract the base data interface(s) imported from brightchain-lib
        const importedInterfaces = extractBrightchainLibImports(content);

        if (importedInterfaces.length === 0) {
          throw new Error(
            `${fileName} does not import any interface from @brightchain/brightchain-lib`,
          );
        }

        // Verify each imported interface is actually exported from brightchain-lib responses
        for (const interfaceName of importedInterfaces) {
          if (!isExportedFromBrightchainLibResponses(interfaceName)) {
            throw new Error(
              `${fileName} imports ${interfaceName} from @brightchain/brightchain-lib, ` +
                `but it is not exported from brightchain-lib/src/lib/interfaces/responses/`,
            );
          }
        }
      }),
      { numRuns: apiWrapperFiles.length },
    );
  });
});

/**
 * Feature: move-node-types-to-api-lib, Property 4: No index signatures in base data interfaces
 *
 * For all base data interfaces in `brightchain-lib/src/lib/interfaces/responses/`
 * whose file names contain `ResponseData` (case-insensitive), the file shall not
 * contain an index signature of the form `[key: string]: unknown`.
 *
 * Index signatures are artifacts of the Express response type (`IApiMessageResponse`)
 * and must be omitted from platform-agnostic base data interfaces.
 *
 * **Validates: Requirements 1.4**
 */
describe('Feature: move-node-types-to-api-lib, Property 4: No index signatures in base data interfaces', () => {
  const BRIGHTCHAIN_LIB_RESPONSES_DIR = join(
    __dirname,
    '..',
    'lib',
    'interfaces',
    'responses',
  );

  /**
   * Collect all `.ts` files in the responses directory whose names contain
   * `ResponseData` (case-insensitive), excluding test and barrel files.
   */
  function collectResponseDataFiles(): string[] {
    const entries = readdirSync(BRIGHTCHAIN_LIB_RESPONSES_DIR);
    return entries
      .filter(
        (name) =>
          name.endsWith('.ts') &&
          !name.endsWith('.spec.ts') &&
          name !== 'index.ts' &&
          name.toLowerCase().includes('responsedata'),
      )
      .map((name) => join(BRIGHTCHAIN_LIB_RESPONSES_DIR, name));
  }

  const responseDataFiles = collectResponseDataFiles();

  it('should find at least one *ResponseData* file', () => {
    expect(responseDataFiles.length).toBeGreaterThan(0);
  });

  it('Property 4: No *ResponseData* file contains an index signature [key: string]', () => {
    /**
     * Matches index signatures like:
     *   [key: string]: unknown
     *   [key: string]: any
     *   [key: string]: SomeType
     *   [prop: string]: unknown
     */
    const INDEX_SIGNATURE_PATTERN = /\[\s*\w+\s*:\s*string\s*\]/;

    fc.assert(
      fc.property(fc.constantFrom(...responseDataFiles), (filePath: string) => {
        const content = readFileSync(filePath, 'utf-8');
        const fileName = filePath.split('/').pop();

        // Check each non-comment line for index signatures
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();

          // Skip comments
          if (
            trimmed.startsWith('//') ||
            trimmed.startsWith('*') ||
            trimmed.startsWith('/*')
          ) {
            continue;
          }

          if (INDEX_SIGNATURE_PATTERN.test(trimmed)) {
            throw new Error(
              `${fileName} contains an index signature (artifact of Express response type):\n  ${trimmed}`,
            );
          }
        }
      }),
      { numRuns: responseDataFiles.length },
    );
  });
});
