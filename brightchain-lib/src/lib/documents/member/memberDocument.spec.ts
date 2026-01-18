/* eslint-disable @typescript-eslint/no-explicit-any */
import { ECIESService, EmailString, Member } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import MemberType from '../../enumerations/memberType';
import { MemberError } from '../../errors/memberError';
import { ServiceProvider } from '../../services/service.provider';
import { Checksum } from '../../types/checksum';
import { MemberDocument } from './memberDocument';

describe('MemberDocument', () => {
  let eciesService: ECIESService<Uint8Array>;
  let publicMember: Member<Uint8Array>;
  let privateMember: Member<Uint8Array>;
  let idProvider: any;

  beforeEach(async () => {
    // Initialize service provider
    ServiceProvider.getInstance();
    eciesService = ServiceProvider.getInstance().eciesService;
    idProvider = ServiceProvider.getInstance().idProvider;

    // Create test members
    const { member: pub } = Member.newMember(
      eciesService,
      MemberType.User,
      'testuser',
      new EmailString('test@example.com'),
    );
    const { member: priv } = Member.newMember(
      eciesService,
      MemberType.User,
      'testuser-private',
      new EmailString('private@example.com'),
    );

    publicMember = pub;
    privateMember = priv;
  });

  describe('Factory Pattern', () => {
    it('should create a document using factory method', () => {
      const doc = MemberDocument.create(publicMember, privateMember);

      expect(doc).toBeInstanceOf(MemberDocument);
      expect(doc.id).toBe(idProvider.idToString(publicMember.id));
      expect(doc.name).toBe(publicMember.name);
      expect(doc.type).toBe(publicMember.type);
    });

    it('should accept custom block size configuration via factory method', () => {
      const doc = MemberDocument.create(
        publicMember,
        privateMember,
        undefined,
        undefined,
        { blockSize: BlockSize.Large },
      );

      expect(doc).toBeInstanceOf(MemberDocument);
    });

    it('should throw error for invalid member data', () => {
      const invalidMember = { ...publicMember, id: undefined } as any;

      expect(() => {
        MemberDocument.create(invalidMember, privateMember);
      }).toThrow(MemberError);
    });
  });

  describe('CBL Generation', () => {
    let doc: MemberDocument<Uint8Array>;

    beforeEach(() => {
      doc = MemberDocument.create(publicMember, privateMember);
    });

    it('should generate CBLs successfully', async () => {
      await doc.generateCBLs();

      expect(doc.getPublicCBL()).toBeInstanceOf(Checksum);
      expect(doc.getPrivateCBL()).toBeInstanceOf(Checksum);
    });

    it('should create valid CBL data', async () => {
      await doc.generateCBLs();

      const publicCBL = await doc.toPublicCBL();
      const privateCBL = await doc.toPrivateCBL();

      expect(publicCBL).toBeInstanceOf(Uint8Array);
      expect(privateCBL).toBeInstanceOf(Uint8Array);
      expect(publicCBL.length).toBeGreaterThan(0);
      expect(privateCBL.length).toBeGreaterThan(0);
    });

    it('should throw error when accessing CBL IDs before generation', () => {
      expect(() => doc.getPublicCBL()).toThrow('Public CBL ID not set');
      expect(() => doc.getPrivateCBL()).toThrow('Private CBL ID not set');
    });
  });

  describe('CBL Serialization/Deserialization', () => {
    let doc: MemberDocument<Uint8Array>;
    let publicCBL: Uint8Array;
    let privateCBL: Uint8Array;

    beforeEach(async () => {
      doc = MemberDocument.create(publicMember, privateMember);
      await doc.generateCBLs();
      publicCBL = await doc.toPublicCBL();
      privateCBL = await doc.toPrivateCBL();
    });

    it('should create document from CBLs', async () => {
      const newDoc = MemberDocument.create(publicMember, privateMember);
      await newDoc.createFromCBLs(publicCBL, privateCBL);

      expect(newDoc.id).toBe(doc.id);
      expect(newDoc.name).toBe(doc.name);
      expect(newDoc.type).toBe(doc.type);
    });

    it('should preserve member data through CBL round-trip', async () => {
      const newDoc = MemberDocument.create(publicMember, privateMember);
      await newDoc.createFromCBLs(publicCBL, privateCBL);

      const originalPublic = await doc.toMember(false);
      const restoredPublic = await newDoc.toMember(false);

      expect(idProvider.idToString(restoredPublic.id)).toBe(
        idProvider.idToString(originalPublic.id),
      );
      expect(restoredPublic.name).toBe(originalPublic.name);
      expect(restoredPublic.type).toBe(originalPublic.type);
    });

    it('should handle invalid CBL data', async () => {
      const invalidCBL = new Uint8Array([1, 2, 3, 4, 5]);
      const newDoc = MemberDocument.create(publicMember, privateMember);

      await expect(
        newDoc.createFromCBLs(invalidCBL, privateCBL),
      ).rejects.toThrow(MemberError);
    });
  });

  describe('Member Conversion', () => {
    let doc: MemberDocument<Uint8Array>;

    beforeEach(async () => {
      doc = MemberDocument.create(publicMember, privateMember);
      await doc.generateCBLs();
    });

    it('should convert to public member', async () => {
      const member = await doc.toMember(false);

      expect(member).toBeInstanceOf(Member);
      expect(idProvider.idToString(member.id)).toBe(
        idProvider.idToString(publicMember.id),
      );
      expect(member.name).toBe(publicMember.name);
    });

    it('should convert to private member', async () => {
      const member = await doc.toMember(true);

      expect(member).toBeInstanceOf(Member);
      expect(idProvider.idToString(member.id)).toBe(
        idProvider.idToString(privateMember.id),
      );
    });
  });

  describe('JSON Serialization', () => {
    let doc: MemberDocument<Uint8Array>;

    beforeEach(() => {
      doc = MemberDocument.create(publicMember, privateMember);
    });

    it('should serialize public data to JSON', () => {
      const json = doc.toPublicJson();
      const data = JSON.parse(json);

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('type');
    });

    it('should serialize private data to JSON', () => {
      const json = doc.toPrivateJson();
      const data = JSON.parse(json);

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email');
    });
  });

  describe('Data Access', () => {
    let doc: MemberDocument<Uint8Array>;

    beforeEach(() => {
      doc = MemberDocument.create(publicMember, privateMember);
    });

    it('should provide access to public data properties', () => {
      expect(doc.id).toBe(idProvider.idToString(publicMember.id));
      expect(doc.name).toBe(publicMember.name);
      expect(doc.type).toBe(publicMember.type);
      expect(doc.email).toEqual(publicMember.email);
      expect(doc.dateCreated).toBeInstanceOf(Date);
      expect(doc.dateUpdated).toBeInstanceOf(Date);
    });

    it('should provide access to cryptographic keys', () => {
      expect(doc.publicKey).toBeInstanceOf(Uint8Array);
      expect(doc.votingPublicKey).toBeInstanceOf(Uint8Array);
      expect(doc.privateKey).toBeUndefined();
      expect(doc.votingPrivateKey).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle member creation errors', () => {
      const invalidMember = { ...publicMember, name: undefined } as any;

      expect(() => {
        MemberDocument.create(invalidMember, privateMember);
      }).toThrow(MemberError);
    });

    it('should handle CBL generation errors', async () => {
      const doc = MemberDocument.create(publicMember, privateMember);

      // Mock the CBL service to throw an error
      const originalService = (doc as any).cblService;
      (doc as any).cblService = {
        createMemberCbl: jest.fn().mockRejectedValue(new Error('Test error')),
      };

      await expect(doc.generateCBLs()).rejects.toThrow(MemberError);

      // Restore original service
      (doc as any).cblService = originalService;
    });
  });

  describe('Generic Type Support', () => {
    it('should work with string IDs', async () => {
      const { member: stringMember } = Member.newMember<string>(
        eciesService as unknown as ECIESService<string>,
        MemberType.User,
        'string-user',
        new EmailString('string@example.com'),
      );

      const doc = MemberDocument.create<string>(stringMember, stringMember);
      await doc.generateCBLs();

      expect(doc.id).toEqual(stringMember.id.toString()); // Compare with string representation
      expect(typeof doc.id).toBe('string');
    });

    it('should maintain type consistency through CBL operations', async () => {
      const doc = MemberDocument.create<Uint8Array>(
        publicMember,
        privateMember,
      );
      await doc.generateCBLs();

      const publicCBL = await doc.toPublicCBL();
      const privateCBL = await doc.toPrivateCBL();

      const newDoc = MemberDocument.create<Uint8Array>(
        publicMember,
        privateMember,
      );
      await newDoc.createFromCBLs(publicCBL, privateCBL);

      const member = await newDoc.toMember();
      // The member ID should be consistent with the original type
      expect(idProvider.idToString(member.id)).toBe(
        idProvider.idToString(publicMember.id),
      );
    });
  });

  describe('Block Store Integration', () => {
    let doc: MemberDocument<Uint8Array>;
    let blockStore: any;

    beforeEach(() => {
      doc = MemberDocument.create(publicMember, privateMember);
      blockStore = (doc as any).cblService.getBlockStore();
    });

    it('should use the configured block store', () => {
      expect(blockStore).toBeDefined();
      expect(typeof blockStore.setData).toBe('function');
      expect(typeof blockStore.getData).toBe('function');
    });

    it('should store constituent blocks in the block store', async () => {
      await doc.generateCBLs();

      // The CBL blocks themselves are not stored in the block store
      // Instead, the constituent blocks (data blocks) that make up the CBL are stored
      // We can verify the block store has blocks by checking its size
      expect(blockStore.size()).toBeGreaterThan(0);

      // We can also verify that we can get the CBL IDs
      const publicCBLId = doc.getPublicCBL();
      const privateCBLId = doc.getPrivateCBL();

      expect(publicCBLId).toBeInstanceOf(Checksum);
      expect(privateCBLId).toBeInstanceOf(Checksum);
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom block size configuration', () => {
      const smallDoc = MemberDocument.create(
        publicMember,
        privateMember,
        undefined,
        undefined,
        { blockSize: BlockSize.Small },
      );

      const largeDoc = MemberDocument.create(
        publicMember,
        privateMember,
        undefined,
        undefined,
        { blockSize: BlockSize.Large },
      );

      expect(smallDoc).toBeInstanceOf(MemberDocument);
      expect(largeDoc).toBeInstanceOf(MemberDocument);
    });

    it('should use default block size when not specified', () => {
      const doc = MemberDocument.create(publicMember, privateMember);
      expect(doc).toBeInstanceOf(MemberDocument);
    });
  });
});
