/**
 * Feature: brightchain-vfs-explorer, Property 12: Folder contents map to [name, FileType] tuples
 *
 * For any `IFolderContentsDTO` containing a mix of files and folders, the
 * FSProvider's `readDirectory` should return an array of `[name, FileType]`
 * tuples where each file has `FileType.File` and each folder has
 * `FileType.Directory`, and the names match the `fileName` / `name` fields
 * respectively.
 *
 * **Validates: Requirements 6.4**
 */

import fc from 'fast-check';
import { FileType } from 'vscode';
import type { ApiClient } from '../../api/api-client';
import type {
  IFileMetadataDTO,
  IFolderContentsDTO,
  IFolderMetadataDTO,
} from '../../api/types';
import { BrightchainFSProvider } from '../../providers/fs-provider';
import { MetadataCache } from '../../services/metadata-cache';
import { toFolderUri } from '../../util/uri';

/** Arbitrary for a valid item name (non-empty, no slashes). */
const itemNameArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => !s.includes('/') && s.trim().length > 0);

/** Arbitrary for a stub IFileMetadataDTO with a given fileName. */
const fileMetaArb: fc.Arbitrary<IFileMetadataDTO> = itemNameArb.chain(
  (fileName) =>
    fc.uuid().map((id) => ({
      id,
      ownerId: 'owner-stub',
      folderId: 'folder-stub',
      fileName,
      mimeType: 'application/octet-stream',
      sizeBytes: 0,
      tags: [],
      currentVersionId: 'v-stub',
      quorumGoverned: false,
      visibleWatermark: false,
      invisibleWatermark: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createdBy: 'c-stub',
      updatedBy: 'u-stub',
    })),
);

/** Arbitrary for a stub IFolderMetadataDTO with a given name. */
const folderMetaArb: fc.Arbitrary<IFolderMetadataDTO> = itemNameArb.chain(
  (name) =>
    fc.uuid().map((id) => ({
      id,
      ownerId: 'owner-stub',
      name,
      quorumGoverned: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createdBy: 'c-stub',
      updatedBy: 'u-stub',
    })),
);

/** Arbitrary for IFolderContentsDTO with a mix of files and folders. */
const folderContentsArb: fc.Arbitrary<IFolderContentsDTO> = fc.record({
  files: fc.array(fileMetaArb, { minLength: 0, maxLength: 5 }),
  folders: fc.array(folderMetaArb, { minLength: 0, maxLength: 5 }),
});

describe('Property 12: Folder contents map to [name, FileType] tuples', () => {
  it('readDirectory returns correct [name, FileType] tuples for all files and folders', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        folderContentsArb,
        async (folderId: string, contents: IFolderContentsDTO) => {
          // Fresh cache so nothing is pre-cached
          const cache = new MetadataCache(0);

          // Mock ApiClient with getFolderContents returning the generated DTO
          const mockApi = {
            getFolderContents: jest.fn().mockResolvedValue(contents),
          } as unknown as ApiClient;

          const provider = new BrightchainFSProvider(mockApi, cache);
          const uri = toFolderUri(folderId);

          const tuples = await provider.readDirectory(uri);

          // Total count should match files + folders
          expect(tuples.length).toBe(
            contents.files.length + contents.folders.length,
          );

          // Folders come first in the implementation, then files
          const expectedTuples: [string, FileType][] = [
            ...contents.folders.map(
              (f) => [f.name, FileType.Directory] as [string, FileType],
            ),
            ...contents.files.map(
              (f) => [f.fileName, FileType.File] as [string, FileType],
            ),
          ];

          expect(tuples).toEqual(expectedTuples);
        },
      ),
      { numRuns: 100 },
    );
  });
});
