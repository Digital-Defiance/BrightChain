import type {
  IRemoteFileEntry,
  ISyncApiClient,
  ISyncConfig,
  IVirtualDriveMount,
} from '@brightchain/digitalburnbag-lib';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Cached entry representing a file or directory in the virtual drive.
 * Populated from remote API calls and updated on local writes.
 */
export interface ICachedEntry {
  id: string;
  name: string;
  isDirectory: boolean;
  sizeBytes: number;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
  /** Whether the full content is available in the local content cache. */
  hydrated: boolean;
  /** For files: in-memory content buffer (populated on hydrate/write). */
  content?: Buffer;
  /** Dirty flag — content was written locally but not yet pushed to server. */
  dirty: boolean;
}

/** Parsed FUSE path: parent folder ID chain + leaf name. */
interface _ResolvedPath {
  parentId: string | null;
  entry: ICachedEntry | undefined;
  /** The folder ID that contains this entry (for root children, this is 'root'). */
  containingFolderId: string;
}

// POSIX file mode constants
const S_IFDIR = 0o040000;
const S_IFREG = 0o100000;
const DIR_MODE = S_IFDIR | 0o755;
const FILE_MODE = S_IFREG | 0o644;

/**
 * Virtual drive mount using FUSE (Linux/macOS) with mirror-directory fallback.
 *
 * Architecture:
 * - Maintains an in-memory metadata cache populated from the remote API.
 * - FUSE readdir/getattr serve from the cache (fast, no network round-trip).
 * - FUSE read triggers on-demand hydration: downloads content from the server
 *   into the in-memory content cache on first access.
 * - FUSE write buffers content in memory; flush/release pushes to the server.
 * - Periodic cache refresh pulls remote changes into the metadata cache.
 *
 * When FUSE is unavailable (no macFUSE/libfuse), falls back to mirror-directory
 * mode where files are synced as regular files on disk.
 */
export class FuseVirtualDrive implements IVirtualDriveMount<string> {
  private mounted = false;
  private mountPath = '';
  private userId = '';
  private apiClient: ISyncApiClient<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fuseInstance: any = null;
  private useFuse = false;

  /**
   * Metadata cache: path -> entry.
   * Paths are POSIX-style relative to mount root, e.g. "/" for root,
   * "/Documents", "/Documents/report.pdf".
   */
  private cache = new Map<string, ICachedEntry>();

  /** Map from directory path to its children paths. */
  private children = new Map<string, Set<string>>();

  /** Map from entry path to its remote ID. */
  private pathToId = new Map<string, string>();

  /** Map from remote ID to entry path. */
  private idToPath = new Map<string, string>();

  /** Next file descriptor number. */
  private nextFd = 10;

  /** Open file descriptors: fd -> path. */
  private openFds = new Map<number, string>();

  /** Cache refresh timer. */
  private refreshTimer: ReturnType<typeof setInterval> | undefined;

  constructor(apiClient: ISyncApiClient<string>) {
    this.apiClient = apiClient;
  }

  async mount(config: ISyncConfig<string>): Promise<void> {
    if (this.mounted) return;
    this.mountPath = config.mountPath;
    this.userId = config.userId;

    // Ensure mount directory exists
    if (!fs.existsSync(this.mountPath)) {
      fs.mkdirSync(this.mountPath, { recursive: true });
    }

    // Populate initial cache from remote
    await this.refreshCache();

    // Attempt FUSE mount
    try {
      await this.mountFuse();
      this.useFuse = true;
    } catch {
      // FUSE not available — mirror mode
      console.warn(
        'FUSE not available — using mirror directory mode at',
        this.mountPath,
      );
      this.useFuse = false;
    }

    // Periodic cache refresh (every 30s)
    this.refreshTimer = setInterval(() => void this.refreshCache(), 30_000);
    this.mounted = true;
  }

