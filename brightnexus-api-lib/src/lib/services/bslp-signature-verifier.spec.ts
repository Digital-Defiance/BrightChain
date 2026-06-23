import { BslpPrivacyMode } from '@brightchain/brightnexus-lib';
import {
  ensureTestMemberKeys,
  signSamplePublishBody,
} from '../__tests__/helpers/brightnexus-db';
import { BslpSignatureVerifier } from './bslp-signature-verifier';

describe('BslpSignatureVerifier', () => {
  it('verifies a signed publish body', () => {
    const memberId = 'verify-member-1';
    const publicKeyHex = ensureTestMemberKeys(memberId);
    const body = signSamplePublishBody(memberId);
    const verifier = new BslpSignatureVerifier();

    expect(
      verifier.verifyPublish(memberId, body, body.signature, publicKeyHex),
    ).toBe(true);
  });

  it('rejects tampered payloads', () => {
    const memberId = 'verify-member-2';
    const publicKeyHex = ensureTestMemberKeys(memberId);
    const body = signSamplePublishBody(memberId);
    const verifier = new BslpSignatureVerifier();

    expect(
      verifier.verifyPublish(
        memberId,
        {
          ...body,
          ipAddress: '198.51.100.1',
        },
        body.signature,
        publicKeyHex,
      ),
    ).toBe(false);
  });
});
