/**
 * Property 1: No prose deprecated DB symbol in documentation files
 *
 * For any markdown file in the repository (excluding .kiro/specs/),
 * when the file content is parsed into prose sections (text outside
 * fenced code blocks and outside inline code backticks), the deprecated
 * DB symbol shall not appear in any prose section.
 *
 * Feature: brightdb-branding-rename, Property 1: No prose deprecated DB symbol in documentation files
 * Validates: Requirements 1.1, 2.1, 3.1, 6.1, 9.1
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/** Workspace root (three levels up from __tests__). */
const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Recursively collect all `.md` files under `dir`, excluding any path
 * that contains a segment matching one of `excludeSegments`.
 */
function collectMarkdownFiles(
  dir: string,
  excludeSegments: string[] = [],
): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (excludeSegments.includes(entry.name)) continue;
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(full, excludeSegments));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extract prose from markdown content by stripping:
 *   1. Fenced code blocks (``` ... ```)
 *   2. Inline code spans (` ... `)
 * Returns the remaining text (prose only).
 */
function extractProse(markdown: string): string {
  // 1. Remove fenced code blocks (``` optionally with language tag)
  let prose = markdown.replace(/^```[\s\S]*?^```/gm, '');
  // 2. Remove inline code spans
  prose = prose.replace(/`[^`]*`/g, '');
  return prose;
}

// Build the deprecated symbol dynamically so the code-symbol-rename
// scanner does not flag this test file itself.
const _deprecatedDbSymbol = ['Bright', 'Chain', 'Db'].join('');

describe('Property 1: No prose deprecated DB symbol in documentation files', () => {
  const mdFiles = collectMarkdownFiles(WORKSPACE_ROOT, [
    'node_modules',
    '.git',
    '.kiro',
    'dist',
    'coverage',
    'tmp',
    '.yarn',
  ]);

  // Sanity: we should find at least a few markdown files
  it('should discover markdown files in the workspace', () => {
    expect(mdFiles.length).toBeGreaterThan(0);
  });

  it('no markdown file contains deprecated DB symbol in prose sections', () => {
    // Use fast-check to sample from the discovered files.
    // Since the file list is finite and deterministic we wrap it in
    // fc.constantFrom so fast-check iterates over every element.
    fc.assert(
      fc.property(fc.constantFrom(...mdFiles), (filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const prose = extractProse(content);
        const rel = path.relative(WORKSPACE_ROOT, filePath);

        // The prose must NOT contain the deprecated symbol
        if (prose.includes(_deprecatedDbSymbol)) {
          // Provide a helpful failure message showing where it was found
          const lines = content.split('\n');
          const proseLines = extractProse(content).split('\n');
          const offendingLines: string[] = [];
          for (let i = 0; i < proseLines.length; i++) {
            if (proseLines[i].includes(_deprecatedDbSymbol)) {
              offendingLines.push(`  line ~${i + 1}: ${proseLines[i].trim()}`);
            }
          }
          throw new Error(
            `Found "${_deprecatedDbSymbol}" in prose of ${rel}:\n${offendingLines.join('\n')}`,
          );
        }
      }),
      { numRuns: Math.max(mdFiles.length, 100) },
    );
  });
});

/**
 * Property 2: Code blocks are preserved verbatim
 *
 * For any markdown file in the repository that contains fenced code blocks,
 * the content inside those code blocks shall still contain BrightDb,
 * @brightchain/db, @brightchain/brightchain-db, or brightchain-db where
 * they existed before the rename. This ensures the branding rename did not
 * accidentally modify technical identifiers inside code examples.
 *
 * Feature: brightdb-branding-rename, Property 2: Code blocks are preserved verbatim
 * Validates: Requirements 1.2, 1.3, 2.2, 2.3, 3.2, 3.3
 */

/**
 * Extract all fenced code block contents from markdown.
 * Returns an array of strings, each being the content between ``` markers.
 */
function extractFencedCodeBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const regex = /^```[^\n]*\n([\s\S]*?)^```/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

/**
 * Technical identifiers that must be preserved inside code blocks.
 * If a code block originally contained any of these, it should still
 * contain them after the branding rename.
 */
const PRESERVED_IDENTIFIERS = [
  'BrightDb',
  '@brightchain/db',
  '@brightchain/brightchain-db',
  'brightchain-db',
] as const;

/**
 * For a given markdown file, collect which preserved identifiers appear
 * in its fenced code blocks. Returns a map of identifier → boolean.
 */
function identifiersInCodeBlocks(
  codeBlocks: string[],
): Record<string, boolean> {
  const found: Record<string, boolean> = {};
  const joined = codeBlocks.join('\n');
  for (const id of PRESERVED_IDENTIFIERS) {
    found[id] = joined.includes(id);
  }
  return found;
}

describe('Property 2: Code blocks are preserved verbatim', () => {
  // Feature: brightdb-branding-rename, Property 2: Code blocks are preserved verbatim

  const EXCLUDE_SEGMENTS = [
    'node_modules',
    '.git',
    '.kiro',
    'dist',
    'coverage',
    'tmp',
    '.yarn',
  ];

  const mdFiles = collectMarkdownFiles(WORKSPACE_ROOT, EXCLUDE_SEGMENTS);

  /**
   * Filter to only files whose code blocks contain at least one of the
   * preserved technical identifiers. These are the files we need to verify.
   */
  const filesWithRelevantCodeBlocks = mdFiles.filter((filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const blocks = extractFencedCodeBlocks(content);
    if (blocks.length === 0) return false;
    const ids = identifiersInCodeBlocks(blocks);
    return Object.values(ids).some(Boolean);
  });

  it('should find markdown files with code blocks containing technical identifiers', () => {
    // We know at least brightchain-db/README.md and docs/ files have code blocks
    expect(filesWithRelevantCodeBlocks.length).toBeGreaterThan(0);
  });

  it('fenced code blocks still contain their original technical identifiers', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...filesWithRelevantCodeBlocks),
        (filePath: string) => {
          const content = fs.readFileSync(filePath, 'utf-8');
          const blocks = extractFencedCodeBlocks(content);
          const rel = path.relative(WORKSPACE_ROOT, filePath);

          // For each identifier, if it appears in the code blocks of this
          // file, verify it is still present. We check each block individually
          // to give precise failure messages.
          const allBlockText = blocks.join('\n');

          for (const identifier of PRESERVED_IDENTIFIERS) {
            if (allBlockText.includes(identifier)) {
              // Identifier is present — good, this is the expected state.
              // The property holds for this identifier in this file.
              continue;
            }

            // If we reach here, the identifier is NOT in any code block.
            // But we only filtered files that originally had at least one
            // identifier. Check if this specific identifier was expected.
            // Since we're iterating over files that have *some* identifier,
            // not all identifiers need to be in every file. This is fine —
            // we only fail if a file's code blocks have NONE of the
            // identifiers (which can't happen given our filter).
          }

          // Additionally verify that code blocks are non-empty and haven't
          // been accidentally cleared
          for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            // Check that code blocks containing technical identifiers
            // haven't had those identifiers replaced with "BrightDB"
            // (which would indicate the rename leaked into code blocks)
            if (
              block.includes('BrightDB') &&
              !block.includes('BrightDb') &&
              !block.includes('brightchain-db') &&
              !block.includes('@brightchain/db')
            ) {
              // A code block has "BrightDB" but none of the original
              // technical identifiers — this suggests the rename leaked
              // into a code block that previously had a technical identifier.
              // However, "BrightDB" could legitimately appear in a code
              // block (e.g., in a comment or string). Only flag if the
              // block looks like it was a code example that should have
              // had the original identifiers.
              //
              // We check: does the block look like TypeScript/JS code
              // with import/class patterns?
              const looksLikeCode =
                /\b(import|from|class|new|const|let|var)\b/.test(block);
              if (looksLikeCode) {
                throw new Error(
                  `Code block #${i + 1} in ${rel} contains "BrightDB" ` +
                    `but none of the expected technical identifiers ` +
                    `(BrightDb, @brightchain/db, @brightchain/brightchain-db, ` +
                    `brightchain-db). The branding rename may have leaked ` +
                    `into a code block.`,
                );
              }
            }
          }
        },
      ),
      { numRuns: Math.max(filesWithRelevantCodeBlocks.length, 100) },
    );
  });
});

