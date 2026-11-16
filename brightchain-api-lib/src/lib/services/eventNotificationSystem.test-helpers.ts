/**
 * Test helpers for EventNotificationSystem.
 */
import type { ICommunicationEventEmitter } from '@brightchain/brightchain-lib';
import { EventNotificationSystem } from './eventNotificationSystem';

/**
 * EventNotificationSystem covers conversation, group and channel events but
 * not the server-scoped ones in ICommunicationEventEmitter. Tests that pass it
 * to the communication services never create servers, so the server events
 * are no-ops here.
 */
export class CommunicationTestEventSystem
  extends EventNotificationSystem
  implements ICommunicationEventEmitter
{
  emitServerMemberRemoved(): void {
    /* not exercised by these tests */
  }

  emitServerChannelCreated(): void {
    /* not exercised by these tests */
  }

  emitServerChannelDeleted(): void {
    /* not exercised by these tests */
  }
}
