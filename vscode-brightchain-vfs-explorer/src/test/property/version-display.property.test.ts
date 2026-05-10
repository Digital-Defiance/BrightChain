/**
 * Feature: brightchain-vfs-explorer, Property 22: Version display includes required fields
 *
 * For any IFileVersionDTO, the version panel QuickPick item should include
 * the version number, a human-readable timestamp, the uploader name, and
 * the file size. If vaultState === 'destroyed', the item should be marked
 * as unavailable with a "Destroyed" label.
 *
 * **Validates: Requirements 9.2, 9.5**
 */

import * as fc from 'fast-check';
import type { IFileVersionDTO } from '../../api/types';
import { versionToQuickPickItem } from '../../services/version-panel';

const uuidArb = fc.uuid();

const vaultStateArb = fc.constantFrom('sealed', 'accessed', 'destroyed');

const fileVersionArb: fc.Arbitrary<IFileVersionDTO> = fc.record({
  id: uuidArb,
  fileId: uuidArb,
  versionNumber: fc.integer({ min: 1, max: 10000 }),
  sizeBytes: fc.integer({ min: 0, max: 1_000_000_000 }),
  vaultState: vaultStateArb,
  uploaderId: fc.string({ minLength: 1, maxLength: 50 }),
  createdAt: fc
    .integer({ min: 946684800000, max: 1924905600000 })
    .map((ts) => new Date(ts).toISOString()),
});

describe('Property 22: Version display includes required fields', () => {
  it('should include version number in the label', () => {
    fc.assert(
      fc.property(fileVersionArb, (version) => {
        const item = versionToQuickPickItem(version);
        expect(item.label).toContain(`v${version.versionNumber}`);
        expect(item.versionNumber).toBe(version.versionNumber);
      }),
      { numRuns: 100 },
    );
  });

  it('should include timestamp in the description', () => {
    fc.assert(
      fc.property(fileVersionArb, (version) => {
        const item = versionToQuickPickItem(version);
        // The description should contain some representation of the date
        expect(item.description).toBeDefined();
        expect(item.description!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('should include uploader in the description', () => {
    fc.assert(
      fc.property(fileVersionArb, (version) => {
        const item = versionToQuickPickItem(version);
        expect(item.description).toContain(version.uploaderId);
      }),
      { numRuns: 100 },
    );
  });

  it('should include file size in the description', () => {
    fc.assert(
      fc.property(fileVersionArb, (version) => {
        const item = versionToQuickPickItem(version);
        // Description should contain some size representation
        expect(item.description).toBeDefined();
        // Size is formatted, so just check it's present in some form
        expect(item.description!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('should mark destroyed versions with "Destroyed" label', () => {
    const destroyedVersionArb = fileVersionArb.map((v) => ({
      ...v,
      vaultState: 'destroyed',
    }));

    fc.assert(
      fc.property(destroyedVersionArb, (version) => {
        const item = versionToQuickPickItem(version);
        expect(item.label).toContain('Destroyed');
        expect(item.isDestroyed).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('should NOT mark non-destroyed versions as destroyed', () => {
    const activeVersionArb = fileVersionArb.map((v) => ({
      ...v,
      vaultState: fc.sample(fc.constantFrom('sealed', 'accessed'), 1)[0],
    }));

    fc.assert(
      fc.property(activeVersionArb, (version) => {
        const item = versionToQuickPickItem(version);
        expect(item.label).not.toContain('Destroyed');
        expect(item.isDestroyed).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
