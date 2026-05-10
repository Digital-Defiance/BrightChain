/**
 * Unit tests for BrightchainFSProvider.
 *
 * Validates: Requirements 6.1–6.9
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../api/api-client';
import type {
  IChunkReceipt,
  IFileMetadataDTO,
  IFolderContentsDTO,
  IFolderMetadataDTO,
  IUploadSessionDTO,
} from '../api/types';
import { MetadataCache } from '../services/metadata-cache';
import { BrightchainFSProvider } from './fs-provider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFileMetadata(
  overrides: Partial<IFileMetadataDTO> = {},
): IFileMetadataDTO {
  return {
    id: 'file-id-1',
    ownerId: 'owner-1',
    folderId: 'folder-1',
    fileName: 'report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    tags: [],
    currentVersionId: 'v1',
    quorumGoverned: false,
    visibleWatermark: false,
    invisibleWatermark: false,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-06-20T14:30:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    ...overrides,
  };
}

function makeFolderMetadata(
  overrides: Partial<IFolderMetadataDTO> = {},
): IFolderMetadataDTO {
  return {
    id: 'folder-1',
    ownerId: 'owner-1',
    name: 'Documents',
    quorumGoverned: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    ...overrides,
  };
}

function makeFolderContents(
  files: IFileMetadataDTO[] = [],
  folders: IFolderMetadataDTO[] = [],
): IFolderContentsDTO {
  return { files, folders };
}

function createMockApi(): jest.Mocked<ApiClient> {
  return {
    getFileContent: jest.fn(),
    getFileMetadata: jest.fn(),
    updateFile: jest.fn(),
    deleteFile: jest.fn(),
    getFolderContents: jest.fn(),
    createFolder: jest.fn(),
    moveItem: jest.fn(),
    initUpload: jest.fn(),
    uploadChunk: jest.fn(),
    finalizeUpload: jest.fn(),
  } as unknown as jest.Mocked<ApiClient>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BrightchainFSProvider', () => {
  let api: jest.Mocked<ApiClient>;
  let cache: MetadataCache;
  let provider: BrightchainFSProvider;

  beforeEach(() => {
    api = createMockApi();
    cache = new MetadataCache();
    provider = new BrightchainFSProvider(api, cache);
  });

  // -----------------------------------------------------------------------
  // watch
  // -----------------------------------------------------------------------

  describe('watch', () => {
    it('returns a no-op disposable', () => {
      const uri = vscode.Uri.parse('brightchain://files/abc/test.txt');
      const disposable = provider.watch(uri);
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
      // Should not throw
      disposable.dispose();
    });
  });

  // -----------------------------------------------------------------------
  // stat
  // -----------------------------------------------------------------------

  describe('stat', () => {
    it('returns FileStat for a file from API', async () => {
      const meta = makeFileMetadata({
        sizeBytes: 4096,
        createdAt: '2024-03-01T12:00:00Z',
        updatedAt: '2024-03-15T18:00:00Z',
      });
      api.getFileMetadata.mockResolvedValue(meta);

      const uri = vscode.Uri.parse('brightchain://files/file-id-1/report.pdf');
      const stat = await provider.stat(uri);

      expect(stat.type).toBe(vscode.FileType.File);
      expect(stat.size).toBe(4096);
      expect(stat.ctime).toBe(new Date('2024-03-01T12:00:00Z').getTime());
      expect(stat.mtime).toBe(new Date('2024-03-15T18:00:00Z').getTime());
      expect(api.getFileMetadata).toHaveBeenCalledWith('file-id-1');
    });

    it('returns FileStat for a folder from API', async () => {
      api.getFolderContents.mockResolvedValue(makeFolderContents());

      const uri = vscode.Uri.parse('brightchain://folders/folder-1/');
      const stat = await provider.stat(uri);

      expect(stat.type).toBe(vscode.FileType.Directory);
      expect(stat.size).toBe(0);
    });

    it('uses cache for repeated stat calls', async () => {
      const meta = makeFileMetadata();
      api.getFileMetadata.mockResolvedValue(meta);

      const uri = vscode.Uri.parse('brightchain://files/file-id-1/report.pdf');
      await provider.stat(uri);
      await provider.stat(uri);

      // Only one API call — second was served from cache
      expect(api.getFileMetadata).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // readDirectory
  // -----------------------------------------------------------------------

  describe('readDirectory', () => {
    it('returns [name, FileType] tuples from API', async () => {
      const contents = makeFolderContents(
        [makeFileMetadata({ fileName: 'notes.txt' })],
        [makeFolderMetadata({ name: 'Subfolder' })],
      );
      api.getFolderContents.mockResolvedValue(contents);

      const uri = vscode.Uri.parse('brightchain://folders/folder-1/');
      const result = await provider.readDirectory(uri);

      expect(result).toEqual([
        ['Subfolder', vscode.FileType.Directory],
        ['notes.txt', vscode.FileType.File],
      ]);
    });

    it('uses cache for repeated readDirectory calls', async () => {
      api.getFolderContents.mockResolvedValue(makeFolderContents());

      const uri = vscode.Uri.parse('brightchain://folders/folder-1/');
      await provider.readDirectory(uri);
      await provider.readDirectory(uri);

      expect(api.getFolderContents).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // readFile
  // -----------------------------------------------------------------------

  describe('readFile', () => {
    it('fetches binary content from API', async () => {
      const content = new Uint8Array([72, 101, 108, 108, 111]);
      api.getFileContent.mockResolvedValue(content);

      const uri = vscode.Uri.parse('brightchain://files/file-id-1/hello.txt');
      const result = await provider.readFile(uri);

      expect(result).toBe(content);
      expect(api.getFileContent).toHaveBeenCalledWith('file-id-1');
    });
  });

  // -----------------------------------------------------------------------
  // writeFile
  // -----------------------------------------------------------------------

  describe('writeFile', () => {
    it('executes chunked upload flow and fires Changed event', async () => {
      const session: IUploadSessionDTO = {
        sessionId: 'sess-1',
        chunkSize: 5,
        totalChunks: 2,
      };
      const receipt: IChunkReceipt = { chunksReceived: 1, totalChunks: 2 };
      const finalMeta = makeFileMetadata();

      api.initUpload.mockResolvedValue(session);
      api.uploadChunk.mockResolvedValue(receipt);
      api.finalizeUpload.mockResolvedValue(finalMeta);

      const events: vscode.FileChangeEvent[] = [];
      provider.onDidChangeFile((e) => events.push(...e));

      const content = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const uri = vscode.Uri.parse('brightchain://files/file-id-1/data.bin');
      await provider.writeFile(uri, content, { create: true, overwrite: true });

      // Verify init was called
      expect(api.initUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'data.bin',
          fileSize: 10,
        }),
      );

      // Verify chunks were uploaded
      expect(api.uploadChunk).toHaveBeenCalledTimes(2);

      // Verify finalize was called
      expect(api.finalizeUpload).toHaveBeenCalledWith('sess-1');

      // Verify change event fired
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(vscode.FileChangeType.Changed);
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------

  describe('delete', () => {
    it('calls API and fires Deleted event', async () => {
      api.deleteFile.mockResolvedValue(undefined);

      const events: vscode.FileChangeEvent[] = [];
      provider.onDidChangeFile((e) => events.push(...e));

      const uri = vscode.Uri.parse('brightchain://files/file-id-1/report.pdf');
      await provider.delete(uri, { recursive: false });

      expect(api.deleteFile).toHaveBeenCalledWith('file-id-1');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(vscode.FileChangeType.Deleted);
    });
  });

  // -----------------------------------------------------------------------
  // rename
  // -----------------------------------------------------------------------

  describe('rename', () => {
    it('calls updateFile for name change and fires events', async () => {
      api.updateFile.mockResolvedValue(makeFileMetadata());

      const events: vscode.FileChangeEvent[] = [];
      provider.onDidChangeFile((e) => events.push(...e));

      const oldUri = vscode.Uri.parse('brightchain://files/file-id-1/old.txt');
      const newUri = vscode.Uri.parse('brightchain://files/file-id-1/new.txt');
      await provider.rename(oldUri, newUri, { overwrite: false });

      expect(api.updateFile).toHaveBeenCalledWith('file-id-1', {
        fileName: 'new.txt',
      });
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(vscode.FileChangeType.Deleted);
      expect(events[1].type).toBe(vscode.FileChangeType.Created);
    });

    it('calls moveItem when IDs differ and target is folder', async () => {
      api.moveItem.mockResolvedValue(undefined);

      const oldUri = vscode.Uri.parse('brightchain://files/file-id-1/doc.txt');
      const newUri = vscode.Uri.parse('brightchain://folders/folder-2/');
      await provider.rename(oldUri, newUri, { overwrite: false });

      expect(api.moveItem).toHaveBeenCalledWith('file-id-1', 'folder-2');
    });
  });

  // -----------------------------------------------------------------------
  // createDirectory
  // -----------------------------------------------------------------------

  describe('createDirectory', () => {
    it('calls createFolder and fires Created event', async () => {
      api.createFolder.mockResolvedValue(makeFolderMetadata());

      const events: vscode.FileChangeEvent[] = [];
      provider.onDidChangeFile((e) => events.push(...e));

      const uri = vscode.Uri.parse('brightchain://folders/new-folder/');
      await provider.createDirectory(uri);

      expect(api.createFolder).toHaveBeenCalledWith('root', 'new-folder');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(vscode.FileChangeType.Created);
    });
  });
});
