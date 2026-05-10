import type { ISyncEvent } from '@brightchain/digitalburnbag-lib';
import { FileSystemEventType } from '@brightchain/digitalburnbag-lib';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ChokidarFileWatcher } from '../adapters/chokidar-file-watcher';

describe('ChokidarFileWatcher', () => {
  let watcher: ChokidarFileWatcher;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burnbag-watch-'));
    watcher = new ChokidarFileWatcher();
  });

  afterEach(async () => {
    await watcher.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should not be watching before start', () => {
    expect(watcher.isWatching()).toBe(false);
  });

  it('should be watching after start', async () => {
    await watcher.start(tmpDir);
    expect(watcher.isWatching()).toBe(true);
  });

  it('should stop watching after stop', async () => {
    await watcher.start(tmpDir);
    await watcher.stop();
    expect(watcher.isWatching()).toBe(false);
  });

  it('should detect file creation', async () => {
    const events: ISyncEvent<string>[] = [];
    watcher.onEvent((e) => events.push(e));
    await watcher.start(tmpDir);

    // Wait for chokidar to be ready
    await new Promise((r) => setTimeout(r, 500));

    const testFile = path.join(tmpDir, 'new-file.txt');
    fs.writeFileSync(testFile, 'hello');

    // Wait for event to propagate
    await new Promise((r) => setTimeout(r, 1000));

    const createEvents = events.filter(
      (e) => e.eventType === FileSystemEventType.Created && !e.isDirectory,
    );
    expect(createEvents.length).toBeGreaterThanOrEqual(1);
    expect(createEvents[0].localPath).toBe('new-file.txt');
  });

  it('should detect file modification', async () => {
    // Create file before watching
    const testFile = path.join(tmpDir, 'existing.txt');
    fs.writeFileSync(testFile, 'original');

    const events: ISyncEvent<string>[] = [];
    watcher.onEvent((e) => events.push(e));
    await watcher.start(tmpDir);
    await new Promise((r) => setTimeout(r, 500));

    fs.writeFileSync(testFile, 'modified');
    await new Promise((r) => setTimeout(r, 1000));

    const modEvents = events.filter(
      (e) => e.eventType === FileSystemEventType.Modified,
    );
    expect(modEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect file deletion', async () => {
    const testFile = path.join(tmpDir, 'to-delete.txt');
    fs.writeFileSync(testFile, 'bye');

    const events: ISyncEvent<string>[] = [];
    watcher.onEvent((e) => events.push(e));
    await watcher.start(tmpDir);
    await new Promise((r) => setTimeout(r, 500));

    fs.unlinkSync(testFile);
    await new Promise((r) => setTimeout(r, 1000));

    const delEvents = events.filter(
      (e) => e.eventType === FileSystemEventType.Deleted,
    );
    expect(delEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should remove event handler with offEvent', async () => {
    const events: ISyncEvent<string>[] = [];
    const handler = (e: ISyncEvent<string>) => events.push(e);

    watcher.onEvent(handler);
    watcher.offEvent(handler);

    await watcher.start(tmpDir);
    await new Promise((r) => setTimeout(r, 500));

    fs.writeFileSync(path.join(tmpDir, 'ignored.txt'), 'nope');
    await new Promise((r) => setTimeout(r, 1000));

    expect(events.length).toBe(0);
  });

  it('should be idempotent on double start', async () => {
    await watcher.start(tmpDir);
    await watcher.start(tmpDir); // should not throw
    expect(watcher.isWatching()).toBe(true);
  });
});
