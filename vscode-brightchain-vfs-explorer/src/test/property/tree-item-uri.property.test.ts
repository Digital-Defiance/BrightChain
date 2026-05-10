/**
 * Feature: brightchain-vfs-explorer, Property 13: File tree items produce correct open-file URIs
 *
 * For any file metadata (fileId, fileName), the `BrightchainTreeItem`
 * constructed for it should have a `command` whose arguments include a
 * `brightchain://files/{fileId}/{fileName}` URI.
 *
 * **Validates: Requirements 5.4, 10.3**
 */

import fc from 'fast-check';
import { BrightchainTreeItem } from '../../providers/tree-item';
import { parseBrightchainUri } from '../../util/uri';

/**
 * Arbitrary for file names: non-empty strings without '/' that survive
 * a URI encode/decode round-trip.
 */
const validFileName: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => !s.includes('/'))
  .filter((s) => {
    try {
      const encoded = encodeURIComponent(s);
      const decoded = decodeURIComponent(encoded);
      return decoded === s && encoded.length > 0;
    } catch {
      return false;
    }
  });

describe('Property 13: File tree items produce correct open-file URIs', () => {
  it('file tree item command arguments contain a brightchain://files/{fileId}/{fileName} URI', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        validFileName,
        (fileId: string, fileName: string) => {
          const item = new BrightchainTreeItem('file', fileId, fileName);

          // File items must have a command
          expect(item.command).toBeDefined();
          expect(item.command!.command).toBe('vscode.open');
          expect(item.command!.arguments).toBeDefined();
          expect(item.command!.arguments!.length).toBeGreaterThanOrEqual(1);

          // The first argument should be a URI with the correct scheme and structure
          const uri = item.command!.arguments![0];
          expect(uri.scheme).toBe('brightchain');
          expect(uri.authority).toBe('files');

          // Parse the URI and verify it recovers the original fileId and fileName
          const parsed = parseBrightchainUri(uri);
          expect(parsed.type).toBe('file');
          expect(parsed.id).toBe(fileId);
          expect(parsed.name).toBe(fileName);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('folder tree items do not have an open-file command', () => {
    fc.assert(
      fc.property(fc.uuid(), (folderId: string) => {
        const item = new BrightchainTreeItem('folder', folderId, 'SomeFolder');

        // Folder items should not have a command set
        expect(item.command).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});
