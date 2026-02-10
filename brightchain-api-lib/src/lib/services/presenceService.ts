/**
 * PresenceService — tracks member online status and broadcasts presence
 * changes via WebSocket through EventNotificationSystem.
 *
 * Maintains an in-memory map of member statuses and WebSocket connections.
 * When a member's status changes, the service broadcasts the change only
 * to members who share at least one context (conversation, group, or channel)
 * with them — determined by the shared-context resolver supplied at construction.
 *
 * Requirements: 7.3, 7.4
 */

import {
  CommunicationEventType,
  PresenceStatus,
} from '@brightchain/brightchain-lib';
import { WebSocket } from 'ws';

/**
 * Callback that resolves the set of member IDs who share at least one
 * conversation, group, or channel with the given member.
 */
export type SharedContextResolver = (memberId: string) => Set<string>;

/**
 * Presence change event payload sent over WebSocket.
 */
export interface IPresenceChangeEvent {
  type: CommunicationEventType.PRESENCE_CHANGED;
  timestamp: Date;
  data: {
    memberId: string;
    status: PresenceStatus;
  };
}

export class PresenceService {
  /** memberId → current presence status */
  private readonly statuses = new Map<string, PresenceStatus>();

  /** memberId → set of active WebSocket connections (supports multiple devices) */
  private readonly connections = new Map<string, Set<WebSocket>>();

  constructor(private readonly sharedContextResolver: SharedContextResolver) {}

  /**
   * Set a member's presence status and broadcast the change to members
   * who share a context with them.
   *
   * Requirement 7.3: broadcast status change to shared-context members.
   */
  setStatus(memberId: string, status: PresenceStatus): void {
    const previous = this.statuses.get(memberId) ?? PresenceStatus.OFFLINE;
    this.statuses.set(memberId, status);

    if (previous !== status) {
      this.broadcastPresenceChange(memberId, status);
    }
  }

  /**
   * Get a single member's current presence status.
   * Defaults to OFFLINE if the member has never connected.
   */
  getStatus(memberId: string): PresenceStatus {
    return this.statuses.get(memberId) ?? PresenceStatus.OFFLINE;
  }

  /**
   * Get presence statuses for multiple members at once.
   *
   * Requirement 7.4: deliver current presence of shared-context members on connect.
   */
  getStatusBulk(memberIds: string[]): Map<string, PresenceStatus> {
    const result = new Map<string, PresenceStatus>();
    for (const id of memberIds) {
      result.set(id, this.getStatus(id));
    }
    return result;
  }

  /**
   * Handle a member connecting via WebSocket.
   * Sets status to ONLINE (if currently OFFLINE) and delivers the current
   * presence of all shared-context members.
   *
   * Requirements: 7.3, 7.4
   */
  onConnect(memberId: string, ws: WebSocket): void {
    // Track the connection
    let memberConns = this.connections.get(memberId);
    if (!memberConns) {
      memberConns = new Set<WebSocket>();
      this.connections.set(memberId, memberConns);
    }
    memberConns.add(ws);

    // Auto-clean on close
    ws.on('close', () => {
      memberConns!.delete(ws);
      if (memberConns!.size === 0) {
        this.connections.delete(memberId);
        this.setStatus(memberId, PresenceStatus.OFFLINE);
      }
    });

    // Set online if currently offline
    if (this.getStatus(memberId) === PresenceStatus.OFFLINE) {
      this.setStatus(memberId, PresenceStatus.ONLINE);
    }

    // Deliver current presence of shared-context members (Req 7.4)
    const sharedMembers = this.sharedContextResolver(memberId);
    const bulkStatus = this.getStatusBulk([...sharedMembers]);
    const payload = {
      type: 'presence:bulk_status',
      timestamp: new Date(),
      data: Object.fromEntries(bulkStatus),
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  /**
   * Handle a member explicitly disconnecting.
   * Removes all WebSocket connections and sets status to OFFLINE.
   */
  onDisconnect(memberId: string): void {
    const memberConns = this.connections.get(memberId);
    if (memberConns) {
      for (const ws of memberConns) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
      memberConns.clear();
      this.connections.delete(memberId);
    }
    this.setStatus(memberId, PresenceStatus.OFFLINE);
  }

  /**
   * Broadcast a presence change event to all members who share a context
   * with the given member.
   *
   * Requirement 7.3: presence change delivered only to shared-context members.
   */
  private broadcastPresenceChange(
    memberId: string,
    status: PresenceStatus,
  ): void {
    const event: IPresenceChangeEvent = {
      type: CommunicationEventType.PRESENCE_CHANGED,
      timestamp: new Date(),
      data: { memberId, status },
    };

    const sharedMembers = this.sharedContextResolver(memberId);
    const serialized = JSON.stringify(event);

    for (const targetMemberId of sharedMembers) {
      // Don't send to the member whose status changed
      if (targetMemberId === memberId) continue;

      const targetConns = this.connections.get(targetMemberId);
      if (!targetConns) continue;

      for (const ws of targetConns) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(serialized);
        }
      }
    }
  }
}
