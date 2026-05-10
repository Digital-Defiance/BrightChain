/**
 * Export/Import — property-based tests.
 *
 * Property 23: Export/Import Round-Trip (Req 16.1, 16.2)
 * Property 24: Duplicate Detection on Import (Req 16.3)
 * Property 25: JSON Export Completeness (Req 16.4)
 *
 * Uses fast-check with in-memory BrightDb, mirroring the existing test setup.
 */

import { EventTransparency, EventVisibility } from '@brightchain/brightcal-lib';
import {
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
  validBlockSizes,
} from '@brightchain/brightchain-lib';
import { BrightDb, InMemoryHeadRegistry } from '@brightchain/db';
import fc from 'fast-check';
import type { ICreateEventBody } from '../controllers/eventController.ts';
import { createCalendarCollectionModel } from '../models/calendarCollection.model.ts';
import type { ITypedCalendarEvent } from '../models/calendarEvent.model.ts';
import { createCalendarEventModel } from '../models/calendarEvent.model.ts';
import { createCalendarShareModel } from '../models/calendarShare.model.ts';
import { CalendarEngineService } from '../services/calendarEngineService.ts';
import { CalendarPermissionService } from '../services/calendarPermissionService.ts';
import { EncryptionService } from '../services/encryptionService.ts';
import { EventEngineService } from '../services/eventEngineService.ts';
import { ExportImportService } from '../services/exportImportService.ts';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

function makeDb(name = 'testdb'): BrightDb {
  const store = new MemoryBlockStore(validBlockSizes);
  const registry = InMemoryHeadRegistry.createIsolated();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BrightDb(store as any, { name, headRegistry: registry });
}

function createServices() {
  const db = makeDb();
  const calendarModel = createCalendarCollectionModel(db);
  const shareModel = createCalendarShareModel(db);
  const eventModel = createCalendarEventModel(db);
  const encryption = new EncryptionService();
  const calendarService = new CalendarEngineService(
    calendarModel,
    shareModel,
    encryption,
  );
  const permissionService = new CalendarPermissionService(
    calendarModel,
    shareModel,
  );
  const eventService = new EventEngineService(
    eventModel,
    calendarModel,
    permissionService,
    encryption,
  );
  const exportImportService = new ExportImportService(
    eventModel,
    calendarModel,
    permissionService,
    encryption,
  );
  return {
    eventService,
    calendarService,
    permissionService,
    exportImportService,
    eventModel,
  };
}

async function setupCalendar(
  calendarService: CalendarEngineService,
  ownerId: string,
  name = 'Test Cal',
) {
  return calendarService.createCalendar(ownerId, name, '#4285F4', '');
}

