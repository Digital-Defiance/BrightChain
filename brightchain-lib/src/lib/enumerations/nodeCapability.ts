/**
 * Node capabilities in the BrightChain network
 */
export enum NodeCapability {
  STORAGE = 'storage', // Can store blocks
  ROUTING = 'routing', // Can route requests
  BRIGHT_TRUST = 'brightTrust', // Can participate in BrightTrust
  BOOTSTRAP = 'bootstrap', // Can act as bootstrap node
  METADATA = 'metadata', // Can store metadata
  TEMPERATURE = 'temperature', // Can track temperature
}
