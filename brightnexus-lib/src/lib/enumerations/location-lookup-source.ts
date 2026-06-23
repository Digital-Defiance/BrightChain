/**
 * Pedigree tag for coordinate resolution (bcurl / bping fallback matrix).
 */
export enum LocationLookupSource {
  Dht = 'DHT',
  Dns = 'DNS',
  WellKnown = 'WELL_KNOWN',
  Geo = 'GEO',
}
