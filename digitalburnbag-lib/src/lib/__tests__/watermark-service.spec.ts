import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import type { IWatermarkIdentity } from '../interfaces/params/watermark-params';
import {
  IWatermarkServiceDeps,
  WatermarkService,
} from '../services/watermark-service';

// ── Helpers ─────────────────────────────────────────────────────────

function makeMockDeps(): jest.Mocked<IWatermarkServiceDeps<string>> {
  return {
    onAuditLog: jest.fn().mockResolvedValue(undefined),
  };
}

function makeAccessor(): IWatermarkIdentity<string> {
  return {
    userId: 'user-1',
    username: 'testuser',
    timestamp: '2024-06-01T12:00:00Z',
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('WatermarkService', () => {
  let deps: jest.Mocked<IWatermarkServiceDeps<string>>;
  let service: WatermarkService<string>;

  beforeEach(() => {
    deps = makeMockDeps();
    service = new WatermarkService(deps);
  });

  // ── applyVisibleWatermark ───────────────────────────────────────

  describe('applyVisibleWatermark', () => {
    it('should modify output content for supported MIME types', async () => {
      const content = new Uint8Array([1, 2, 3]);
      const accessor = makeAccessor();

      const result = await service.applyVisibleWatermark(
        content,
        'image/png',
        accessor,
      );

      // Content was modified — result is longer
      expect(result.length).toBeGreaterThan(content.length);

      // Result starts with the original content bytes
      expect(result.slice(0, content.length)).toEqual(content);

      // WM marker bytes appear immediately after original content
      const markerBytes = result.slice(content.length, content.length + 4);
      expect(markerBytes).toEqual(new Uint8Array([0xff, 0xd9, 0x57, 0x4d]));
    });

    it('should not modify content for unsupported MIME types', async () => {
      const content = new Uint8Array([1, 2, 3]);
      const accessor = makeAccessor();

      const result = await service.applyVisibleWatermark(
        content,
        'application/octet-stream',
        accessor,
      );

      expect(result).toBe(content);
    });

    it('should log an audit entry', async () => {
      const content = new Uint8Array([1, 2, 3]);
      const accessor = makeAccessor();

      await service.applyVisibleWatermark(content, 'image/png', accessor);

      expect(deps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.WatermarkApplied,
        }),
      );
    });
  });

  // ── applyInvisibleWatermark / extractWatermark ──────────────────

  describe('invisible watermark round-trip', () => {
    it('should embed then extract the original watermark ID', async () => {
      const content = new Uint8Array([10, 20, 30]);

      const watermarked = await service.applyInvisibleWatermark(
        content,
        'image/png',
        'watermark-abc-123',
      );

      const extracted = await service.extractWatermark(
        watermarked,
        'image/png',
      );

      expect(extracted).toBe('watermark-abc-123');
    });
  });

  describe('extractWatermark', () => {
    it('should return null when no marker is present', async () => {
      const result = await service.extractWatermark(
        new Uint8Array([1, 2, 3]),
        'image/png',
      );

      expect(result).toBeNull();
    });
  });
});
