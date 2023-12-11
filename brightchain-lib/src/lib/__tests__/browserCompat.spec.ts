import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

/**
 * Browser compatibility tests for brightchain-lib.
 *
 * These tests verify that brightchain-lib remains browser-compatible by:
 * 1. Scanning interface files for Node.js-specific top-level imports
 * 2. Scanning interface files for Buffer type usage
 * 3. Running the esbuild browser build verification
 * 4. Verifying platform-specific documentation exists
 *
 * Validates: Requirements 18.1, 18.3, 18.6
 */

const LIB_ROOT = join(__dirname, '..', '..', '..');
const INTERFACES_DIR = join(LIB_ROOT, 'src', 'lib', 'interfaces');
const BROWSER_COMPAT_MD = join(LIB_ROOT, 'BROWSER_COMPAT.md');

/** Forbidden Node.js-specific modules that must not appear as top-level imports */
const FORBIDDEN_NODE_MODULES = [
  'fs',
  'path',
  'crypto',
  'os',
  'net',
  'child_process',
  'buffer',
];

/**
 * Recursively collect all .ts files under a directory, excluding spec/test files.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.includes('.spec.') &&
      !entry.name.includes('.test.')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('brightchain-lib browser compatibility', () => {
  const interfaceFiles = collectTsFiles(INTERFACES_DIR);

  describe('No Node.js-specific top-level imports in interface files', () => {
    // Regex matches: import ... from 'module' or import 'module' or require('module')
    // at the top level (not inside functions/conditionals).
    // We look for lines starting with import/require that reference forbidden modules.
    const topLevelImportPattern = new RegExp(
      `^\\s*import\\s+.*\\bfrom\\s+['"](?:node:)?(?:${FORBIDDEN_NODE_MODULES.join('|')})(?:/.*)?['"]` +
        `|^\\s*import\\s+['"](?:node:)?(?:${FORBIDDEN_NODE_MODULES.join('|')})(?:/.*)?['"]` +
        `|^\\s*(?:const|let|var)\\s+.*=\\s*require\\s*\\(\\s*['"](?:node:)?(?:${FORBIDDEN_NODE_MODULES.join('|')})(?:/.*)?['"]\\s*\\)`,
      'm',
    );

    it('should have interface files to scan', () => {
      expect(interfaceFiles.length).toBeGreaterThan(0);
    });

    it('should not have top-level Node.js imports in any interface file', () => {
      const violations: Array<{ file: string; line: string }> = [];

      for (const filePath of interfaceFiles) {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          if (topLevelImportPattern.test(line)) {
            violations.push({
              file: relative(LIB_ROOT, filePath),
              line: line.trim(),
            });
          }
        }
      }

      expect(violations).toHaveLength(0);
      if (violations.length > 0) {
        const report = violations
          .map((v) => `  ${v.file}: ${v.line}`)
          .join('\n');
        console.error(
          `Found ${violations.length} Node.js-specific top-level import(s):\n${report}`,
        );
      }
    });
  });

  describe('No Buffer type in interface definitions', () => {
    // Match standalone Buffer used as a type annotation.
    // Uses negative lookbehind (?<![A-Za-z]) to avoid matching SecureBuffer,
    // GuidV4Buffer, etc. Patterns matched:
    //   : Buffer, Buffer[], Buffer |, | Buffer, <Buffer>, , Buffer
    const bufferTypePattern =
      /(?<![A-Za-z])Buffer(?:\s*\[\s*\]|\s*\||\s*>|\s*,|\s*;|\s*$)|\|\s*Buffer\b|:\s*Buffer\b/;

    // Lines/context containing these markers are excluded (deprecated / platform-specific)
    const exclusionMarkers = [
      '@deprecated',
      '@platform',
      'DEPRECATED',
      '// deprecated',
    ];

    // Files with known platform-specific Buffer usage that is documented
    // in BROWSER_COMPAT.md or uses external Node.js-oriented type libraries.
    // These are backend-facing operational interfaces, not shared data interfaces.
    const KNOWN_BUFFER_FILES = new Set([
      'src/lib/interfaces/member/operational.ts',
    ]);

    it('should not use Buffer as a type in interface files', () => {
      const violations: Array<{ file: string; lineNum: number; line: string }> =
        [];

      for (const filePath of interfaceFiles) {
        const relPath = relative(LIB_ROOT, filePath);

        // Skip files with known, documented platform-specific Buffer usage
        if (KNOWN_BUFFER_FILES.has(relPath)) {
          continue;
        }

        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip comment-only lines
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            continue;
          }
          // Skip lines with exclusion markers (deprecated / platform-specific)
          if (exclusionMarkers.some((marker) => line.includes(marker))) {
            continue;
          }
          // Check surrounding context (previous 3 lines) for deprecation markers
          const contextStart = Math.max(0, i - 3);
          const context = lines.slice(contextStart, i).join('\n');
          if (exclusionMarkers.some((marker) => context.includes(marker))) {
            continue;
          }

          if (bufferTypePattern.test(line)) {
            violations.push({
              file: relPath,
              lineNum: i + 1,
              line: line.trim(),
            });
          }
        }
      }

      expect(violations).toHaveLength(0);
      if (violations.length > 0) {
        const report = violations
          .map((v) => `  ${v.file}:${v.lineNum}: ${v.line}`)
          .join('\n');
        console.error(
          `Found ${violations.length} Buffer type usage(s) (use Uint8Array instead):\n${report}`,
        );
      }
    });
  });

  describe('Browser build verification', () => {
    it('should pass the esbuild browser build verification', () => {
      const scriptPath = join(LIB_ROOT, 'scripts', 'verify-browser-build.mjs');
      expect(existsSync(scriptPath)).toBe(true);

      // Run the verification script from the workspace root
      const workspaceRoot = join(LIB_ROOT, '..');
      const output = execSync(`node ${scriptPath}`, {
        cwd: workspaceRoot,
        encoding: 'utf-8',
        timeout: 30_000,
      });

      expect(output).toContain('PASSED');
    });
  });

  describe('Platform-specific files are documented', () => {
    it('should have a BROWSER_COMPAT.md file', () => {
      expect(existsSync(BROWSER_COMPAT_MD)).toBe(true);
    });

    it('should document known platform-specific files', () => {
      const content = readFileSync(BROWSER_COMPAT_MD, 'utf-8');

      // The doc should mention the known platform-specific files
      expect(content).toContain('platformCrypto.ts');
      expect(content).toContain('Known Platform-Specific Files');
    });
  });
});
