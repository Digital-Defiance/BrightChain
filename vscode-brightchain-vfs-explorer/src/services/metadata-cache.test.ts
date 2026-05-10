import { FileType } from 'vscode';
import { MetadataCache } from './metadata-cache';

describe('MetadataCache', () => {
  let cache: MetadataCache;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new MetadataCache(1000); // 1s TTL for fast tests
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const makeStat = (size = 100) => ({
    type: FileType.File,
    ctime: Date.now(),
    mtime: Date.now(),
    size,
  });

  const makeDirContents = (): [string, FileType][] => [
    ['file.txt', FileType.File],
    ['subfolder', FileType.Directory],
  ];

  describe('getFileStat / setFileStat', () => {
    it('returns undefined for unknown id', () => {
      expect(cache.getFileStat('unknown')).toBeUndefined();
    });

    it('returns cached stat within TTL', () => {
      const stat = makeStat(42);
      cache.setFileStat('f1', stat);
      expect(cache.getFileStat('f1')).toEqual(stat);
    });

    it('returns undefined and removes entry after TTL expires', () => {
      cache.setFileStat('f1', makeStat());
      jest.advanceTimersByTime(1001);
      expect(cache.getFileStat('f1')).toBeUndefined();
    });
  });

  describe('getDirContents / setDirContents', () => {
    it('returns undefined for unknown id', () => {
      expect(cache.getDirContents('unknown')).toBeUndefined();
    });

    it('returns cached contents within TTL', () => {
      const contents = makeDirContents();
      cache.setDirContents('d1', contents);
      expect(cache.getDirContents('d1')).toEqual(contents);
    });

    it('returns undefined and removes entry after TTL expires', () => {
      cache.setDirContents('d1', makeDirContents());
      jest.advanceTimersByTime(1001);
      expect(cache.getDirContents('d1')).toBeUndefined();
    });
  });

  describe('invalidate', () => {
    it('removes a specific file stat entry', () => {
      cache.setFileStat('f1', makeStat());
      cache.setFileStat('f2', makeStat());
      cache.invalidate('f1');
      expect(cache.getFileStat('f1')).toBeUndefined();
      expect(cache.getFileStat('f2')).toBeDefined();
    });

    it('removes a specific dir contents entry', () => {
      cache.setDirContents('d1', makeDirContents());
      cache.setDirContents('d2', makeDirContents());
      cache.invalidate('d1');
      expect(cache.getDirContents('d1')).toBeUndefined();
      expect(cache.getDirContents('d2')).toBeDefined();
    });

    it('removes from both maps when id exists in both', () => {
      cache.setFileStat('x', makeStat());
      cache.setDirContents('x', makeDirContents());
      cache.invalidate('x');
      expect(cache.getFileStat('x')).toBeUndefined();
      expect(cache.getDirContents('x')).toBeUndefined();
    });
  });

  describe('invalidateAll', () => {
    it('clears all entries from both maps', () => {
      cache.setFileStat('f1', makeStat());
      cache.setFileStat('f2', makeStat());
      cache.setDirContents('d1', makeDirContents());
      cache.invalidateAll();
      expect(cache.getFileStat('f1')).toBeUndefined();
      expect(cache.getFileStat('f2')).toBeUndefined();
      expect(cache.getDirContents('d1')).toBeUndefined();
    });
  });

  describe('default TTL', () => {
    it('uses 30s TTL when no argument provided', () => {
      const defaultCache = new MetadataCache();
      defaultCache.setFileStat('f1', makeStat());
      // Still valid at 29.9s
      jest.advanceTimersByTime(29_900);
      expect(defaultCache.getFileStat('f1')).toBeDefined();
      // Expired at 30.1s
      jest.advanceTimersByTime(200);
      expect(defaultCache.getFileStat('f1')).toBeUndefined();
    });
  });
});
