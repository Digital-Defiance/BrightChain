import { EventEmitter } from 'vscode';
import type { ApiClient } from '../api/api-client';
import type { IFolderContentsDTO } from '../api/types';
import type { AuthManager } from '../auth/auth-manager';
import type { IAuthState } from '../auth/types';
import { MetadataCache } from '../services/metadata-cache';
import { BrightchainTreeItem } from './tree-item';
import { BrightchainTreeProvider } from './tree-provider';

// ---------------------------------------------------------------------------
// Helpers / Mocks
// ---------------------------------------------------------------------------

type MockAuth = Pick<AuthManager, 'state' | 'onAuthChanged'> & {
  _fire: (s: IAuthState) => void;
  _emitter: EventEmitter<IAuthState>;
};

function makeAuthManager(authenticated: boolean): MockAuth {
  const emitter = new EventEmitter<IAuthState>();
  return {
    state: { authenticated } as IAuthState,
    onAuthChanged: emitter.event,
    _fire: (s: IAuthState) => {
      emitter.fire(s);
    },
    _emitter: emitter,
  };
}

type MockApi = Pick<ApiClient, 'getFolderContents'>;

function makeApiClient(contents: IFolderContentsDTO): MockApi {
  return {
    getFolderContents: jest.fn().mockResolvedValue(contents),
  };
}

const EMPTY_CONTENTS: IFolderContentsDTO = { files: [], folders: [] };

