import { BslpPrivacyMode } from '../enumerations/bslp-privacy-mode';
import {
  formatBrightDnsTxt,
  parseBrightDnsTxt,
  validateLocationPublishRequest,
} from './index';

describe('BSLP validation', () => {
  const validBody = {
    ipAddress: '203.0.113.10',
    vector: { lat: 47.1996, lon: -122.2531, alt: 140, epoch: 'J2000.0' },
    privacy: {
      mode: BslpPrivacyMode.Heisenberg,
      injectedDelayMd: 0.005,
      fuzzRadiusKm: 50,
    },
    signature: 'a'.repeat(128),
  };

  it('accepts a valid Heisenberg announcement', () => {
    const result = validateLocationPublishRequest(validBody);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invalid IP addresses', () => {
    const result = validateLocationPublishRequest({
      ...validBody,
      ipAddress: 'not-an-ip',
    });
    expect(result.valid).toBe(false);
  });

  it('accepts IPv6 addresses', () => {
    const result = validateLocationPublishRequest({
      ...validBody,
      ipAddress: '2001:db8::1',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects heisenberg mode without fuzz radius', () => {
    const result = validateLocationPublishRequest({
      ...validBody,
      privacy: {
        mode: BslpPrivacyMode.Heisenberg,
        injectedDelayMd: 0.005,
        fuzzRadiusKm: 0,
      },
    });
    expect(result.valid).toBe(false);
  });

  it('round-trips DNS TXT format', () => {
    const txt = formatBrightDnsTxt(validBody.vector, validBody.privacy);
    expect(txt).toContain('bst=47.1996,-122.2531,140m');
    expect(txt).toContain('heisenberg=0.005md');
    const parsed = parseBrightDnsTxt(txt);
    expect(parsed?.vector.lat).toBe(47.1996);
    expect(parsed?.injectedDelayMd).toBe(0.005);
  });
});