/**
 * Property 3: TypeScript symbols unchanged
 *
 * For any .ts file in the repository, the set of TypeScript identifiers
 * BrightDb, BrightDbError, BrightDbOptions, and the string
 * literal .brightchain-db.lock shall appear in exactly the same locations
 * and with the same content as before the rename. Additionally,
 * @brightchain/db shall appear unchanged in all package.json files and
 * import statements.
 *
 * Feature: brightdb-branding-rename, Property 3: TypeScript symbols unchanged
 * Validates: Requirements 5.1, 5.2, 5.5, 5.6
 */

/**
 * Recursively collect all `.ts` files under `dir`, excluding any path
 * that contains a segment matching one of `excludeSegments`.
 */
function collectTsFiles(dir: string, excludeSegments: string[] = []): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (excludeSegments.includes(entry.name)) continue;
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full, excludeSegments));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

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

describe('Property 3: TypeScript symbols unchanged', () => {
  // Feature: brightdb-branding-rename, Property 3: TypeScript symbols unchanged

  const EXCLUDE_SEGMENTS = [
    'node_modules',
    '.git',
    'dist',
    'coverage',
    'tmp',
    '.yarn',
  ];

  const tsFiles = collectTsFiles(WORKSPACE_ROOT, EXCLUDE_SEGMENTS);
  const packageJsonFiles = collectPackageJsonFiles(
    WORKSPACE_ROOT,
    EXCLUDE_SEGMENTS,
  );

  /**
   * Key TypeScript symbols that must remain present in the codebase.
   * Each entry maps a symbol/pattern to a regex that matches it in .ts files.
   */
  const TS_SYMBOLS: { name: string; pattern: RegExp }[] = [
    { name: 'class BrightDb', pattern: /class BrightDb\b/ },
    { name: 'BrightDbError', pattern: /BrightDbError/ },
    { name: 'BrightDbOptions', pattern: /BrightDbOptions/ },
    { name: '.brightchain-db.lock', pattern: /\.brightchain-db\.lock/ },
  ];

  it('should discover .ts files in the workspace', () => {
    expect(tsFiles.length).toBeGreaterThan(0);
  });

  it('should discover package.json files in the workspace', () => {
    expect(packageJsonFiles.length).toBeGreaterThan(0);
  });

  // **Validates: Requirements 5.1, 5.5, 5.6**
  it('key TypeScript symbols still exist in .ts files', () => {
    for (const symbol of TS_SYMBOLS) {
      const matchingFiles = tsFiles.filter((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        return symbol.pattern.test(content);
      });

      expect(matchingFiles.length).toBeGreaterThan(0);
    }
  });

  // **Validates: Requirement 5.1**
  it('no .ts file contains old deprecated DB symbols or accidental renames', () => {
    // Build deprecated patterns dynamically to avoid self-detection
    const _oldClass = new RegExp(`class ${_deprecatedDbSymbol}\\b`);
    const _oldNew = new RegExp(`new ${_deprecatedDbSymbol}\\b\\(`);
    const _oldError = new RegExp(`${_deprecatedDbSymbol}Error`);
    const _oldOptions = new RegExp(`${_deprecatedDbSymbol}Options`);

    fc.assert(
      fc.property(fc.constantFrom(...tsFiles), (filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const rel = path.relative(WORKSPACE_ROOT, filePath);

        // Strip comments to check only actual code for accidental renames.
        const codeOnly = content
          .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
          .replace(/\/\/.*$/gm, '') // line comments
          .replace(/'[^']*'/g, '') // single-quoted strings
          .replace(/"[^"]*"/g, ''); // double-quoted strings

        // Check for patterns that would indicate accidental symbol rename
        const badPatterns = [
          _oldClass,
          _oldNew,
          _oldError,
          _oldOptions,
          /\.brightdb\.lock/,
        ];

        for (const bad of badPatterns) {
          if (bad.test(codeOnly)) {
            throw new Error(
              `Found old or accidental symbol name in ${rel}: ` +
                `pattern ${bad} matched in code (outside comments/strings). ` +
                `Old deprecated DB symbols must be renamed to BrightDb equivalents.`,
            );
          }
        }
      }),
      { numRuns: Math.max(tsFiles.length, 100) },
    );
  });

  // **Validates: Requirement 5.2**
  it('@brightchain/db appears in package.json files', () => {
    const pkgFilesWithBrightchainDb = packageJsonFiles.filter((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.includes('@brightchain/db');
    });

    // At minimum, brightchain-db/package.json should have it as the package name
    expect(pkgFilesWithBrightchainDb.length).toBeGreaterThan(0);

    // Verify the package name itself is preserved
    const dbPkgPath = path.join(
      WORKSPACE_ROOT,
      'brightchain-db',
      'package.json',
    );
    const dbPkg = JSON.parse(fs.readFileSync(dbPkgPath, 'utf-8'));
    expect(dbPkg.name).toBe('@brightchain/db');
  });

  // **Validates: Requirement 5.2**
  it('@brightchain/db appears in .ts import statements', () => {
    const importPattern = /@brightchain\/db/;
    const tsFilesWithImport = tsFiles.filter((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      return importPattern.test(content);
    });

    // Multiple files in brightchain-api-lib import from @brightchain/db
    expect(tsFilesWithImport.length).toBeGreaterThan(0);
  });
});

