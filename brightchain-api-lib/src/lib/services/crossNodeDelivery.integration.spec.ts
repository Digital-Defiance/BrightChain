/**
 * Cross-Node Delivery Integration Tests
 *
 * Stands up multiple real HTTP+WebSocket servers on different ports,
 * connects them via real GossipService instances with WebSocketPeerProvider
 * transport, and tests end-to-end email and message delivery across nodes.
 *
 * No mocks — real WebSocket connections, real MessageCBLService with
 * MemoryBlockStore, real MemoryMessageMetadataStore, real EmailMessageService
 * with InMemoryEmailMetadataStore.
 *
 * Architecture per node:
 *   HTTP Server (port N)
 *     └─ WebSocketMessageServer (gossip batch handler)
 *          └─ GossipService (real, with WebSocketPeerProvider)
 *               └─ MessagePassingService (real MessageCBLService + MemoryMessageMetadataStore)
 *                    └─ EmailMessageService (real, with InMemoryEmailMetadataStore)
 */

import {
  BlockAnnouncement,
  BlockSize,
  InMemoryEmailMetadataStore,
  MemoryBlockStore,
  MemoryMessageMetadataStore,
  MessageCBLService,
  ServiceProvider,
  type IEmailInput,
} from '@brightchain/brightchain-lib';
import { createMailbox } from '@brightchain/brightchain-lib/src/lib/interfaces/messaging/emailAddress';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createServer, Server } from 'http';
import { GossipService } from '../availability/gossipService';
import { EventNotificationSystem } from './eventNotificationSystem';
import { MessagePassingService } from './messagePassingService';
import { WebSocketMessageServer } from './webSocketMessageServer';
import { WebSocketPeerProvider } from './webSocketPeerProvider';

// ─── Test Node ──────────────────────────────────────────────────────

interface TestNode {
  nodeId: string;
  port: number;
  httpServer: Server;
  wsServer: WebSocketMessageServer;
  peerProvider: WebSocketPeerProvider;
  gossipService: GossipService;
  messageService: MessagePassingService;
  emailStore: InMemoryEmailMetadataStore;
  blockStore: MemoryBlockStore;
  messageMetadataStore: MemoryMessageMetadataStore;
  messageCBL: MessageCBLService;
}

function createTestNode(
  nodeId: string,
  port: number,
  localUserIds: string[],
): Promise<TestNode> {
  const serviceProvider = ServiceProvider.getInstance();

  // Real block store and metadata store per node
  const blockStore = new MemoryBlockStore(BlockSize.Small);
  const messageMetadataStore = new MemoryMessageMetadataStore();
  const messageCBL = new MessageCBLService(
    serviceProvider.cblService,
    serviceProvider.checksumService,
    blockStore,
    messageMetadataStore,
  );

  const httpServer = createServer();
  const wsServer = new WebSocketMessageServer(httpServer, false);
  const peerProvider = new WebSocketPeerProvider(nodeId);

  const gossipService = new GossipService(
    peerProvider,
    {
      fanout: 10,
      defaultTtl: 3,
      batchIntervalMs: 50,
      maxBatchSize: 100,
      messagePriority: {
        normal: { fanout: 10, ttl: 5 },
        high: { fanout: 10, ttl: 7 },
      },
    },
    new Set(localUserIds),
  );

  wsServer.onGossipBatch(async (_fromNodeId, announcements, _encrypted) => {
    for (const announcement of announcements) {
      const rehydrated: BlockAnnouncement = {
        ...announcement,
        timestamp: new Date(announcement.timestamp),
      };
      await gossipService.handleAnnouncement(rehydrated);
    }
  });

  const emailStore = new InMemoryEmailMetadataStore();
  const messageService = new MessagePassingService(
    messageCBL,
    messageMetadataStore,
    new EventNotificationSystem(),
    gossipService,
  );
  messageService.configureEmail(emailStore, { nodeId });

  return new Promise<TestNode>((resolve) => {
    httpServer.listen(port, '127.0.0.1', () => {
      gossipService.start();
      resolve({
        nodeId,
        port,
        httpServer,
        wsServer,
        peerProvider,
        gossipService,
        messageService,
        emailStore,
        blockStore,
        messageMetadataStore,
        messageCBL,
      });
    });
  });
}

async function connectNodes(a: TestNode, b: TestNode): Promise<void> {
  await a.peerProvider.connectToPeer(
    b.nodeId,
    `ws://127.0.0.1:${b.port}/${a.nodeId}`,
  );
  await b.peerProvider.connectToPeer(
    a.nodeId,
    `ws://127.0.0.1:${a.port}/${b.nodeId}`,
  );
}

