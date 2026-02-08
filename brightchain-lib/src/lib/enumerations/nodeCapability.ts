/**
 * Node capabilities in the BrightChain network
 */
export enum NodeCapability {
  STORAGE = 'storage', // Can store blocks
  ROUTING = 'routing', // Can route requests
  QUORUM = 'quorum', // Can participate in quorum
  BOOTSTRAP = 'bootstrap', // Can act as bootstrap node
  METADATA = 'metadata', // Can store metadata
  TEMPERATURE = 'temperature', // Can track temperature
}
