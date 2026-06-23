import { BslpPrivacyMode } from '../enumerations/bslp-privacy-mode';
import type {
  IBrightSpacetimePrivacy,
  IBrightSpacetimeVector,
  IBrightSpacetimeWellKnownManifest,
} from '../interfaces/bright-spacetime';
import {
  BSLP_PROTOCOL,
  BSLP_VERSION,
} from '../interfaces/bright-spacetime';

export function toWellKnownManifest(
  nodeId: string | undefined,
  vector: IBrightSpacetimeVector,
  privacy: IBrightSpacetimePrivacy,
  signature?: string,
): IBrightSpacetimeWellKnownManifest {
  const manifest: IBrightSpacetimeWellKnownManifest = {
    protocol: BSLP_PROTOCOL,
    version: BSLP_VERSION,
    vector,
    privacy,
  };
  if (nodeId) manifest.nodeId = nodeId;
  if (signature) manifest.signature = signature;
  return manifest;
}

export function privacyFromDnsParsed(
  injectedDelayMd: number,
  fuzzRadiusKm: number,
): IBrightSpacetimePrivacy {
  if (injectedDelayMd > 0 || fuzzRadiusKm > 0) {
    return {
      mode: BslpPrivacyMode.Heisenberg,
      injectedDelayMd,
      fuzzRadiusKm: fuzzRadiusKm > 0 ? fuzzRadiusKm : 1,
    };
  }
  return {
    mode: BslpPrivacyMode.Exact,
    injectedDelayMd: 0,
    fuzzRadiusKm: 0,
  };
}
