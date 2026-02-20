/**
 * Client event types delivered over the Client WebSocket Channel.
 *
 * @see Requirements 9.3, 9.4, 10.1
 */
export enum ClientEventType {
  PeerConnected = 'peer:connected',
  PeerDisconnected = 'peer:disconnected',
  PoolChanged = 'pool:changed',
  PoolCreated = 'pool:created',
  PoolDeleted = 'pool:deleted',
  EnergyBalanceUpdated = 'energy:updated',
  StorageAlert = 'storage:alert',
  TokenExpiring = 'auth:token_expiring',
}

/**
 * Access tier controlling which members receive a given event.
 *
 * @see Requirements 9.4, 10.1
 */
export enum ClientEventAccessTier {
  Public = 'public',
  Admin = 'admin',
  PoolScoped = 'pool-scoped',
  MemberScoped = 'member-scoped',
}

/**
 * Typed envelope for real-time client events.
 *
 * @see Requirements 9.4, 10.1
 */
export interface IClientEvent<TID = string> {
  eventType: ClientEventType;
  accessTier: ClientEventAccessTier;
  payload: unknown;
  timestamp: string; // ISO 8601
  correlationId: string;
  targetPoolId?: string; // for pool-scoped events
  targetMemberId?: TID; // for member-scoped events
}

/**
 * Subscription message sent by clients to manage event subscriptions.
 *
 * @see Requirements 9.3, 10.1
 */
export interface ISubscriptionMessage {
  action: 'subscribe' | 'unsubscribe';
  eventTypes: ClientEventType[];
}
