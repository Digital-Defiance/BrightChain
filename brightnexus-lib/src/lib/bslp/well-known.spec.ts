import { BslpPrivacyMode } from '../enumerations/bslp-privacy-mode';
import {
  defaultExactPrivacy,
  normalizeBrightSpacetimeVector,
  validateLocationPublishRequest,
} from './validation';
import { privacyFromDnsParsed, toWellKnownManifest } from './well-known';

describe('BSLP well-known helpers', () => {
  const vector = { lat: 1, lon: 2, alt: 3, epoch: '' };

  it('normalizes empty epoch to J2000.0', () => {
    expect(normalizeBrightSpacetimeVector(vector).epoch).toBe('J2000.0');
  });

  it('rejects exact mode with non-zero fuzz', () => {
    const result = validateLocationPublishRequest({
      ipAddress: '10.0.0.1',
      vector: { lat: 0, lon: 0, alt: 0, epoch: 'J2000.0' },
      privacy: {
        mode: BslpPrivacyMode.Exact,
        injectedDelayMd: 0.001,
        fuzzRadiusKm: 0,
      },
    });
    expect(result.valid).toBe(false);
  });

  it('builds well-known manifest with node id', () => {
    const privacy = defaultExactPrivacy();
    const manifest = toWellKnownManifest('node-abc', vector, privacy);
    expect(manifest.protocol).toBe('bright-spacetime');
    expect(manifest.nodeId).toBe('node-abc');
  });

  it('maps DNS heisenberg fields to privacy mode', () => {
    const privacy = privacyFromDnsParsed(0.01, 25);
    expect(privacy.mode).toBe(BslpPrivacyMode.Heisenberg);
    expect(privacy.fuzzRadiusKm).toBe(25);
  });
});
