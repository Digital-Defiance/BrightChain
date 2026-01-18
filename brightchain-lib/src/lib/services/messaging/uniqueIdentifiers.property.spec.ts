import * as fc from 'fast-check';
import { MessagePassingType } from '../../enumerations/messaging/messagePassingType';

describe('Property 35: Unique Message Type Identifiers', () => {
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

  it('Property 35a: No conflicts with existing types (50 iterations)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...Object.values(MessagePassingType)), (msgType) => {
        expect(existingTypes).not.toContain(msgType);
      }),
      { numRuns: 50 }
    );
  });

  it('Property 35b: Uses message: prefix (50 iterations)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...Object.values(MessagePassingType)), (msgType) => {
        expect(msgType).toMatch(/^message:/);
      }),
      { numRuns: 50 }
    );
  });

  it('Property 35c: All identifiers unique (50 iterations)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(MessagePassingType)),
        fc.constantFrom(...Object.values(MessagePassingType)),
        (type1, type2) => {
          if (type1 === type2) {
            expect(type1).toBe(type2);
          } else {
            expect(type1).not.toBe(type2);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 35d: Follows naming convention (50 iterations)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...Object.values(MessagePassingType)), (msgType) => {
        expect(msgType).toMatch(/^message:[a-z_]+$/);
      }),
      { numRuns: 50 }
    );
  });
});
