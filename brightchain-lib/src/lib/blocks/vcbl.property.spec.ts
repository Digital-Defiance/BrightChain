import { Member } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import CONSTANTS from '../constants';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { initializeBrightChain } from '../init';
import { EntryPropertyRecord } from '../interfaces/brightpass';
import { CBLService } from '../services/cblService';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { VCBLService } from '../services/vcblService';
import { TestMembers } from '../test/testMembers';
import { Checksum } from '../types/checksum';
import { VCBLBlock } from './vcbl';

// Feature: brightpass-password-manager, Property 5: VCBL index alignment invariant

describe('VCBLBlock', () => {
  let member: Member;
  let cblService: CBLService;
  let vcblService: VCBLService;
  let checksumService: ChecksumService;

  beforeAll(() => {
    initializeBrightChain();
  });

  beforeEach(async () => {
    checksumService = new ChecksumService();
    const eciesService = ServiceProvider.getInstance().eciesService;
    const idProvider = ServiceProvider.getInstance().idProvider;
    cblService = new CBLService(checksumService, eciesService, idProvider);
    vcblService = new VCBLService(cblService, checksumService);
    member = await TestMembers.getMember('user1');
  });

  describe('Property 5: VCBL index alignment invariant', () => {
    it('maintains property record count equal to address count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (entryCount, vaultName) => {
            // Create property records
            const propertyRecords: EntryPropertyRecord[] = [];
            const addresses: Checksum[] = [];

            for (let i = 0; i < entryCount; i++) {
              propertyRecords.push({
                entryType: 'login',
                title: `Entry ${i}`,
                tags: [],
                favorite: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                siteUrl: '',
              });
              // Create dummy address
              addresses.push(
                Checksum.fromUint8Array(
                  new Uint8Array(CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH).fill(
                    i,
                  ),
                ),
              );
            }

            // Build address list
            const addressList = new Uint8Array(
              entryCount * CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH,
            );
            for (let i = 0; i < entryCount; i++) {
              addressList.set(
                addresses[i].toUint8Array(),
                i * CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH,
              );
            }

            // Create VCBL header (includes CBL header + address list + vault header + property records)
            const { headerData } = vcblService.makeVcblHeader(
              member,
              vaultName.trim() || 'Vault',
              [],
              propertyRecords,
              addressList,
              BlockSize.Small,
              BlockEncryptionType.None,
            );

            // Pad to block size
            const paddedData = new Uint8Array(BlockSize.Small);
            paddedData.set(headerData, 0);

            // Create VCBLBlock
            const services = { cblService, checksumService };
            const vcblBlock = new VCBLBlock(
              paddedData,
              member,
              BlockSize.Small,
              services,
              vcblService,
            );

            // Verify index alignment
            expect(vcblBlock.propertyRecordCount).toBe(
              vcblBlock.cblAddressCount,
            );
            expect(vcblBlock.propertyRecordCount).toBe(entryCount);
            expect(vcblBlock.propertyRecords.length).toBe(entryCount);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('throws error when property record count does not match address count', () => {
      // Create mismatched data: 2 property records but 3 addresses
      const propertyRecords: EntryPropertyRecord[] = [
        {
          entryType: 'login',
          title: 'Entry 1',
          tags: [],
          favorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          siteUrl: '',
        },
        {
          entryType: 'login',
          title: 'Entry 2',
          tags: [],
          favorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          siteUrl: '',
        },
      ];

      const addresses: Checksum[] = [
        Checksum.fromUint8Array(
          new Uint8Array(CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH).fill(1),
        ),
        Checksum.fromUint8Array(
          new Uint8Array(CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH).fill(2),
        ),
        Checksum.fromUint8Array(
          new Uint8Array(CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH).fill(3),
        ),
      ];

      const addressList = new Uint8Array(
        3 * CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH,
      );
      for (let i = 0; i < 3; i++) {
        addressList.set(
          addresses[i].toUint8Array(),
          i * CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH,
        );
      }

      // makeVcblHeader should throw due to misalignment
      expect(() => {
        vcblService.makeVcblHeader(
          member,
          'TestVault',
          [],
          propertyRecords,
          addressList,
          BlockSize.Small,
          BlockEncryptionType.None,
        );
      }).toThrow(/Invalid CBL structure|must match address count/);
    });
  });
});
