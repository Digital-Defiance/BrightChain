import {
  BlockEncryptionType,
  BlockSize,
  CBLService,
  Checksum,
  ChecksumService,
} from '@brightchain/brightchain-lib';
import {
  ECIESService,
  Member,
  TypedIdProviderWrapper,
} from '@digitaldefiance/ecies-lib';
import * as fs from 'fs';

async function generateVectors() {
  const checksumService = new ChecksumService();
  const eciesService = new ECIESService<Uint8Array>();
  const idProvider = new TypedIdProviderWrapper<Uint8Array>();
  const cblService = new CBLService(checksumService, eciesService, idProvider);

  const creator = await Member.generate<Uint8Array>('TestCreator');

  // Generate CBL block
  const addresses = [
    Checksum.fromUint8Array(new Uint8Array(64).fill(0x11)),
    Checksum.fromUint8Array(new Uint8Array(64).fill(0x22)),
    Checksum.fromUint8Array(new Uint8Array(64).fill(0x33)),
  ];

  const addressList = new Uint8Array(addresses.length * 64);
  addresses.forEach((addr, i) => {
    addressList.set(addr.toUint8Array(), i * 64);
  });

  const { headerData: cblHeader } = cblService.makeCblHeader(
    creator,
    new Date(1234567890000),
    3,
    3072,
    addressList,
    BlockSize.Small,
    BlockEncryptionType.None,
    undefined,
    3,
  );

  const cblData = new Uint8Array(cblHeader.length + addressList.length);
  cblData.set(cblHeader);
  cblData.set(addressList, cblHeader.length);

  // Generate ExtendedCBL block
  const { headerData: ecblHeader } = cblService.makeCblHeader(
    creator,
    new Date(1234567890000),
    2,
    2048,
    addressList.slice(0, 128),
    BlockSize.Small,
    BlockEncryptionType.None,
    { fileName: 'test.txt', mimeType: 'text/plain' },
    2,
  );

  const ecblData = new Uint8Array(ecblHeader.length + 128);
  ecblData.set(ecblHeader);
  ecblData.set(addressList.slice(0, 128), ecblHeader.length);

  const vectors = {
    cbl: {
      hex: Buffer.from(cblData).toString('hex'),
      addressCount: 3,
      tupleSize: 3,
      originalDataLength: 3072,
      creatorId: Buffer.from(creator.idBytes).toString('hex'),
    },
    extendedCbl: {
      hex: Buffer.from(ecblData).toString('hex'),
      addressCount: 2,
      tupleSize: 2,
      originalDataLength: 2048,
      fileName: 'test.txt',
      mimeType: 'text/plain',
      creatorId: Buffer.from(creator.idBytes).toString('hex'),
    },
  };

  fs.writeFileSync(
    '../cbl_test_vectors.json',
    JSON.stringify(vectors, null, 2),
  );
  console.log('Generated test vectors in cbl_test_vectors.json');
}

generateVectors().catch(console.error);
