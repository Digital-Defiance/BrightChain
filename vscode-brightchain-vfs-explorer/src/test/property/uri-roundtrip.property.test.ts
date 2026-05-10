/**
 * Feature: brightchain-vfs-explorer, Property 1: URI round-trip encoding
 *
 * For any valid file ID (UUID string) and file name (non-empty string),
 * encoding them into a `brightchain://` URI via `toFileUri` and then parsing
 * back via `parseBrightchainUri` should produce the original file ID and file
 * name. Similarly, for any valid folder ID, `toFolderUri` →
 * `parseBrightchainUri` should recover the original folder ID with type
 * `'folder'`.
 *
 * **Validates: Requirements 6.1, 6.2, 6.4, 6.5**
 */

import fc from 'fast-check';
import { parseBrightchainUri, toFileUri, toFolderUri } from '../../util/uri';

/**
 * Arbitrary for file names: non-empty strings that do not contain '/'
 * (which would break path segments) and survive a URI encode/decode
 * round-trip through the URL constructor used by the vscode mock.
 *
 * We use printable ASCII characters excluding '/' and filter out names
 * that would be empty or altered after the encode → URL parse → decode
 * cycle.
 */
const validFileName: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => !s.includes('/'))
  .filter((s) => s !== '.' && s !== '..')
  .filter((s) => {
    // Filter out strings that don't survive the URI round-trip.
    // The URL constructor may interpret '#' and '?' as fragment/query
    // delimiters even after encodeURIComponent, depending on the mock.
    try {
      const encoded = encodeURIComponent(s);
      const decoded = decodeURIComponent(encoded);
      return decoded === s && encoded.length > 0;
    } catch {
      return false;
    }
  });

describe('Property 1: URI round-trip encoding', () => {
  it('toFileUri → parseBrightchainUri recovers original file ID and name', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        validFileName,
        (fileId: string, fileName: string) => {
          const uri = toFileUri(fileId, fileName);
          const parsed = parseBrightchainUri(uri);

          expect(parsed.type).toBe('file');
          expect(parsed.id).toBe(fileId);
          expect(parsed.name).toBe(fileName);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('toFolderUri → parseBrightchainUri recovers original folder ID with type folder', () => {
    fc.assert(
      fc.property(fc.uuid(), (folderId: string) => {
        const uri = toFolderUri(folderId);
        const parsed = parseBrightchainUri(uri);

        expect(parsed.type).toBe('folder');
        expect(parsed.id).toBe(folderId);
      }),
      { numRuns: 100 },
    );
  });

  it('file URI authority is always "files"', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        validFileName,
        (fileId: string, fileName: string) => {
          const uri = toFileUri(fileId, fileName);
          expect(uri.authority).toBe('files');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('folder URI authority is always "folders"', () => {
    fc.assert(
      fc.property(fc.uuid(), (folderId: string) => {
        const uri = toFolderUri(folderId);
        expect(uri.authority).toBe('folders');
      }),
      { numRuns: 100 },
    );
  });
});