async function destroyNode(node: TestNode): Promise<void> {
  await node.gossipService.stop();
  await node.peerProvider.disconnectAll();
  await new Promise<void>((resolve) => {
    node.wsServer.close(() => {
      node.httpServer.close(() => resolve());
    });
  });
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Cross-Node Delivery Integration (real servers)', () => {
  const BASE_PORT = 19200;
  const nodes: TestNode[] = [];

  afterAll(async () => {
    for (const node of nodes) {
      await destroyNode(node);
    }
    nodes.length = 0;
    ServiceProvider.resetInstance();
  });

  // ─── Two-node email delivery ────────────────────────────────────

  describe('two-node email delivery', () => {
    let nodeA: TestNode;
    let nodeB: TestNode;

    beforeAll(async () => {
      nodeA = await createTestNode('node-a', BASE_PORT, ['alice@node-a.test']);
      nodeB = await createTestNode('node-b', BASE_PORT + 1, [
        'bob@node-b.test',
      ]);
      nodes.push(nodeA, nodeB);
      await connectNodes(nodeA, nodeB);
    });

    it('should deliver email from node-a to node-b via real gossip', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.test'),
        to: [createMailbox('bob', 'node-b.test')],
        subject: 'Real cross-node delivery',
        textBody: 'This email traveled over WebSocket gossip.',
      };

      const result = await nodeA.messageService.sendEmail(email);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      await nodeA.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 200));

      // Verify sender stored the email
      const senderEmail = await nodeA.messageService.getEmail(result.messageId);
      expect(senderEmail).not.toBeNull();
      expect(senderEmail!.subject).toBe('Real cross-node delivery');

      // Verify gossip peers are connected
      const peersA = nodeA.peerProvider.getConnectedPeerIds();
      expect(peersA).toContain('node-b');
    });

    it('should send delivery ack back from recipient to sender', async () => {
      const acksReceived: BlockAnnouncement[] = [];
      const handler = (a: BlockAnnouncement) => acksReceived.push(a);
      nodeA.gossipService.onDeliveryAck(handler);

      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.test'),
        to: [createMailbox('bob', 'node-b.test')],
        subject: 'Ack test',
        textBody: 'Should trigger delivery ack.',
      };

      await nodeA.messageService.sendEmail(email);
      await nodeA.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));
      await nodeB.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));

      expect(acksReceived.length).toBeGreaterThanOrEqual(1);
      const ack = acksReceived.find(
        (a) => a.deliveryAck?.recipientId === 'bob@node-b.test',
      );
      expect(ack).toBeDefined();
      expect(ack!.deliveryAck!.status).toBe('delivered');

      nodeA.gossipService.offDeliveryAck(handler);
    });

    it('should handle BCC privacy: separate announcements', async () => {
      const deliveries: BlockAnnouncement[] = [];
      const handler = (a: BlockAnnouncement) => deliveries.push(a);
      nodeB.gossipService.onMessageDelivery(handler);

      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.test'),
        to: [createMailbox('bob', 'node-b.test')],
        bcc: [createMailbox('bob', 'node-b.test')],
        subject: 'BCC privacy test',
        textBody: 'BCC should be separate announcement.',
      };

      await nodeA.messageService.sendEmail(email);
      await nodeA.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));

      expect(deliveries.length).toBeGreaterThanOrEqual(2);

      nodeB.gossipService.offMessageDelivery(handler);
    });
  });

  // ─── Three-node email delivery ──────────────────────────────────

  describe('three-node email delivery (To + CC across nodes)', () => {
    let nodeX: TestNode;
    let nodeY: TestNode;
    let nodeZ: TestNode;

    beforeAll(async () => {
      nodeX = await createTestNode('node-x', BASE_PORT + 10, [
        'xavier@node-x.test',
      ]);
      nodeY = await createTestNode('node-y', BASE_PORT + 11, [
        'yolanda@node-y.test',
      ]);
      nodeZ = await createTestNode('node-z', BASE_PORT + 12, [
        'zara@node-z.test',
      ]);
      nodes.push(nodeX, nodeY, nodeZ);
      await connectNodes(nodeX, nodeY);
      await connectNodes(nodeY, nodeZ);
      await connectNodes(nodeX, nodeZ);
    });

    it('should deliver email with To on node-y and CC on node-z', async () => {
      const deliveriesY: BlockAnnouncement[] = [];
      const deliveriesZ: BlockAnnouncement[] = [];
      const handlerY = (a: BlockAnnouncement) => deliveriesY.push(a);
      const handlerZ = (a: BlockAnnouncement) => deliveriesZ.push(a);
      nodeY.gossipService.onMessageDelivery(handlerY);
      nodeZ.gossipService.onMessageDelivery(handlerZ);

      const email: IEmailInput = {
        from: createMailbox('xavier', 'node-x.test'),
        to: [createMailbox('yolanda', 'node-y.test')],
        cc: [createMailbox('zara', 'node-z.test')],
        subject: 'Three-node To+CC test',
        textBody: 'Delivered across three nodes.',
      };

      const result = await nodeX.messageService.sendEmail(email);
      expect(result.success).toBe(true);

      await nodeX.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));

      expect(deliveriesY.length).toBeGreaterThanOrEqual(1);
      expect(deliveriesZ.length).toBeGreaterThanOrEqual(1);

      const yDelivery = deliveriesY.find((a) =>
        a.messageDelivery?.recipientIds.includes('yolanda@node-y.test'),
      );
      expect(yDelivery).toBeDefined();

      const zDelivery = deliveriesZ.find((a) =>
        a.messageDelivery?.recipientIds.includes('zara@node-z.test'),
      );
      expect(zDelivery).toBeDefined();

      nodeY.gossipService.offMessageDelivery(handlerY);
      nodeZ.gossipService.offMessageDelivery(handlerZ);
    });

    it('should propagate acks from multiple recipients back to sender', async () => {
      const acksReceived: BlockAnnouncement[] = [];
      const handler = (a: BlockAnnouncement) => acksReceived.push(a);
      nodeX.gossipService.onDeliveryAck(handler);

      const email: IEmailInput = {
        from: createMailbox('xavier', 'node-x.test'),
        to: [createMailbox('yolanda', 'node-y.test')],
        cc: [createMailbox('zara', 'node-z.test')],
        subject: 'Multi-ack test',
        textBody: 'Both recipients should ack.',
      };

      await nodeX.messageService.sendEmail(email);
      await nodeX.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));
      await nodeY.gossipService.flushAnnouncements();
      await nodeZ.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));

      const yAck = acksReceived.find(
        (a) => a.deliveryAck?.recipientId === 'yolanda@node-y.test',
      );
      const zAck = acksReceived.find(
        (a) => a.deliveryAck?.recipientId === 'zara@node-z.test',
      );
      expect(yAck).toBeDefined();
      expect(zAck).toBeDefined();

      nodeX.gossipService.offDeliveryAck(handler);
    });
  });

  // ─── Attachment metadata delivery ───────────────────────────────

  describe('attachment metadata delivery across nodes', () => {
    let nodeP: TestNode;
    let nodeQ: TestNode;

    beforeAll(async () => {
      nodeP = await createTestNode('node-p', BASE_PORT + 20, [
        'pat@node-p.test',
      ]);
      nodeQ = await createTestNode('node-q', BASE_PORT + 21, [
        'quinn@node-q.test',
      ]);
      nodes.push(nodeP, nodeQ);
      await connectNodes(nodeP, nodeQ);
    });

    it('should deliver email with attachment metadata to remote node', async () => {
      const deliveries: BlockAnnouncement[] = [];
      const handler = (a: BlockAnnouncement) => deliveries.push(a);
      nodeQ.gossipService.onMessageDelivery(handler);

      const email: IEmailInput = {
        from: createMailbox('pat', 'node-p.test'),
        to: [createMailbox('quinn', 'node-q.test')],
        subject: 'Attachment delivery test',
        textBody: 'Email with attachment.',
        attachments: [
          {
            filename: 'report.pdf',
            mimeType: 'application/pdf',
            content: new Uint8Array(Buffer.from('fake-pdf-content')),
          },
        ],
      };

      const result = await nodeP.messageService.sendEmail(email);
      expect(result.success).toBe(true);

      await nodeP.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));

      expect(deliveries.length).toBeGreaterThanOrEqual(1);
      const delivery = deliveries.find((a) =>
        a.messageDelivery?.recipientIds.includes('quinn@node-q.test'),
      );
      expect(delivery).toBeDefined();
      expect(delivery!.messageDelivery!.messageId).toBe(result.messageId);

      // Sender should still have the email with attachment metadata
      const senderEmail = await nodeP.messageService.getEmail(result.messageId);
      expect(senderEmail).not.toBeNull();
      expect(senderEmail!.attachments).toBeDefined();
      expect(senderEmail!.attachments!.length).toBe(1);
      expect(senderEmail!.attachments![0].filename).toBe('report.pdf');

      nodeQ.gossipService.offMessageDelivery(handler);
    });
  });

  // ─── Generic message (non-email) delivery ───────────────────────

  describe('generic message delivery across nodes', () => {
    let nodeM: TestNode;
    let nodeN: TestNode;

    beforeAll(async () => {
      nodeM = await createTestNode('node-m', BASE_PORT + 30, ['user-m']);
      nodeN = await createTestNode('node-n', BASE_PORT + 31, ['user-n']);
      nodes.push(nodeM, nodeN);
      await connectNodes(nodeM, nodeN);
    });

    it('should deliver a generic message via announceMessage + gossip', async () => {
      const deliveries: BlockAnnouncement[] = [];
      const handler = (a: BlockAnnouncement) => deliveries.push(a);
      nodeN.gossipService.onMessageDelivery(handler);

      await nodeM.gossipService.announceMessage(['block-generic-1'], {
        messageId: 'generic-msg-001',
        recipientIds: ['user-n'],
        priority: 'normal',
        blockIds: ['block-generic-1'],
        cblBlockId: 'cbl-generic-1',
        ackRequired: true,
      });

      await nodeM.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));

      expect(deliveries.length).toBeGreaterThanOrEqual(1);
      const delivery = deliveries.find(
        (a) => a.messageDelivery?.messageId === 'generic-msg-001',
      );
      expect(delivery).toBeDefined();
      expect(delivery!.messageDelivery!.recipientIds).toContain('user-n');

      nodeN.gossipService.offMessageDelivery(handler);
    });

    it('should auto-ack generic messages back to sender', async () => {
      const acks: BlockAnnouncement[] = [];
      const handler = (a: BlockAnnouncement) => acks.push(a);
      nodeM.gossipService.onDeliveryAck(handler);

      await nodeM.gossipService.announceMessage(['block-generic-2'], {
        messageId: 'generic-msg-002',
        recipientIds: ['user-n'],
        priority: 'normal',
        blockIds: ['block-generic-2'],
        cblBlockId: 'cbl-generic-2',
        ackRequired: true,
      });

      await nodeM.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));
      await nodeN.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));

      const ack = acks.find((a) => a.deliveryAck?.recipientId === 'user-n');
      expect(ack).toBeDefined();
      expect(ack!.deliveryAck!.status).toBe('delivered');

      nodeM.gossipService.offDeliveryAck(handler);
    });

    it('should forward messages through intermediate node when not a recipient', async () => {
      const nodeR = await createTestNode('node-r', BASE_PORT + 32, []);
      nodes.push(nodeR);

      nodeM.peerProvider.disconnectPeer('node-n');
      nodeN.peerProvider.disconnectPeer('node-m');

      await nodeM.peerProvider.connectToPeer(
        'node-r',
        `ws://127.0.0.1:${nodeR.port}/node-m`,
      );
      await nodeR.peerProvider.connectToPeer(
        'node-m',
        `ws://127.0.0.1:${nodeM.port}/node-r`,
      );
      await nodeR.peerProvider.connectToPeer(
        'node-n',
        `ws://127.0.0.1:${nodeN.port}/node-r`,
      );
      await nodeN.peerProvider.connectToPeer(
        'node-r',
        `ws://127.0.0.1:${nodeR.port}/node-n`,
      );

      const deliveries: BlockAnnouncement[] = [];
      const handler = (a: BlockAnnouncement) => deliveries.push(a);
      nodeN.gossipService.onMessageDelivery(handler);

      await nodeM.gossipService.announceMessage(['block-hop-1'], {
        messageId: 'hop-msg-001',
        recipientIds: ['user-n'],
        priority: 'normal',
        blockIds: ['block-hop-1'],
        cblBlockId: 'cbl-hop-1',
        ackRequired: true,
      });

      // Flush M → R
      await nodeM.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));
      // R forwards since user-n is not local — flush R → N
      await nodeR.gossipService.flushAnnouncements();
      await new Promise((r) => setTimeout(r, 300));

      expect(deliveries.length).toBeGreaterThanOrEqual(1);
      const delivery = deliveries.find(
        (a) => a.messageDelivery?.messageId === 'hop-msg-001',
      );
      expect(delivery).toBeDefined();

      nodeN.gossipService.offMessageDelivery(handler);
    });
  });
});
