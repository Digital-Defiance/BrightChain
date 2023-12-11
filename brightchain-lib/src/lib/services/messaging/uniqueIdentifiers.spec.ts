import { MessagePassingType } from '../../enumerations/messaging/messagePassingType';

describe('Unique Message Type Identifiers', () => {
  it('should have no conflicts with existing WebSocket message types', () => {
    const existingTypes = [
      'discovery:bloom_filter_request',
      'discovery:bloom_filter_response',
      'discovery:block_query',
      'discovery:block_query_response',
      'discovery:manifest_request',
      'discovery:manifest_response',
      'gossip:block_announcement',
      'gossip:block_removal',
      'gossip:announcement_batch',
      'heartbeat:ping',
      'heartbeat:pong',
    ];

    const messageTypes = Object.values(MessagePassingType);

    for (const msgType of messageTypes) {
      expect(existingTypes).not.toContain(msgType);
    }
  });

  it('should use message: prefix consistently', () => {
    const messageTypes = Object.values(MessagePassingType);

    for (const msgType of messageTypes) {
      expect(msgType).toMatch(/^message:/);
    }
  });

  it('should have unique identifiers within message passing types', () => {
    const messageTypes = Object.values(MessagePassingType);
    const uniqueTypes = new Set(messageTypes);

    expect(uniqueTypes.size).toBe(messageTypes.length);
  });

  it('should follow naming convention', () => {
    const messageTypes = Object.values(MessagePassingType);
    const expectedPattern = /^message:[a-z_]+$/;

    for (const msgType of messageTypes) {
      expect(msgType).toMatch(expectedPattern);
    }
  });
});
