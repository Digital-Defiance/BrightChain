/**
 * HolidayCatalogController — unit tests.
 *
 * Verifies the GET / endpoint returns the static holiday catalog
 * with the expected shape and minimum entry count.
 *
 * @see Requirements 10.1, 10.2
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { IHolidayFeedEntry } from '@brightchain/brightcal-lib';
import { HolidayCatalogController } from '../controllers/holidayCatalogController.ts';
import { holidayCatalogData } from '../data/holidayCatalogData.ts';

// ─── Mock application ────────────────────────────────────────────────────────

function createMockApplication() {
  const mockServices = {
    get: jest.fn(() => null),
  };
  return {
    services: mockServices,
    db: { connection: { startSession: jest.fn() } },
    environment: { mongo: { useTransactions: false } },
    constants: {},
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('HolidayCatalogController', () => {
  let controller: HolidayCatalogController;

  beforeEach(() => {
    const app = createMockApplication();
    controller = new HolidayCatalogController(app as any);
  });

  describe('GET / (getCatalog)', () => {
    it('should return 200 with the holiday catalog array', async () => {
      const result = await (controller as any).handleGetCatalog();

      expect(result.statusCode).toBe(200);
      expect(result.response.catalog).toBeDefined();
      expect(Array.isArray(result.response.catalog)).toBe(true);
    });

    it('should return at least 10 entries', async () => {
      const result = await (controller as any).handleGetCatalog();

      expect(result.response.catalog.length).toBeGreaterThanOrEqual(10);
    });

    it('should have required fields on every entry', async () => {
      const result = await (controller as any).handleGetCatalog();
      const catalog: IHolidayFeedEntry[] = result.response.catalog;

      for (const entry of catalog) {
        expect(typeof entry.id).toBe('string');
        expect(entry.id.length).toBeGreaterThan(0);

        expect(typeof entry.displayName).toBe('string');
        expect(entry.displayName.length).toBeGreaterThan(0);

        expect(typeof entry.description).toBe('string');
        expect(entry.description.length).toBeGreaterThan(0);

        expect(typeof entry.region).toBe('string');
        expect(entry.region.length).toBeGreaterThan(0);

        expect(typeof entry.category).toBe('string');
        expect(entry.category.length).toBeGreaterThan(0);

        expect(typeof entry.icsUrl).toBe('string');
        expect(entry.icsUrl).toMatch(/^https?:\/\//);
      }
    });

    it('should return the same data as the static catalog constant', async () => {
      const result = await (controller as any).handleGetCatalog();

      expect(result.response.catalog).toBe(holidayCatalogData);
    });

    it('should include entries with unique IDs', async () => {
      const result = await (controller as any).handleGetCatalog();
      const catalog: IHolidayFeedEntry[] = result.response.catalog;
      const ids = catalog.map((e) => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
