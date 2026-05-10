import {
  FileSystemEventType,
  type IFileSystemWatcher,
  type ISyncEvent,
} from '@brightchain/digitalburnbag-lib';
import type { FSWatcher } from 'chokidar';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Concrete file system watcher using chokidar.
 * Translates chokidar events into ISyncEvent objects.
 */
export class ChokidarFileWatcher implements IFileSystemWatcher<string> {
  private watcher: FSWatcher | null = null;
  private handlers: Array<(event: ISyncEvent<string>) => void> = [];
  private rootPath = '';

  async start(rootPath: string): Promise<void> {
    if (this.watcher) return;
    this.rootPath = rootPath;

    // Dynamic import to avoid bundling issues in non-Node environments
    const chokidar = await import('chokidar');
    this.watcher = chokidar.watch(rootPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
      // Ignore hidden files and common temp files
      ignored: [
        /(^|[/\\])\../, // dotfiles
        /~$/, // editor temp files
        /\.tmp$/,
        /\.swp$/,
      ],
    });

    this.watcher.on('add', (filePath: string) => {
      this.emit(FileSystemEventType.Created, filePath, false);
    });

    this.watcher.on('change', (filePath: string) => {
      this.emit(FileSystemEventType.Modified, filePath, false);
    });

    this.watcher.on('unlink', (filePath: string) => {
      this.emit(FileSystemEventType.Deleted, filePath, false);
    });

    this.watcher.on('addDir', (dirPath: string) => {
      // Skip the root directory itself
      if (dirPath === rootPath) return;
      this.emit(FileSystemEventType.Created, dirPath, true);
    });

    this.watcher.on('unlinkDir', (dirPath: string) => {
      this.emit(FileSystemEventType.Deleted, dirPath, true);
    });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  isWatching(): boolean {
    return this.watcher !== null;
  }

  onEvent(handler: (event: ISyncEvent<string>) => void): void {
    this.handlers.push(handler);
  }

  offEvent(handler: (event: ISyncEvent<string>) => void): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  private emit(
    eventType: FileSystemEventType,
    filePath: string,
    isDirectory: boolean,
  ): void {
    const relativePath = path.relative(this.rootPath, filePath);
    const event: ISyncEvent<string> = {
      eventId: uuidv4(),
      eventType,
      localPath: relativePath,
      timestamp: new Date(),
      isDirectory,
    };
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