const SAMPLE_CONTENTS: IFolderContentsDTO = {
  folders: [
    {
      id: 'folder-1',
      ownerId: 'owner',
      name: 'Documents',
      quorumGoverned: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createdBy: 'user',
      updatedBy: 'user',
    },
  ],
  files: [
    {
      id: 'file-1',
      ownerId: 'owner',
      folderId: 'root',
      fileName: 'readme.md',
      mimeType: 'text/markdown',
      sizeBytes: 1024,
      tags: [],
      currentVersionId: 'v1',
      quorumGoverned: false,
      visibleWatermark: false,
      invisibleWatermark: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      createdBy: 'user',
      updatedBy: 'user',
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BrightchainTreeProvider', () => {
  let cache: MetadataCache;

  beforeEach(() => {
    cache = new MetadataCache();
  });

  describe('getChildren (root, not authenticated)', () => {
    it('returns empty array when not authenticated', async () => {
      const auth = makeAuthManager(false);
      const api = makeApiClient(SAMPLE_CONTENTS);
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );

      const children = await provider.getChildren();
      expect(children).toEqual([]);
      expect(api.getFolderContents).not.toHaveBeenCalled();
    });
  });

  describe('getChildren (root, authenticated)', () => {
    it('fetches root folder contents and returns tree items', async () => {
      const auth = makeAuthManager(true);
      const api = makeApiClient(SAMPLE_CONTENTS);
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );

      const children = await provider.getChildren();

      expect(api.getFolderContents).toHaveBeenCalledWith('root');
      expect(children).toHaveLength(2);

      // First item should be the folder
      expect(children[0].itemType).toBe('folder');
      expect(children[0].itemId).toBe('folder-1');
      expect(children[0].label).toBe('Documents');

      // Second item should be the file
      expect(children[1].itemType).toBe('file');
      expect(children[1].itemId).toBe('file-1');
      expect(children[1].label).toBe('readme.md');
      expect(children[1].mimeType).toBe('text/markdown');
    });

    it('populates MetadataCache with directory tuples', async () => {
      const auth = makeAuthManager(true);
      const api = makeApiClient(SAMPLE_CONTENTS);
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );

      await provider.getChildren();

      const cached = cache.getDirContents('root');
      expect(cached).toBeDefined();
      expect(cached).toHaveLength(2);
      // Folder tuple
      expect(cached![0]).toEqual(['Documents', 2]); // FileType.Directory = 2
      // File tuple
      expect(cached![1]).toEqual(['readme.md', 1]); // FileType.File = 1
    });
  });

  describe('getChildren (subfolder)', () => {
    it('fetches the subfolder contents using the element itemId', async () => {
      const subContents: IFolderContentsDTO = {
        folders: [],
        files: [
          {
            id: 'file-2',
            ownerId: 'owner',
            folderId: 'folder-1',
            fileName: 'notes.txt',
            mimeType: 'text/plain',
            sizeBytes: 256,
            tags: [],
            currentVersionId: 'v1',
            quorumGoverned: false,
            visibleWatermark: false,
            invisibleWatermark: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            createdBy: 'user',
            updatedBy: 'user',
          },
        ],
      };
      const auth = makeAuthManager(true);
      const api = makeApiClient(subContents);
      const folderElement = new BrightchainTreeItem(
        'folder',
        'folder-1',
        'Documents',
      );
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );

      const children = await provider.getChildren(folderElement);

      expect(api.getFolderContents).toHaveBeenCalledWith('folder-1');
      expect(children).toHaveLength(1);
      expect(children[0].itemType).toBe('file');
      expect(children[0].label).toBe('notes.txt');
      expect(children[0].parentFolderId).toBe('folder-1');
    });
  });

  describe('getChildren (API error)', () => {
    it('returns empty array on API failure', async () => {
      const auth = makeAuthManager(true);
      const api = {
        getFolderContents: jest
          .fn()
          .mockRejectedValue(new Error('Network error')),
      };
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );

      const children = await provider.getChildren();
      expect(children).toEqual([]);
    });
  });

  describe('getChildren (empty folder)', () => {
    it('returns empty array for folder with no contents', async () => {
      const auth = makeAuthManager(true);
      const api = makeApiClient(EMPTY_CONTENTS);
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );

      const children = await provider.getChildren();
      expect(children).toEqual([]);
    });
  });

  describe('getTreeItem', () => {
    it('returns the element itself', () => {
      const auth = makeAuthManager(true);
      const api = makeApiClient(EMPTY_CONTENTS);
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );
      const item = new BrightchainTreeItem('file', 'f1', 'test.txt');

      expect(provider.getTreeItem(item)).toBe(item);
    });
  });

  describe('getParent', () => {
    it('returns undefined', () => {
      const auth = makeAuthManager(true);
      const api = makeApiClient(EMPTY_CONTENTS);
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );
      const item = new BrightchainTreeItem('file', 'f1', 'test.txt');

      expect(provider.getParent(item)).toBeUndefined();
    });
  });

  describe('refresh', () => {
    it('fires onDidChangeTreeData with undefined for full refresh', () => {
      const auth = makeAuthManager(true);
      const api = makeApiClient(EMPTY_CONTENTS);
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );
      const listener = jest.fn();
      provider.onDidChangeTreeData(listener);

      provider.refresh();

      expect(listener).toHaveBeenCalledWith(undefined);
    });

    it('fires onDidChangeTreeData with specific element', () => {
      const auth = makeAuthManager(true);
      const api = makeApiClient(EMPTY_CONTENTS);
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );
      const listener = jest.fn();
      provider.onDidChangeTreeData(listener);
      const item = new BrightchainTreeItem('folder', 'f1', 'Docs');

      provider.refresh(item);

      expect(listener).toHaveBeenCalledWith(item);
    });
  });

  describe('auth state change', () => {
    it('fires onDidChangeTreeData when auth state changes', () => {
      const auth = makeAuthManager(false);
      const api = makeApiClient(EMPTY_CONTENTS);
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );
      const listener = jest.fn();
      provider.onDidChangeTreeData(listener);

      // Simulate auth state change
      auth._emitter.fire({ authenticated: true });

      expect(listener).toHaveBeenCalledWith(undefined);
    });
  });

  describe('dispose', () => {
    it('cleans up without errors', () => {
      const auth = makeAuthManager(true);
      const api = makeApiClient(EMPTY_CONTENTS);
      const provider = new BrightchainTreeProvider(
        api as unknown as ApiClient,
        auth as unknown as AuthManager,
        cache,
      );

      expect(() => provider.dispose()).not.toThrow();
    });
  });
});
