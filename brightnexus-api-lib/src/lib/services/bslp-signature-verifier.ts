import {
  buildBslpSignablePayload,
  canonicalBslpSignPayloadBytes,
  normalizeBslpSignatureHex,
  type IBrightNexusLocationPublishRequest,
} from '@brightchain/brightnexus-lib';
import {
  ECIESService,
  type SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';

/**
 * Verifies BSLP publish signatures using DD-ECIES secp256k1 (same as member auth).
 */
export class BslpSignatureVerifier {
  constructor(private readonly ecies = new ECIESService()) {}

  verifyPublish(
    memberIdHex: string,
    body: IBrightNexusLocationPublishRequest,
    signatureHex: string,
    publicKeyHex: string,
  ): boolean {
    try {
      const payload = buildBslpSignablePayload(memberIdHex, body);
      const data = canonicalBslpSignPayloadBytes(payload);
      const publicKey = Buffer.from(publicKeyHex, 'hex');
      const sig = Uint8Array.from(
        Buffer.from(normalizeBslpSignatureHex(signatureHex), 'hex'),
      ) as SignatureUint8Array;
      if (publicKey.length !== 33 && publicKey.length !== 65) {
        return false;
      }
      return this.ecies.verifyMessage(publicKey, data, sig);
    } catch {
      return false;
    }
  }
}
