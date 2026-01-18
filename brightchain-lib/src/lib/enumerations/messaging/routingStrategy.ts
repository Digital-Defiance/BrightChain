/**
 * @description Routing strategy for message delivery
 */
export enum RoutingStrategy {
  /** Direct routing to specific recipients */
  DIRECT = 'DIRECT',
  /** Gossip protocol for broadcast */
  GOSSIP = 'GOSSIP',
  /** Hybrid approach (direct + gossip) */
  HYBRID = 'HYBRID',
}