  async unmount(): Promise<void> {
    if (!this.mounted) return;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    // Flush any dirty files before unmounting
    await this.flushAllDirty();

    if (this.useFuse && this.fuseInstance) {
      await new Promise<void>((resolve, reject) => {
        this.fuseInstance.unmount((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.fuseInstance = null;
    }

    this.cache.clear();
    this.children.clear();
    this.pathToId.clear();
    this.idToPath.clear();
    this.openFds.clear();
    this.mounted = false;
  }

  isMounted(): boolean {
    return this.mounted;
  }

  getMountPath(): string {
    return this.mountPath;
  }

  async hydrateFile(localPath: string, fileId: string): Promise<void> {
    const entryPath = this.idToPath.get(fileId);
    const entry = entryPath ? this.cache.get(entryPath) : undefined;

    const content = await this.apiClient.downloadFileContent(fileId);

    if (entry) {
      entry.content = Buffer.from(content);
      entry.sizeBytes = content.length;
      entry.hydrated = true;
    }

    // In mirror mode, also write to disk
    if (!this.useFuse) {
      const fullPath = path.join(this.mountPath, localPath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, Buffer.from(content));
    }
  }

  async dehydrateFile(localPath: string): Promise<void> {
    const entryPath = this.normalizePath(localPath);
    const entry = this.cache.get(entryPath);
    if (entry) {
      entry.content = undefined;
      entry.hydrated = false;
    }

    // In mirror mode, replace with placeholder
    if (!this.useFuse) {
      const fullPath = path.join(this.mountPath, localPath);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        const sidecar = fullPath + '.cloudmeta';
        fs.writeFileSync(
          sidecar,
          JSON.stringify({
            originalSize: stat.size,
            dehydratedAt: new Date().toISOString(),
          }),
        );
        fs.truncateSync(fullPath, 0);
      }
    }
  }

  // ── Cache management ──────────────────────────────────────────────

  /** Refresh the metadata cache from the remote API. */
  async refreshCache(): Promise<void> {
    try {
      const rootEntries = await this.apiClient.listRootFolder(this.userId);
      this.populateDirectory('/', 'root', rootEntries);
    } catch (err) {
      // Network failure — keep stale cache
      console.warn('Cache refresh failed:', (err as Error).message);
    }
  }

  private populateDirectory(
    dirPath: string,
    dirId: string,
    entries: IRemoteFileEntry<string>[],
  ): void {
    const childPaths = new Set<string>();

    for (const entry of entries) {
      const entryPath =
        dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`;

      const existing = this.cache.get(entryPath);
      const cached: ICachedEntry = {
        id: entry.id,
        name: entry.name,
        isDirectory: entry.isDirectory,
        sizeBytes: entry.sizeBytes,
        mimeType: entry.mimeType,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt),
        hydrated: existing?.hydrated ?? false,
        content: existing?.content,
        dirty: existing?.dirty ?? false,
      };

      this.cache.set(entryPath, cached);
      this.pathToId.set(entryPath, entry.id);
      this.idToPath.set(entry.id, entryPath);
      childPaths.add(entryPath);

      if (entry.isDirectory) {
        // Ensure directory has a children set
        if (!this.children.has(entryPath)) {
          this.children.set(entryPath, new Set());
        }
      }
    }

    this.children.set(dirPath, childPaths);
    this.pathToId.set(dirPath, dirId);
    this.idToPath.set(dirId, dirPath);

    // Ensure root entry exists
    if (!this.cache.has('/')) {
      this.cache.set('/', {
        id: 'root',
        name: '',
        isDirectory: true,
        sizeBytes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        hydrated: true,
        dirty: false,
      });
    }
  }

  /** Lazily load a subdirectory's contents from the server. */
  private async ensureDirectoryLoaded(dirPath: string): Promise<void> {
    const dirId = this.pathToId.get(dirPath);
    if (!dirId || dirId === 'root') return;

    // If we already have children cached, skip
    const existing = this.children.get(dirPath);
    if (existing && existing.size > 0) return;

    try {
      const entries = await this.apiClient.listFolder(dirId);
      this.populateDirectory(dirPath, dirId, entries);
    } catch {
      // Network failure — return empty
    }
  }

  private normalizePath(p: string): string {
    if (!p.startsWith('/')) p = '/' + p;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  }

  /** Flush all dirty files to the server. */
  private async flushAllDirty(): Promise<void> {
    for (const [entryPath, entry] of this.cache) {
      if (entry.dirty && entry.content && !entry.isDirectory) {
        try {
          await this.apiClient.uploadFileContent(
            entry.id,
            new Uint8Array(entry.content),
          );
          entry.dirty = false;
        } catch (err) {
          console.warn(`Failed to flush ${entryPath}:`, (err as Error).message);
        }
      }
    }
  }

  // ── FUSE mount ────────────────────────────────────────────────────

  private async mountFuse(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore fuse-native is an optional peer dependency
    const Fuse = (await import('fuse-native')).default;
    if (!Fuse) throw new Error('fuse-native not available');

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    const ops = {
      readdir(
        fusePath: string,
        cb: (code: number, names?: string[]) => void,
      ): void {
        const p = self.normalizePath(fusePath);
        const entry = self.cache.get(p);
        if (!entry || !entry.isDirectory) {
          cb(-2); // ENOENT
          return;
        }

        // Lazy-load subdirectory contents
        void self
          .ensureDirectoryLoaded(p)
          .then(() => {
            const childSet = self.children.get(p);
            if (!childSet) {
              cb(0, []);
              return;
            }
            const names = Array.from(childSet).map((childPath) => {
              const cached = self.cache.get(childPath);
              return cached?.name ?? path.basename(childPath);
            });
            cb(0, names);
          })
          .catch(() => cb(-5)); // EIO
      },

      getattr(
        fusePath: string,
        cb: (
          code: number,
          stat?: {
            mtime: Date;
            atime: Date;
            ctime: Date;
            nlink: number;
            size: number;
            mode: number;
            uid: number;
            gid: number;
          },
        ) => void,
      ): void {
        const p = self.normalizePath(fusePath);
        const entry = self.cache.get(p);
        if (!entry) {
          cb(-2); // ENOENT
          return;
        }

        const now = entry.updatedAt;
        cb(0, {
          mtime: now,
          atime: now,
          ctime: entry.createdAt,
          nlink: 1,
          size: entry.isDirectory ? 4096 : entry.sizeBytes,
          mode: entry.isDirectory ? DIR_MODE : FILE_MODE,
          uid: process.getuid ? process.getuid() : 0,
          gid: process.getgid ? process.getgid() : 0,
        });
      },

      open(
        fusePath: string,
        flags: number,
        cb: (code: number, fd?: number) => void,
      ): void {
        const p = self.normalizePath(fusePath);
        const entry = self.cache.get(p);
        if (!entry || entry.isDirectory) {
          cb(-2); // ENOENT
          return;
        }
        const fd = self.nextFd++;
        self.openFds.set(fd, p);
        cb(0, fd);
      },

      read(
        fusePath: string,
        fd: number,
        buf: Buffer,
        len: number,
        pos: number,
        cb: (bytesRead: number) => void,
      ): void {
        const p = self.openFds.get(fd) ?? self.normalizePath(fusePath);
        const entry = self.cache.get(p);
        if (!entry) {
          cb(0);
          return;
        }

        // On-demand hydration
        if (!entry.hydrated || !entry.content) {
          void self.apiClient
            .downloadFileContent(entry.id)
            .then((data) => {
              entry.content = Buffer.from(data);
              entry.sizeBytes = data.length;
              entry.hydrated = true;
              self.serveRead(entry.content, buf, len, pos, cb);
            })
            .catch(() => cb(0));
          return;
        }

        self.serveRead(entry.content, buf, len, pos, cb);
      },

      write(
        fusePath: string,
        fd: number,
        buf: Buffer,
        len: number,
        pos: number,
        cb: (bytesWritten: number) => void,
      ): void {
        const p = self.openFds.get(fd) ?? self.normalizePath(fusePath);
        const entry = self.cache.get(p);
        if (!entry) {
          cb(0);
          return;
        }

        // Ensure we have a content buffer
        if (!entry.content) {
          entry.content = Buffer.alloc(0);
        }

        // Grow buffer if needed
        const needed = pos + len;
        if (entry.content.length < needed) {
          const grown = Buffer.alloc(needed);
          entry.content.copy(grown);
          entry.content = grown;
        }

        buf.copy(entry.content, pos, 0, len);
        entry.sizeBytes = Math.max(entry.sizeBytes, needed);
        entry.dirty = true;
        entry.hydrated = true;
        cb(len);
      },

      release(fusePath: string, fd: number, cb: (code: number) => void): void {
        const p = self.openFds.get(fd) ?? self.normalizePath(fusePath);
        self.openFds.delete(fd);

        const entry = self.cache.get(p);
        if (entry?.dirty && entry.content) {
          void self.apiClient
            .uploadFileContent(entry.id, new Uint8Array(entry.content))
            .then(() => {
              entry.dirty = false;
              cb(0);
            })
            .catch(() => cb(0)); // best-effort push
        } else {
          cb(0);
        }
      },

      create(
        fusePath: string,
        mode: number,
        cb: (code: number, fd?: number) => void,
      ): void {
        const p = self.normalizePath(fusePath);
        if (self.cache.has(p)) {
          cb(-17); // EEXIST
          return;
        }

        const parentPath = path.dirname(p) === '.' ? '/' : path.dirname(p);
        const parentId = self.pathToId.get(parentPath);
        if (!parentId) {
          cb(-2); // ENOENT — parent doesn't exist
          return;
        }

        const name = path.basename(p);
        const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const now = new Date();

        const entry: ICachedEntry = {
          id: tempId,
          name,
          isDirectory: false,
          sizeBytes: 0,
          createdAt: now,
          updatedAt: now,
          hydrated: true,
          content: Buffer.alloc(0),
          dirty: true,
        };

        self.cache.set(p, entry);
        self.pathToId.set(p, tempId);
        self.idToPath.set(tempId, p);

        const parentChildren = self.children.get(parentPath) ?? new Set();
        parentChildren.add(p);
        self.children.set(parentPath, parentChildren);

        const fd = self.nextFd++;
        self.openFds.set(fd, p);
        cb(0, fd);
      },

      unlink(fusePath: string, cb: (code: number) => void): void {
        const p = self.normalizePath(fusePath);
        const entry = self.cache.get(p);
        if (!entry) {
          cb(-2); // ENOENT
          return;
        }
        if (entry.isDirectory) {
          cb(-21); // EISDIR
          return;
        }

        // Remove from cache
        self.cache.delete(p);
        const parentPath = path.dirname(p) === '.' ? '/' : path.dirname(p);
        self.children.get(parentPath)?.delete(p);
        self.pathToId.delete(p);
        self.idToPath.delete(entry.id);

        // Delete on server (best-effort)
        void self.apiClient.deleteRemoteEntry(entry.id, false).catch(() => {});
        cb(0);
      },

      mkdir(fusePath: string, _mode: number, cb: (code: number) => void): void {
        const p = self.normalizePath(fusePath);
        if (self.cache.has(p)) {
          cb(-17); // EEXIST
          return;
        }

        const parentPath = path.dirname(p) === '.' ? '/' : path.dirname(p);
        const parentId = self.pathToId.get(parentPath);
        if (!parentId) {
          cb(-2);
          return;
        }

        const name = path.basename(p);

        void self.apiClient
          .createRemoteFolder(parentId, name)
          .then((newId) => {
            const now = new Date();
            const entry: ICachedEntry = {
              id: newId,
              name,
              isDirectory: true,
              sizeBytes: 0,
              createdAt: now,
              updatedAt: now,
              hydrated: true,
              dirty: false,
            };

            self.cache.set(p, entry);
            self.pathToId.set(p, newId);
            self.idToPath.set(newId, p);
            self.children.set(p, new Set());

            const parentChildren = self.children.get(parentPath) ?? new Set();
            parentChildren.add(p);
            self.children.set(parentPath, parentChildren);

            cb(0);
          })
          .catch(() => cb(-5)); // EIO
      },

      rmdir(fusePath: string, cb: (code: number) => void): void {
        const p = self.normalizePath(fusePath);
        const entry = self.cache.get(p);
        if (!entry) {
          cb(-2);
          return;
        }
        if (!entry.isDirectory) {
          cb(-20); // ENOTDIR
          return;
        }

        const childSet = self.children.get(p);
        if (childSet && childSet.size > 0) {
          cb(-39); // ENOTEMPTY
          return;
        }

        self.cache.delete(p);
        self.children.delete(p);
        const parentPath = path.dirname(p) === '.' ? '/' : path.dirname(p);
        self.children.get(parentPath)?.delete(p);
        self.pathToId.delete(p);
        self.idToPath.delete(entry.id);

        void self.apiClient.deleteRemoteEntry(entry.id, true).catch(() => {});
        cb(0);
      },

      rename(src: string, dest: string, cb: (code: number) => void): void {
        const srcPath = self.normalizePath(src);
        const destPath = self.normalizePath(dest);
        const entry = self.cache.get(srcPath);
        if (!entry) {
          cb(-2);
          return;
        }

        const newName = path.basename(destPath);
        const oldParent =
          path.dirname(srcPath) === '.' ? '/' : path.dirname(srcPath);
        const newParent =
          path.dirname(destPath) === '.' ? '/' : path.dirname(destPath);

        // Update cache
        self.cache.delete(srcPath);
        entry.name = newName;
        self.cache.set(destPath, entry);

        self.pathToId.delete(srcPath);
        self.pathToId.set(destPath, entry.id);
        self.idToPath.set(entry.id, destPath);

        // Update parent children sets
        self.children.get(oldParent)?.delete(srcPath);
        const newParentChildren = self.children.get(newParent) ?? new Set();
        newParentChildren.add(destPath);
        self.children.set(newParent, newParentChildren);

        // If directory, update all descendant paths
        if (entry.isDirectory) {
          self.reparentDescendants(srcPath, destPath);
        }

        // Rename on server
        void self.apiClient
          .renameRemoteEntry(entry.id, newName)
          .catch(() => {});
        cb(0);
      },

      truncate(
        fusePath: string,
        size: number,
        cb: (code: number) => void,
      ): void {
        const p = self.normalizePath(fusePath);
        const entry = self.cache.get(p);
        if (!entry || entry.isDirectory) {
          cb(-2);
          return;
        }

        if (!entry.content) {
          entry.content = Buffer.alloc(size);
        } else if (size < entry.content.length) {
          entry.content = entry.content.subarray(0, size) as Buffer;
        } else if (size > entry.content.length) {
          const grown = Buffer.alloc(size);
          entry.content.copy(grown);
          entry.content = grown;
        }

        entry.sizeBytes = size;
        entry.dirty = true;
        cb(0);
      },

      statfs(
        _fusePath: string,
        cb: (code: number, stat?: Record<string, number>) => void,
      ): void {
        cb(0, {
          bsize: 4096,
          frsize: 4096,
          blocks: 1000000,
          bfree: 500000,
          bavail: 500000,
          files: 1000000,
          ffree: 500000,
          favail: 500000,
          fsid: 0,
          flag: 0,
          namemax: 255,
        });
      },
    };

    this.fuseInstance = new Fuse(this.mountPath, ops, {
      force: true,
      mkdir: true,
    });

    await new Promise<void>((resolve, reject) => {
      this.fuseInstance.mount((err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /** Copy content from the entry buffer into the FUSE read buffer. */
  private serveRead(
    content: Buffer,
    buf: Buffer,
    len: number,
    pos: number,
    cb: (bytesRead: number) => void,
  ): void {
    if (pos >= content.length) {
      cb(0);
      return;
    }
    const end = Math.min(pos + len, content.length);
    const slice = content.subarray(pos, end);
    slice.copy(buf);
    cb(slice.length);
  }

  /** After a rename of a directory, update all cached descendant paths. */
  private reparentDescendants(oldPrefix: string, newPrefix: string): void {
    const toRename: [string, string][] = [];
    for (const cachedPath of this.cache.keys()) {
      if (cachedPath.startsWith(oldPrefix + '/')) {
        const newPath = newPrefix + cachedPath.slice(oldPrefix.length);
        toRename.push([cachedPath, newPath]);
      }
    }
    for (const [oldPath, newPath] of toRename) {
      const entry = this.cache.get(oldPath);
      if (!entry) continue;
      this.cache.delete(oldPath);
      this.cache.set(newPath, entry);
      this.pathToId.delete(oldPath);
      this.pathToId.set(newPath, entry.id);
      this.idToPath.set(entry.id, newPath);

      // Update children sets
      const oldChildren = this.children.get(oldPath);
      if (oldChildren) {
        this.children.delete(oldPath);
        const newChildren = new Set<string>();
        for (const child of oldChildren) {
          const newChild = newPrefix + child.slice(oldPrefix.length);
          newChildren.add(newChild);
        }
        this.children.set(newPath, newChildren);
      }
    }
  }
}