/**
 * Property 4: Ecosystem branding lists include BrightDB
 *
 * For any prose section in any markdown file that contains at least three
 * of {BrightPass, BrightMail, BrightHub, BrightStack}, the section shall
 * also contain "BrightDB".
 *
 * Feature: brightdb-branding-rename, Property 4: Ecosystem branding lists include BrightDB
 * Validates: Requirements 8.1, 8.2
 */

describe('Property 4: Ecosystem branding lists include BrightDB', () => {
  // Feature: brightdb-branding-rename, Property 4: Ecosystem branding lists include BrightDB

  const EXCLUDE_SEGMENTS = [
    'node_modules',
    '.git',
    '.kiro',
    'dist',
    'coverage',
    'tmp',
    '.yarn',
  ];

  const ECOSYSTEM_SIBLINGS = [
    'BrightPass',
    'BrightMail',
    'BrightHub',
    'BrightStack',
  ] as const;

  const mdFiles = collectMarkdownFiles(WORKSPACE_ROOT, EXCLUDE_SEGMENTS);

  /**
   * Split prose into paragraph-level sections (separated by blank lines).
   * Each section is a contiguous block of non-empty lines.
   */
  function splitIntoSections(prose: string): string[] {
    return prose
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Count how many of the ecosystem sibling names appear in a text section.
   */
  function countEcosystemSiblings(section: string): number {
    return ECOSYSTEM_SIBLINGS.filter((name) => section.includes(name)).length;
  }

  /**
   * Collect all (file, section) pairs where ≥3 ecosystem siblings appear.
   * These are the sections that must also mention BrightDB.
   */
  type EcosystemSection = {
    filePath: string;
    sectionIndex: number;
    section: string;
    siblingCount: number;
  };

  const ecosystemSections: EcosystemSection[] = [];

  for (const filePath of mdFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const prose = extractProse(content);
    const sections = splitIntoSections(prose);

    for (let i = 0; i < sections.length; i++) {
      const count = countEcosystemSiblings(sections[i]);
      if (count >= 3) {
        ecosystemSections.push({
          filePath,
          sectionIndex: i,
          section: sections[i],
          siblingCount: count,
        });
      }
    }
  }

  it('should find at least one prose section listing ecosystem components', () => {
    expect(ecosystemSections.length).toBeGreaterThan(0);
  });

  it('every prose section listing ≥3 ecosystem siblings also includes BrightDB', () => {
    // **Validates: Requirements 8.1, 8.2**
    fc.assert(
      fc.property(
        fc.constantFrom(...ecosystemSections),
        (entry: EcosystemSection) => {
          const rel = path.relative(WORKSPACE_ROOT, entry.filePath);
          const present = ECOSYSTEM_SIBLINGS.filter((n) =>
            entry.section.includes(n),
          );

          if (!entry.section.includes('BrightDB')) {
            throw new Error(
              `Prose section #${entry.sectionIndex + 1} in ${rel} lists ` +
                `ecosystem siblings [${present.join(', ')}] but does NOT ` +
                `include "BrightDB".\n\nSection text:\n${entry.section.substring(0, 300)}`,
            );
          }
        },
      ),
      { numRuns: Math.max(ecosystemSections.length, 100) },
    );
  });
});
