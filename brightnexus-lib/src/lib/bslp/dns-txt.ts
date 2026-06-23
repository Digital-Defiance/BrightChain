import type { IBrightSpacetimePrivacy, IBrightSpacetimeVector } from '../interfaces/bright-spacetime';
import { BSLP_DEFAULT_EPOCH } from '../interfaces/bright-spacetime';

/**
 * Format a `_bright` DNS TXT record per BSLP:
 * `bst=<lat>,<lon>,<alt>m;epoch=<epoch>;[heisenberg=<delay_md>]`
 */
export function formatBrightDnsTxt(
  vector: IBrightSpacetimeVector,
  privacy: IBrightSpacetimePrivacy,
): string {
  const epoch = vector.epoch?.trim() || BSLP_DEFAULT_EPOCH;
  const alt = Math.round(vector.alt);
  let txt = `bst=${vector.lat},${vector.lon},${alt}m;epoch=${epoch}`;
  if (privacy.injectedDelayMd > 0) {
    txt += `;heisenberg=${privacy.injectedDelayMd}md`;
  }
  if (privacy.fuzzRadiusKm > 0) {
    txt += `;fuzz=${privacy.fuzzRadiusKm}km`;
  }
  return txt;
}

export interface IParsedBrightDnsTxt {
  vector: IBrightSpacetimeVector;
  injectedDelayMd: number;
  fuzzRadiusKm: number;
}

/**
 * Parse a BSLP DNS TXT payload (without surrounding quotes).
 */
export function parseBrightDnsTxt(txt: string): IParsedBrightDnsTxt | null {
  const parts = txt.split(';').map((p) => p.trim());
  let lat: number | undefined;
  let lon: number | undefined;
  let alt = 0;
  let epoch = BSLP_DEFAULT_EPOCH;
  let injectedDelayMd = 0;
  let fuzzRadiusKm = 0;

  for (const part of parts) {
    if (part.startsWith('bst=')) {
      const coords = part.slice(4);
      const match = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)m$/i.exec(
        coords,
      );
      if (!match) return null;
      lat = Number(match[1]);
      lon = Number(match[2]);
      alt = Number(match[3]);
    } else if (part.startsWith('epoch=')) {
      epoch = part.slice(6);
    } else if (part.startsWith('heisenberg=')) {
      const raw = part.slice(11).replace(/md$/i, '');
      injectedDelayMd = Number(raw);
      if (!Number.isFinite(injectedDelayMd)) return null;
    } else if (part.startsWith('fuzz=')) {
      const raw = part.slice(5).replace(/km$/i, '');
      fuzzRadiusKm = Number(raw);
      if (!Number.isFinite(fuzzRadiusKm)) return null;
    }
  }

  if (lat === undefined || lon === undefined) return null;

  return {
    vector: { lat, lon, alt, epoch },
    injectedDelayMd,
    fuzzRadiusKm,
  };
}
