/**
 * Integration test: real SECP256k1 sign + verify through the ledger path.
 * Tests that EciesSignatureVerifier works end-to-end with real Member signing.
 */
import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
  type SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import { ChecksumService } from '../../services/checksum.service';
import { EciesSignatureVerifier } from '../eciesSignatureVerifier';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

describe('EciesSignatureVerifier integration', () => {
  let ecies: ECIESService<Uint8Array>;
  let serializer: LedgerEntrySerializer;
  let verifier: EciesSignatureVerifier;
  let member: Member<Uint8Array>;

  beforeAll(() => {
    ecies = new ECIESService<Uint8Array>();
    serializer = new LedgerEntrySerializer(new ChecksumService());
    verifier = new EciesSignatureVerifier(ecies);

    const result = Member.newMember(
      ecies,
      MemberType.User,
      'Alice',
      new EmailString('alice@test.org'),
    );
    member = result.member;
  });

  it('should verify a signature produced by Member.sign over an entryHash', () => {
    const partial = {
      sequenceNumber: 0,
      timestamp: new Date(),
      previousEntryHash: null,
      signerPublicKey: member.publicKey,
      payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    };

    const entryHash = serializer.computeEntryHash(partial);
    const entryHashBytes = entryHash.toUint8Array();

    // Sign the way Ledger.appendInternal does
    const signature = member.sign(entryHashBytes) as SignatureUint8Array;

    // Verify the way LedgerChainValidator.verifySignature does
    const isValid = verifier.verify(
      member.publicKey,
      entryHashBytes,
      signature,
    );

    console.log('entryHash length:', entryHashBytes.length);
    console.log('signature length:', signature.length);
    console.log('publicKey length:', member.publicKey.length);
    console.log('verify result:', isValid);

    // Also test direct ecies verification
    const directResult = ecies.verifyMessage(
      member.publicKey,
      entryHashBytes,
      signature,
    );
    console.log('direct ecies.verifyMessage:', directResult);

    // Also test member.verify
    const memberResult = member.verify(signature, entryHashBytes);
    console.log('member.verify:', memberResult);

    expect(isValid).toBe(true);
  });
});