function makeEventBody(
  calendarId: string,
  overrides: Partial<ICreateEventBody> = {},
): ICreateEventBody {
  return {
    calendarId,
    summary: 'Default Event',
    dtstart: '2024-06-15T09:00:00Z',
    dtend: '2024-06-15T10:00:00Z',
    dtstartTzid: 'UTC',
    dtendTzid: 'UTC',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    ...overrides,
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const SAFE_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
const safeCharArb = fc
  .integer({ min: 0, max: SAFE_CHARS.length - 1 })
  .map((i) => SAFE_CHARS[i]);
const safeTextArb = fc
  .array(safeCharArb, { minLength: 2, maxLength: 20 })
  .map((chars) => chars.join('').trim() || 'text');

/** Generate a random event configuration for property tests. */
const eventConfigArb = fc.record({
  summary: safeTextArb,
  dayOffset: fc.integer({ min: 0, max: 29 }),
  hour: fc.integer({ min: 0, max: 22 }),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Export/Import — Property Tests', () => {
  // ── Property 23: Export/Import Round-Trip ────────────────────────────

  describe('Property 23: Export/Import Round-Trip', () => {
    /**
     * **Validates: Requirements 16.1, 16.2**
     *
     * For any calendar collection with events, exporting to ICS then
     * importing into a new calendar SHALL produce events equivalent to
     * the originals (matching by UID, with all properties preserved).
     */
    it('export to ICS then import produces equivalent events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(eventConfigArb, { minLength: 1, maxLength: 5 }),
          async (eventConfigs) => {
            // Use separate DB instances for source and target to avoid
            // UID uniqueness conflicts (the uid index is collection-wide).
            const sourceServices = createServices();
            const targetServices = createServices();
            const userId = 'owner';
            const sourceCal = await setupCalendar(
              sourceServices.calendarService,
              userId,
              'Source',
            );
            const targetCal = await setupCalendar(
              targetServices.calendarService,
              userId,
              'Target',
            );

            // Create events in source calendar
            const createdEvents: ITypedCalendarEvent[] = [];
            for (const config of eventConfigs) {
              const dtstart = new Date(
                2024,
                5,
                1 + config.dayOffset,
                config.hour,
                0,
                0,
              ).toISOString();
              const dtend = new Date(
                2024,
                5,
                1 + config.dayOffset,
                config.hour + 1,
                0,
                0,
              ).toISOString();

              const event = await sourceServices.eventService.createEvent(
                userId,
                makeEventBody(sourceCal.id, {
                  summary: config.summary,
                  dtstart,
                  dtend,
                }),
              );
              createdEvents.push(event);
            }

            // Export as ICS from source
            const icsData =
              await sourceServices.exportImportService.exportAsIcs(
                userId,
                sourceCal.id,
              );

            // Import into target calendar (separate DB, no UID conflicts)
            const result = await targetServices.exportImportService.importIcs(
              userId,
              targetCal.id,
              icsData,
              'skip',
            );

            // ASSERT: all events were imported
            expect(result.imported).toBe(createdEvents.length);

            // Verify imported events match originals by UID
            const importedEvents =
              await targetServices.exportImportService.exportAsJson(
                userId,
                targetCal.id,
              );

            expect(importedEvents.length).toBe(createdEvents.length);

            // Build UID maps for comparison
            const originalByUid = new Map(createdEvents.map((e) => [e.uid, e]));

            for (const imported of importedEvents) {
              const original = originalByUid.get(imported.uid);
              expect(original).toBeDefined();
              if (!original) continue;

              // Core properties preserved through round-trip
              expect(imported.summary).toBe(original.summary);
              expect(imported.dtstart.getTime()).toBe(
                original.dtstart.getTime(),
              );
              expect(imported.dtend.getTime()).toBe(original.dtend.getTime());
              expect(imported.sequence).toBe(original.sequence);
              expect(imported.status).toBe(original.status);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 24: Duplicate Detection on Import ──────────────────────

  describe('Property 24: Duplicate Detection on Import', () => {
    /**
     * **Validates: Requirements 16.3**
     *
     * For any ICS import containing events whose UIDs match existing
     * events in the target calendar, the system SHALL detect and report
     * all duplicates.
     */
    it('events with matching UIDs are detected and reported as duplicates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(eventConfigArb, { minLength: 1, maxLength: 5 }),
          fc.constantFrom(
            'skip' as const,
            'overwrite' as const,
            'create-new' as const,
          ),
          async (eventConfigs, strategy) => {
            const { eventService, calendarService, exportImportService } =
              createServices();
            const userId = 'owner';
            const cal = await setupCalendar(calendarService, userId);

            // Create events in the calendar
            const createdEvents: ITypedCalendarEvent[] = [];
            for (const config of eventConfigs) {
              const dtstart = new Date(
                2024,
                5,
                1 + config.dayOffset,
                config.hour,
                0,
                0,
              ).toISOString();
              const dtend = new Date(
                2024,
                5,
                1 + config.dayOffset,
                config.hour + 1,
                0,
                0,
              ).toISOString();

              const event = await eventService.createEvent(
                userId,
                makeEventBody(cal.id, {
                  summary: config.summary,
                  dtstart,
                  dtend,
                }),
              );
              createdEvents.push(event);
            }

            // Export as ICS (contains the same UIDs)
            const icsData = await exportImportService.exportAsIcs(
              userId,
              cal.id,
            );

            // Import back into the SAME calendar — all should be duplicates
            const result = await exportImportService.importIcs(
              userId,
              cal.id,
              icsData,
              strategy,
            );

            // ASSERT: all events detected as duplicates
            expect(result.duplicates.length).toBe(createdEvents.length);

            // Every original UID should appear in the duplicates list
            const duplicateSet = new Set(result.duplicates);
            for (const event of createdEvents) {
              expect(duplicateSet.has(event.uid)).toBe(true);
            }

            // Verify strategy-specific counts
            if (strategy === 'skip') {
              expect(result.skipped).toBe(createdEvents.length);
              expect(result.imported).toBe(0);
              expect(result.overwritten).toBe(0);
            } else if (strategy === 'overwrite') {
              expect(result.overwritten).toBe(createdEvents.length);
              expect(result.imported).toBe(0);
              expect(result.skipped).toBe(0);
            } else {
              // 'create-new': duplicates detected but new events created
              expect(result.imported).toBe(createdEvents.length);
              expect(result.skipped).toBe(0);
              expect(result.overwritten).toBe(0);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 25: JSON Export Completeness ───────────────────────────

  describe('Property 25: JSON Export Completeness', () => {
    /**
     * **Validates: Requirements 16.4**
     *
     * For any calendar collection, exporting to JSON SHALL produce a
     * document containing all event data fields for every event in the
     * collection.
     */
    it('JSON export contains all event data fields for every event', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(eventConfigArb, { minLength: 1, maxLength: 5 }),
          async (eventConfigs) => {
            const { eventService, calendarService, exportImportService } =
              createServices();
            const userId = 'owner';
            const cal = await setupCalendar(calendarService, userId);

            // Create events
            const createdEvents: ITypedCalendarEvent[] = [];
            for (const config of eventConfigs) {
              const dtstart = new Date(
                2024,
                5,
                1 + config.dayOffset,
                config.hour,
                0,
                0,
              ).toISOString();
              const dtend = new Date(
                2024,
                5,
                1 + config.dayOffset,
                config.hour + 1,
                0,
                0,
              ).toISOString();

              const event = await eventService.createEvent(
                userId,
                makeEventBody(cal.id, {
                  summary: config.summary,
                  dtstart,
                  dtend,
                }),
              );
              createdEvents.push(event);
            }

            // Export as JSON
            const exported = await exportImportService.exportAsJson(
              userId,
              cal.id,
            );

            // ASSERT: same number of events
            expect(exported.length).toBe(createdEvents.length);

            // Required fields that every event must have
            const requiredFields: (keyof ITypedCalendarEvent)[] = [
              'id',
              'calendarId',
              'uid',
              'sequence',
              'summary',
              'dtstart',
              'dtend',
              'dtstartTzid',
              'dtendTzid',
              'allDay',
              'visibility',
              'transparency',
              'status',
              'organizerId',
              'attendeeIds',
              'isRecurring',
              'blockId',
              'dateCreated',
              'dateModified',
              'searchText',
            ];

            // Build UID map for matching
            const originalByUid = new Map(createdEvents.map((e) => [e.uid, e]));

            for (const event of exported) {
              // Every required field must be present and defined
              for (const field of requiredFields) {
                expect(event[field]).toBeDefined();
              }

              // Verify data matches the original
              const original = originalByUid.get(event.uid);
              expect(original).toBeDefined();
              if (!original) continue;

              expect(event.id).toBe(original.id);
              expect(event.calendarId).toBe(original.calendarId);
              expect(event.uid).toBe(original.uid);
              expect(event.summary).toBe(original.summary);
              expect(event.sequence).toBe(original.sequence);
              expect(event.dtstart.getTime()).toBe(original.dtstart.getTime());
              expect(event.dtend.getTime()).toBe(original.dtend.getTime());
              expect(event.dtstartTzid).toBe(original.dtstartTzid);
              expect(event.dtendTzid).toBe(original.dtendTzid);
              expect(event.allDay).toBe(original.allDay);
              expect(event.visibility).toBe(original.visibility);
              expect(event.transparency).toBe(original.transparency);
              expect(event.status).toBe(original.status);
              expect(event.organizerId).toBe(original.organizerId);
              expect(event.isRecurring).toBe(original.isRecurring);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
