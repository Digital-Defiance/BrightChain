import fc from 'fast-check';
import { RoutingStrategy } from '../../enumerations/messaging/routingStrategy';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { MessageRouter } from './messageRouter';

describe('Feature: message-passing-and-events, Property: Routing Strategy Determination', () => {
  let mockMetadataStore: jest.Mocked<IMessageMetadataStore>;
  const localNodeId = 'test-node';

  beforeEach(() => {
    mockMetadataStore = {} as jest.Mocked<IMessageMetadataStore>;
  });

  it('Property 11: Routing Strategy Determination - empty recipients returns GOSSIP', () => {
    fc.assert(
      fc.property(fc.constant(undefined), () => {
        const router = new MessageRouter(mockMetadataStore, localNodeId);
        const strategy = router.determineStrategy([]);
        expect(strategy).toBe(RoutingStrategy.GOSSIP);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 11: Routing Strategy Determination - non-empty recipients returns DIRECT', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string().filter((s) => s.length > 0),
          { minLength: 1 },
        ),
        (recipients) => {
          const router = new MessageRouter(mockMetadataStore, localNodeId);
          const strategy = router.determineStrategy(recipients);
          expect(strategy).toBe(RoutingStrategy.DIRECT);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 11: Routing Strategy Determination - single recipient returns DIRECT', () => {
    fc.assert(
      fc.property(fc.string(), (recipient) => {
        const router = new MessageRouter(mockMetadataStore, localNodeId);
        const strategy = router.determineStrategy([recipient]);
        expect(strategy).toBe(RoutingStrategy.DIRECT);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 11: Routing Strategy Determination - multiple recipients returns DIRECT', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 2, maxLength: 20 }),
        (recipients) => {
          const router = new MessageRouter(mockMetadataStore, localNodeId);
          const strategy = router.determineStrategy(recipients);
          expect(strategy).toBe(RoutingStrategy.DIRECT);
        },
      ),
      { numRuns: 100 },
    );
  });
});
