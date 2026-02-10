import fc from 'fast-check';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { initializeBrightChain } from '../init';
import { EntryPropertyRecord } from '../interfaces/brightpass';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';
import { VCBLService } from './vcblService';

// Feature: brightpass-password-manager, Property 29: VCBL binary serialization round-trip

const arbitraryEntryPropertyRecord = (): fc.Arbitrary<EntryPropertyRecord> =>
  fc.record({
    entryType: fc.constantFrom(
      'login',
      'secure_note',
      'credit_card',
      'identity',
    ),
    title: fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => s.trim().length > 0),
    tags: fc.array(
      fc
        .string({ minLength: 1, maxLength: 20 })
        .filter((s) => !s.includes(',') && s.trim().length > 0),
      { maxLength: 5 },
    ),
    favorite: fc.boolean(),
    createdAt: fc
      .integer({ min: 946684800000, max: 4102444800000 })
      .map((ms) => new Date(ms)),
    updatedAt: fc
      .integer({ min: 946684800000, max: 4102444800000 })
      .map((ms) => new Date(ms)),
    siteUrl: fc.oneof(fc.webUrl(), fc.constant('')),
  });

describe('VCBLService', () => {
  let vcblService: VCBLService;
  let cblService: CBLService;

  beforeAll(() => {
    initializeBrightChain();
  });

  beforeEach(() => {
    const checksumService = new ChecksumService();
    const eciesService = ServiceProvider.getInstance().eciesService;
    const idProvider = ServiceProvider.getInstance().idProvider;
    cblService = new CBLService(checksumService, eciesService, idProvider);
    vcblService = new VCBLService(cblService, checksumService);
  });

  describe('Property 29: VCBL binary serialization round-trip', () => {
    it('round-trips a single EntryPropertyRecord through binary serialization', () => {
      fc.assert(
        fc.property(arbitraryEntryPropertyRecord(), (record) => {
          const binary = vcblService.serializePropertyRecord(record);
          const { record: result } = vcblService.deserializePropertyRecord(
            binary,
            0,
          );

          expect(result.entryType).toBe(record.entryType);
          expect(result.title).toBe(record.title);
          expect(result.tags).toEqual(record.tags);
          expect(result.favorite).toBe(record.favorite);
          expect(result.createdAt.getTime()).toBe(record.createdAt.getTime());
          expect(result.updatedAt.getTime()).toBe(record.updatedAt.getTime());
          expect(result.siteUrl).toBe(record.siteUrl);
        }),
        { numRuns: 100 },
      );
    });

    it('round-trips multiple EntryPropertyRecords through binary serialization', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryEntryPropertyRecord(), {
            minLength: 0,
            maxLength: 10,
          }),
          (records) => {
            const binary = vcblService.serializePropertyRecords(records);
            const result = vcblService.parsePropertyRecords(
              binary,
              records.length,
            );

            expect(result.length).toBe(records.length);
            for (let i = 0; i < records.length; i++) {
              expect(result[i].entryType).toBe(records[i].entryType);
              expect(result[i].title).toBe(records[i].title);
              expect(result[i].tags).toEqual(records[i].tags);
              expect(result[i].favorite).toBe(records[i].favorite);
              expect(result[i].createdAt.getTime()).toBe(
                records[i].createdAt.getTime(),
              );
              expect(result[i].updatedAt.getTime()).toBe(
                records[i].updatedAt.getTime(),
              );
              expect(result[i].siteUrl).toBe(records[i].siteUrl);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('maintains index alignment when serializing multiple records', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryEntryPropertyRecord(), {
            minLength: 2,
            maxLength: 10,
          }),
          (records) => {
            const binary = vcblService.serializePropertyRecords(records);
            const result = vcblService.parsePropertyRecords(
              binary,
              records.length,
            );

            // Verify each record at index i matches the original at index i
            for (let i = 0; i < records.length; i++) {
              expect(result[i].title).toBe(records[i].title);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: brightpass-password-manager, Property 33: VCBL capacity is bounded by ExtendedCBL capacity
  describe('Property 33: VCBL capacity is bounded by ExtendedCBL capacity', () => {
    const blockSizes = [BlockSize.Small, BlockSize.Medium, BlockSize.Large];
    const encryptionTypes = [
      BlockEncryptionType.None,
      BlockEncryptionType.SingleRecipient,
    ];

    it('VCBL capacity ≤ ExtendedCBL capacity for any block size and encryption type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...blockSizes),
          fc.constantFrom(...encryptionTypes),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 20 }),
          (
            blockSize,
            encryptionType,
            vaultName,
            sharedMemberCount,
            propertyRecordCount,
          ) => {
            const extendedCblCapacity = cblService.calculateCBLAddressCapacity(
              blockSize,
              encryptionType,
              { fileName: 'vault', mimeType: 'application/x-brightchain-vcbl' },
            );

            const vcblCapacity = vcblService.calculateVcblCapacity(
              blockSize,
              encryptionType,
              vaultName,
              sharedMemberCount,
              propertyRecordCount,
            );

            expect(vcblCapacity).toBeLessThanOrEqual(extendedCblCapacity);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: brightpass-password-manager, Property 34: VCBL capacity decreases monotonically with entry count
  describe('Property 34: VCBL capacity decreases monotonically with entry count', () => {
    const blockSizes = [BlockSize.Small, BlockSize.Medium, BlockSize.Large];
    const encryptionTypes = [
      BlockEncryptionType.None,
      BlockEncryptionType.SingleRecipient,
    ];

    it('increasing property record count yields non-increasing capacity', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...blockSizes),
          fc.constantFrom(...encryptionTypes),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 0, max: 3 }),
          fc.integer({ min: 0, max: 50 }),
          (
            blockSize,
            encryptionType,
            vaultName,
            sharedMemberCount,
            baseCount,
          ) => {
            const capacityA = vcblService.calculateVcblCapacity(
              blockSize,
              encryptionType,
              vaultName,
              sharedMemberCount,
              baseCount,
            );

            const capacityB = vcblService.calculateVcblCapacity(
              blockSize,
              encryptionType,
              vaultName,
              sharedMemberCount,
              baseCount + 1,
            );

            expect(capacityB).toBeLessThanOrEqual(capacityA);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: brightpass-password-manager, Property 35: recommendBlockSize returns smallest sufficient size
  describe('Property 35: recommendBlockSize returns smallest sufficient size', () => {
    const encryptionTypes = [
      BlockEncryptionType.None,
      BlockEncryptionType.SingleRecipient,
    ];
    const orderedSizes = [BlockSize.Small, BlockSize.Medium, BlockSize.Large];

    it('returned block size has sufficient capacity and next smaller does not', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...encryptionTypes),
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.integer({ min: 0, max: 3 }),
          fc.integer({ min: 1, max: 50 }),
          (encryptionType, vaultName, sharedMemberCount, desiredEntryCount) => {
            const recommended = vcblService.recommendBlockSize(
              vaultName,
              sharedMemberCount,
              desiredEntryCount,
              encryptionType,
            );

            if (recommended === null) {
              // No block size is large enough — verify the largest size can't fit
              const largestCapacity = vcblService.calculateVcblCapacity(
                BlockSize.Large,
                encryptionType,
                vaultName,
                sharedMemberCount,
                desiredEntryCount,
              );
              expect(largestCapacity).toBeLessThan(desiredEntryCount);
            } else {
              // Recommended size should have sufficient capacity
              const capacity = vcblService.calculateVcblCapacity(
                recommended,
                encryptionType,
                vaultName,
                sharedMemberCount,
                desiredEntryCount,
              );
              expect(capacity).toBeGreaterThanOrEqual(desiredEntryCount);

              // Next smaller size (if exists) should NOT have sufficient capacity
              const idx = orderedSizes.indexOf(recommended);
              if (idx > 0) {
                const smallerSize = orderedSizes[idx - 1];
                const smallerCapacity = vcblService.calculateVcblCapacity(
                  smallerSize,
                  encryptionType,
                  vaultName,
                  sharedMemberCount,
                  desiredEntryCount,
                );
                expect(smallerCapacity).toBeLessThan(desiredEntryCount);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
