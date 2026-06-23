import { BslpPrivacyMode } from '../enumerations/bslp-privacy-mode';
import {
  buildBslpSignablePayload,
  canonicalBslpSignPayloadJson,
  normalizeBslpSignatureHex,
} from './signing';

describe('BSLP signing', () => {
  const body = {
    ipAddress: '203.0.113.55',
    vector: { lat: 47.2, lon: -122.3, alt: 140, epoch: 'J2000.0' },
    privacy: {
      mode: BslpPrivacyMode.Heisenberg,
      injectedDelayMd: 0.005,
      fuzzRadiusKm: 50,
    },
  };

  it('produces stable canonical JSON regardless of key order input', () => {
    const payload = buildBslpSignablePayload('member-abc', body);
    const json = canonicalBslpSignPayloadJson(payload);
    expect(json).toContain('"protocol":"bright-spacetime"');
    expect(json).toContain('"nodeId":"member-abc"');
    expect(json).toContain('"ipAddress":"203.0.113.55"');
    const again = canonicalBslpSignPayloadJson(
      buildBslpSignablePayload('member-abc', body),
    );
    expect(again).toBe(json);
  });

  it('strips 0x prefix from signature hex', () => {
    expect(normalizeBslpSignatureHex('0xabcd')).toBe('abcd');
    expect(normalizeBslpSignatureHex('ABCD')).toBe('ABCD');
  });
});
