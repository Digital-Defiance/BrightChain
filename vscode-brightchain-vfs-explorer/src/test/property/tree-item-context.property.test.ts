/**
 * Feature: brightchain-vfs-explorer, Property 14: Tree items have correct contextValue for menus
 *
 * For any file metadata, the tree item should have
 * `contextValue === 'brightchain-file'`. For any folder metadata, the tree
 * item should have `contextValue === 'brightchain-folder'`.
 *
 * **Validates: Requirements 5.3, 5.6, 5.7**
 */

import fc from 'fast-check';
import { TreeItemCollapsibleState } from 'vscode';
import { BrightchainTreeItem } from '../../providers/tree-item';

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

/** Arbitrary for optional MIME types */
const optionalMimeType: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constantFrom(
    'application/pdf',
    'text/plain',
    'image/png',
    'application/json',
    'text/html',
  ),
);

/** Arbitrary for optional parent folder IDs */
const optionalParentFolderId: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.uuid(),
);

describe('Property 14: Tree items have correct contextValue for menus', () => {
  it('file items have contextValue "brightchain-file"', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        validFileName,
        optionalMimeType,
        optionalParentFolderId,
        (
          fileId: string,
          fileName: string,
          mimeType?: string,
          parentFolderId?: string,
        ) => {
          const item = new BrightchainTreeItem(
            'file',
            fileId,
            fileName,
            mimeType,
            parentFolderId,
          );

          expect(item.contextValue).toBe('brightchain-file');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('folder items have contextValue "brightchain-folder"', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        validFileName,
        optionalParentFolderId,
        (folderId: string, folderName: string, parentFolderId?: string) => {
          const item = new BrightchainTreeItem(
            'folder',
            folderId,
            folderName,
            undefined,
            parentFolderId,
          );

          expect(item.contextValue).toBe('brightchain-folder');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('file items have collapsible state None', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        validFileName,
        (fileId: string, fileName: string) => {
          const item = new BrightchainTreeItem('file', fileId, fileName);

          expect(item.collapsibleState).toBe(TreeItemCollapsibleState.None);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('folder items have collapsible state Collapsed', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        validFileName,
        (folderId: string, folderName: string) => {
          const item = new BrightchainTreeItem('folder', folderId, folderName);

          expect(item.collapsibleState).toBe(
            TreeItemCollapsibleState.Collapsed,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
