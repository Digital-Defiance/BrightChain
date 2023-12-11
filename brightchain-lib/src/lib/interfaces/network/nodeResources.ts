/**
 * Node resource metrics
 */
export interface NodeResources {
  storage: {
    total: number; // Total storage in bytes
    available: number; // Available storage in bytes
    reserved: number; // Reserved for pending operations
  };
  bandwidth: {
    up: number; // Upload bandwidth in bytes/sec
    down: number; // Download bandwidth in bytes/sec
    latency: number; // Average latency in ms
  };
  reliability: {
    uptime: number; // Uptime percentage
    successRate: number; // Operation success rate
  };
}
