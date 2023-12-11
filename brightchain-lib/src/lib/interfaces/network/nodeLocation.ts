/**
 * Node location information
 */
export interface NodeLocation {
  region: string;
  postalCode?: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  verificationMethod: 'OPERATOR' | 'IP' | 'LATENCY';
  lastVerified: Date;
}
