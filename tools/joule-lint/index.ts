#!/usr/bin/env node
/**
 * @fileoverview joule-lint — CI guard that ensures every controller route
 * handler in `brightchain-api-lib` has a `@Cost` decorator.
 *
 * ## What it checks
 *
 * Scans every `.ts` file under `brightchain-api-lib/src/lib/controllers/`
 * and reports any method that:
 *   1. Is a `handle*` or any method registered as a handler via `routeConfig`,
 *      AND
 *   2. Does NOT have a `@Cost(...)` decorator immediately preceding it.
 *
 * For simplicity the tool uses a regex heuristic over the raw source text
 * rather than full TypeScript AST parsing, which avoids a heavy TypeScript
 * compiler dependency and makes the tool fast in CI.
 *
 * The heuristic is:
 *   - Find any method declaration matching `/^\s*(private|public|protected)?\s*(?:async\s+)?handle\w+\s*\(/m`
 *   - Walk backwards through the immediately preceding non-blank lines.
 *   - Accept the handler as decorated if any line matches `/@Cost\s*\(/`.
 *
 * ## Exit codes
 *
 *   0 — all handlers are decorated with `@Cost`
 *   1 — one or more handlers are missing `@Cost`
 *   2 — usage error or IO error
 *
 * @see joule-resource-credits spec, Requirement 9.5
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../brightchain-api-lib/src/lib/controllers',
);

/**
 * Patterns for identifying route handler methods.
 * A line is a "handler" if it matches this pattern.
 */
const HANDLER_PATTERN =
  /^\s*(?:private|public|protected)?\s*(?:async\s+)?handle\w+\s*\(/;

/**
 * Pattern that must appear in the lines immediately preceding a handler to
 * consider it decorated.
 */
const COST_DECORATOR_PATTERN = /@Cost\s*\(/;

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/**
 * Recursively collect all `.ts` files under `dir`.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.d.ts')
    ) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

interface IViolation {
  file: string;
  line: number;
  methodName: string;
}

/**
 * Scan a single source file and return any handlers missing `@Cost`.
 */
function scanFile(filePath: string): IViolation[] {
  const source = fs.readFileSync(filePath, 'utf-8');
  const lines = source.split('\n');
  const violations: IViolation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!HANDLER_PATTERN.test(line)) continue;

    // Extract method name for reporting
    const nameMatch = /handle(\w+)\s*\(/.exec(line);
    const methodName = nameMatch ? `handle${nameMatch[1]}` : '<unknown>';

    // Walk backwards through non-blank preceding lines looking for @Cost
    let decorated = false;
    for (let j = i - 1; j >= 0; j--) {
      const prev = lines[j].trim();
      if (
        prev === '' ||
        prev === '*/' ||
        prev.startsWith('//') ||
        prev.startsWith('*')
      ) {
        // Skip blank lines and comment lines — decorator can appear after
        // JSDoc block.
        if (prev === '') continue;
        // But stop searching if we hit a non-decorator, non-comment line
        // (e.g., the end of a previous method body).
        if (
          !prev.startsWith('*') &&
          !prev.startsWith('//') &&
          !prev.startsWith('/*') &&
          !prev.startsWith('@') &&
          !prev.endsWith('*/')
        ) {
          break;
        }
        continue;
      }
      if (COST_DECORATOR_PATTERN.test(prev)) {
        decorated = true;
        break;
      }
      // Stop at the first non-decorator, non-comment line above the method
      if (!prev.startsWith('@')) {
        break;
      }
    }

    if (!decorated) {
      violations.push({ file: filePath, line: i + 1, methodName });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  if (!fs.existsSync(PROJECT_ROOT)) {
    console.error(
      `[joule-lint] Controller directory not found: ${PROJECT_ROOT}`,
    );
    process.exit(2);
  }

  const files = collectTsFiles(PROJECT_ROOT);
  const allViolations: IViolation[] = [];

  for (const file of files) {
    const violations = scanFile(file);
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log(
      '[joule-lint] ✓ All controller handlers have @Cost decorators.',
    );
    process.exit(0);
  }

  console.error(
    `[joule-lint] ✗ Found ${allViolations.length} handler(s) missing @Cost decorator:\n`,
  );
  for (const v of allViolations) {
    const rel = path.relative(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..'),
      v.file,
    );
    console.error(`  ${rel}:${v.line}  ${v.methodName}()`);
  }
  console.error(
    '\nEvery route handler MUST declare its cost category with @Cost().' +
      '\nSee brightchain-api-lib/src/lib/joule/costDecorator.ts for usage.',
  );
  process.exit(1);
}

main();
