import { WebSocket } from 'ws';
import {
  EventNotificationSystem,
  IEventFilter,
  MessageEventType,
} from './eventNotificationSystem';

/**
 * WebSocket handler for message event subscriptions
 * Integrates EventNotificationSystem with WebSocket server
 */
export class MessageEventsWebSocketHandler {
  constructor(private readonly eventSystem: EventNotificationSystem) {}

  /**
   * Handle new WebSocket connection for event subscriptions
   */
  handleConnection(ws: WebSocket): void {
    // Subscribe with no filter initially
    this.eventSystem.subscribe(ws);

    // Handle incoming messages for filter updates
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'subscribe') {
          const filter: IEventFilter = {
            types: message.eventTypes as MessageEventType[],
            senderId: message.senderId,
            recipientId: message.recipientId,
          };

          // Unsubscribe and resubscribe with new filter
          this.eventSystem.unsubscribe(ws);
          this.eventSystem.subscribe(ws, filter);
        } else if (message.type === 'unsubscribe') {
          this.eventSystem.unsubscribe(ws);
        } else if (message.type === 'getHistory') {
          const filter: IEventFilter = {
            types: message.eventTypes as MessageEventType[],
            senderId: message.senderId,
            recipientId: message.recipientId,
          };
          const limit = message.limit || 100;
          const history = this.eventSystem.getEventHistory(filter, limit);
          ws.send(JSON.stringify({ type: 'history', events: history }));
        }
      } catch (error) {
        ws.send(
          JSON.stringify({ type: 'error', message: (error as Error).message }),
        );
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      this.eventSystem.unsubscribe(ws);
    });

    // Send confirmation
    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Subscribed to message events',
      }),
    );
  }
}
