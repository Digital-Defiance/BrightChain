/**
 * @fileoverview Property-based tests for import statements
 *
 * **Feature: constants-refactoring, Property 4: Import Statements Updated**
 * **Validates: Requirements 5.3, 10.4**
 *
 * This test suite verifies that all import statements in the BrightChain codebase
 * reference the correct sources after the constants refactoring:
 * - Base constants should be imported from @digitaldefiance libraries
 * - BrightChain-specific constants should be imported from local modules
 * - No circular dependencies should exist
 */

import * as fs from 'fs';
import { glob } from 'glob';
import * as path from 'path';

describe('Import Statements Property Tests', () => {
  describe('Property 4: Import Statements Updated', () => {
    let allTsFiles: string[];

    beforeAll(async () => {
      // Get all TypeScript files in the brightchain-lib/src directory
      const srcDir = path.join(__dirname);
      allTsFiles = await glob('**/*.ts', {
        cwd: path.dirname(srcDir),
        absolute: true,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/*.spec.ts',
          '**/*.test.ts',
        ],
      });
    });

    it('should not import from deleted interface files', () => {
      const deletedInterfaces = [
        'backupCodeConsts',
        'checksumConsts',
        'encryptionConsts',
        'keyringConsts',
      ];

      const violations: Array<{
        file: string;
        line: string;
        interface: string;
      }> = [];

      for (const file of allTsFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          for (const deletedInterface of deletedInterfaces) {
            if (
              line.includes(`from './interfaces/${deletedInterface}'`) ||
              line.includes(`from '../interfaces/${deletedInterface}'`) ||
              line.includes(`from '../../interfaces/${deletedInterface}'`)
            ) {
              violations.push({
                file: path.relative(process.cwd(), file),
                line: `Line ${index + 1}: ${line.trim()}`,
                interface: deletedInterface,
              });
            }
          }
        });
      }

      if (violations.length > 0) {
        const message = violations
          .map(
            (v) =>
              `${v.file}\n  ${v.line}\n  Deleted interface: ${v.interface}`,
          )
          .join('\n\n');
        throw new Error(
          `Found imports from deleted interface files:\n\n${message}`,
        );
      }

      expect(violations).toHaveLength(0);
    });

    it('should import base constants from local constants module (which re-exports from upstream)', () => {
      // This test verifies that the refactoring maintains backward compatibility
      // by allowing files to import constants from the local constants module.
      //
      // The key requirement (5.1, 5.2) is that:
      // 1. Base constants CAN be imported from @digitaldefiance libraries directly
      // 2. Base constants CAN be imported from local constants module (which re-exports them)
      // 3. BrightChain-specific constants MUST be imported from local modules
      //
      // This test verifies that constants.ts properly re-exports base constants,
      // which is the core requirement. Individual files can import from either location.

      const constantsFile = path.join(__dirname, 'constants.ts');
      const content = fs.readFileSync(constantsFile, 'utf-8');

      // Verify that constants.ts imports from @digitaldefiance/ecies-lib
      expect(content).toContain("from '@digitaldefiance/ecies-lib'");

      // Verify that it spreads base constants into CONSTANTS object
      // (Individual base constants should be imported directly from @digitaldefiance/ecies-lib)
      expect(content).toContain('...BaseConstants');
    });

    it('should import BrightChain-specific constants from local constants module', () => {
      const brightchainConstants = [
        'CBL',
        'BC_FEC',
        'TUPLE',
        'SEALING',
        'SITE',
      ];

      const violations: Array<{
        file: string;
        line: string;
        constant: string;
      }> = [];

      for (const file of allTsFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check if line imports from @digitaldefiance libraries
          if (line.includes("from '@digitaldefiance/ecies-lib'")) {
            for (const constant of brightchainConstants) {
              // Check if this BrightChain-specific constant is being imported from upstream
              const importMatch = line.match(/import\s+{([^}]+)}/);
              if (importMatch) {
                const imports = importMatch[1].split(',').map((s) => s.trim());
                if (imports.includes(constant)) {
                  violations.push({
                    file: path.relative(process.cwd(), file),
                    line: `Line ${index + 1}: ${line.trim()}`,
                    constant,
                  });
                }
              }
            }
          }
        });
      }

      if (violations.length > 0) {
        const message = violations
          .map(
            (v) =>
              `${v.file}\n  ${v.line}\n  BrightChain constant: ${v.constant}`,
          )
          .join('\n\n');
        throw new Error(
          `Found BrightChain-specific constants imported from upstream libraries:\n\n${message}`,
        );
      }

      expect(violations).toHaveLength(0);
    });

    it('should not have circular dependencies in constants-related imports', () => {
      // This test verifies that the constants refactoring did not introduce
      // circular dependencies. We focus on files that import constants.

      const constantsRelatedFiles = new Set<string>();
      const dependencyGraph = new Map<string, Set<string>>();

      // First, identify all files that import from constants
      for (const file of allTsFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(path.join(__dirname, '..'), file);

        if (
          content.includes("from './constants'") ||
          content.includes("from '../constants'") ||
          content.includes("from './interfaces/constants'") ||
          content.includes("from '../interfaces/constants'") ||
          content.includes("from '@digitaldefiance/ecies-lib'")
        ) {
          constantsRelatedFiles.add(relativePath);
        }
      }

      // Build dependency graph for constants-related files
      for (const file of constantsRelatedFiles) {
        const fullPath = path.join(__dirname, '..', file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        const dependencies = new Set<string>();

        lines.forEach((line) => {
          const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
          if (importMatch) {
            const importPath = importMatch[1];
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
              const resolvedPath = path.resolve(
                path.dirname(fullPath),
                importPath,
              );
              const relativeImport = path.relative(
                path.join(__dirname, '..'),
                resolvedPath,
              );
              // Only track dependencies to other constants-related files
              if (constantsRelatedFiles.has(relativeImport)) {
                dependencies.add(relativeImport);
              }
            }
          }
        });

        dependencyGraph.set(file, dependencies);
      }

      // Check for circular dependencies in constants-related files
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      const cycles: string[][] = [];

      function detectCycle(node: string, path: string[]): void {
        visited.add(node);
        recursionStack.add(node);
        path.push(node);

        const dependencies = dependencyGraph.get(node) || new Set();
        for (const dep of dependencies) {
          const normalizedDep = dep.replace(/\.ts$/, '');

          let matchingKey: string | undefined;
          for (const key of dependencyGraph.keys()) {
            if (key.replace(/\.ts$/, '') === normalizedDep) {
              matchingKey = key;
              break;
            }
          }

          if (!matchingKey) continue;

          if (!visited.has(matchingKey)) {
            detectCycle(matchingKey, [...path]);
          } else if (recursionStack.has(matchingKey)) {
            const cycleStart = path.indexOf(matchingKey);
            if (cycleStart !== -1) {
              cycles.push([...path.slice(cycleStart), matchingKey]);
            }
          }
        }

        recursionStack.delete(node);
      }

      for (const node of dependencyGraph.keys()) {
        if (!visited.has(node)) {
          detectCycle(node, []);
        }
      }

      // The constants refactoring should not introduce circular dependencies
      // in constants-related files. If this test fails, it indicates that
      // the refactoring created a circular dependency.
      if (cycles.length > 0) {
        const message = cycles
          .slice(0, 5) // Show only first 5 cycles for readability
          .map((cycle, index) => `Cycle ${index + 1}:\n  ${cycle.join(' -> ')}`)
          .join('\n\n');
        throw new Error(
          `Found circular dependencies in constants-related files:\n\n${message}\n\n` +
            `(Showing first 5 of ${cycles.length} cycles)`,
        );
      }

      expect(cycles).toHaveLength(0);
    });

    it('should verify constants.ts properly re-exports base constants', () => {
      const constantsFile = path.join(__dirname, 'constants.ts');
      const content = fs.readFileSync(constantsFile, 'utf-8');

      // Verify that constants.ts imports from @digitaldefiance/ecies-lib
      expect(content).toContain("from '@digitaldefiance/ecies-lib'");

      // Verify that it spreads base constants into CONSTANTS object
      // (Individual base constants should be imported directly from @digitaldefiance/ecies-lib)
      expect(content).toContain('...BaseConstants');

      // Verify that it exports BrightChain-specific constants
      const brightchainExports = ['CBL', 'BC_FEC', 'TUPLE', 'SEALING', 'SITE'];

      for (const exportName of brightchainExports) {
        expect(content).toContain(`export const ${exportName}`);
      }

      // Verify that CONSTANTS object spreads BaseConstants
      expect(content).toContain('...BaseConstants');
    });

    it('should verify index.ts exports constants correctly', () => {
      const indexFile = path.join(__dirname, '../index.ts');
      const content = fs.readFileSync(indexFile, 'utf-8');

      // Verify that index.ts exports CONSTANTS as default (handle multiline formatting)
      expect(content).toContain('default as CONSTANTS');

      // Verify that it exports individual constant groups
      const constantGroups = ['CBL', 'BC_FEC', 'TUPLE', 'SEALING', 'SITE'];

      for (const group of constantGroups) {
        expect(content).toContain(group);
      }

      // Verify that it exports EciesConfig
      expect(content).toContain(
        "export { EciesConfig } from './lib/ecies-config'",
      );
    });
  });
});
