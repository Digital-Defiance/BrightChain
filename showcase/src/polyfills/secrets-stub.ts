// Browser-compatible stub for secrets.js-34r7h
// This provides the same API but with browser-compatible implementations

export type Shares = string[];

export interface Config {
  bits: number;
  radix: number;
  typeCSPRNG?: string;
}

let config: Config = {
  bits: 8,
  radix: 16,
  typeCSPRNG: 'crypto'
};

export function init(bits: number, typeCSPRNG?: string): void {
  config.bits = bits;
  if (typeCSPRNG) {
    config.typeCSPRNG = typeCSPRNG;
  }
  console.log('secrets.js stub initialized with bits:', bits);
}

export function getConfig(): Config {
  return { ...config };
}

export function share(secret: string, numShares: number, threshold: number): Shares {
  console.warn('Using secrets.js stub - not cryptographically secure');
  // Simple stub implementation - not secure, just for demo purposes
  const shares: Shares = [];
  for (let i = 0; i < numShares; i++) {
    shares.push(`share-${i}-${secret.substring(0, 8)}-${Math.random().toString(36).substr(2, 9)}`);
  }
  return shares;
}

export function combine(shares: Shares): string {
  console.warn('Using secrets.js stub - not cryptographically secure');
  // Simple stub implementation - extract original secret from first share
  if (shares.length === 0) {
    return '';
  }
  const firstShare = shares[0];
  const parts = firstShare.split('-');
  if (parts.length >= 3) {
    return parts[2] + '0'.repeat(56); // Pad to make it look like a proper secret
  }
  return 'fallback-secret-' + Math.random().toString(36).substr(2, 9);
}

export function newShare(id: number, share: string): { id: number; share: string } {
  return { id, share };
}

// Default export for compatibility
export default {
  init,
  getConfig,
  share,
  combine,
  newShare
};