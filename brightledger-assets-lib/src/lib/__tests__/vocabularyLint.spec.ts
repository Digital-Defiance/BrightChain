/**
 * @fileoverview Brand vocabulary lint — scans all brightledger-assets-* source
 * files (and compiled *.d.ts declarations when they exist) for forbidden terms.
 *
 * Forbidden: coin, holder, tokenomics, airdrop, staking, marketCap
 * Rationale: Requirements 8.1, 8.3, 8.4
 *
 * The test passes when zero violations are found.  It reads the source files
 * directly so it runs without a prior build step; the companion markdown check
 * (`scripts/check-assets-vocabulary.sh`) covers *.md files.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Configuration ────────────────────────────────────────────────────────────

/** Compiled regex for all forbidden terms. */
const FORBIDDEN_RE = /\b(coin|holder|tokenomics|airdrop|staking|marketCap)\b/gi;

/** Root of the monorepo (three levels up from this file's __tests__ dir). */
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../../');

/** Files to exclude from the vocabulary scan (e.g., this file itself). */
const EXCLUDED_FILES = new Set([
  path.resolve(__dirname, 'vocabularyLint.spec.ts'),
]);

/** Asset-scoped source directories to scan. */
const SCAN_ROOTS = [
  path.join(WORKSPACE_ROOT, 'brightledger-assets-lib', 'src'),
  path.join(WORKSPACE_ROOT, 'brightledger-assets-api-lib', 'src'),
  // React components lib is added when scaffolded (Phase 6.4)
  path.join(WORKSPACE_ROOT, 'brightledger-assets-react-components', 'src'),
];

/** Also scan dist declarations if they exist. */
const DIST_ROOTS = [
  path.join(WORKSPACE_ROOT, 'dist', 'brightledger-assets-lib'),
  path.join(WORKSPACE_ROOT, 'dist', 'brightledger-assets-api-lib'),
  path.join(WORKSPACE_ROOT, 'dist', 'brightledger-assets-react-components'),
];

// ── File walker ──────────────────────────────────────────────────────────────

function walkFiles(dir: string, extensions: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, dist, coverage, .nx
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'coverage' ||
        entry.name === '.nx'
      ) {
        continue;
      }
      results.push(...walkFiles(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      if (!EXCLUDED_FILES.has(full)) {
        results.push(full);
      }
    }
  }
  return results;
}

// ── Violation collector ───────────────────────────────────────────────────────

interface IViolation {
  file: string;
  line: number;
  column: number;
  term: string;
  snippet: string;
}

function scanFile(filePath: string): IViolation[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const violations: IViolation[] = [];
  const lines = content.split('\n');
  lines.forEach((line, lineIdx) => {
    // Skip single-line and block comments that are whitelisted documentation
    // (We still flag violations in code comments to enforce the discipline.)
    const lineRe = new RegExp(FORBIDDEN_RE.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: lineIdx + 1,
        column: m.index + 1,
        term: m[0],
        snippet: line.trim().slice(0, 120),
      });
    }
  });
  return violations;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Brand vocabulary lint', () => {
  let sourceViolations: IViolation[];
  let distViolations: IViolation[];

  beforeAll(() => {
    // Collect source violations (.ts / .tsx files)
    const sourceFiles: string[] = [];
    for (const root of SCAN_ROOTS) {
      sourceFiles.push(...walkFiles(root, ['.ts', '.tsx']));
    }
    sourceViolations = sourceFiles.flatMap(scanFile);

    // Collect declaration violations (*.d.ts only — public API surface)
    const distFiles: string[] = [];
    for (const root of DIST_ROOTS) {
      distFiles.push(...walkFiles(root, ['.d.ts']));
    }
    distViolations = distFiles.flatMap(scanFile);
  });

  test('no source files contain forbidden vocabulary terms', () => {
    if (sourceViolations.length > 0) {
      const report = sourceViolations
        .map(
          (v) =>
            `  ${path.relative(WORKSPACE_ROOT, v.file)}:${v.line}:${v.column} — "${v.term}"\n    ${v.snippet}`,
        )
        .join('\n');
      throw new Error(
        `Found ${sourceViolations.length} forbidden vocabulary violation(s):\n${report}\n\nForbidden: coin, holder, tokenomics, airdrop, staking, marketCap\nAllowed: issue, transfer, burn, freeze, attest, asset, account, balance, entry, receipt`,
      );
    }
    expect(sourceViolations).toHaveLength(0);
  });

  test('no compiled *.d.ts files expose forbidden vocabulary in public API', () => {
    if (distViolations.length > 0) {
      const report = distViolations
        .map(
          (v) =>
            `  ${path.relative(WORKSPACE_ROOT, v.file)}:${v.line}:${v.column} — "${v.term}"\n    ${v.snippet}`,
        )
        .join('\n');
      throw new Error(
        `Found ${distViolations.length} forbidden vocabulary violation(s) in compiled declarations:\n${report}`,
      );
    }
    expect(distViolations).toHaveLength(0);
  });
});
