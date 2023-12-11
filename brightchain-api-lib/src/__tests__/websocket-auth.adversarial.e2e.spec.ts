/**
 * @fileoverview Adversarial E2E tests for WebSocket authentication (Phase 5.2).
 *
 * NO MOCKS. Real WebSocketMessageServer, real WebSocket clients, real ECDSA keys.
 * Tests that unauthenticated and banned connections are properly refused.
 *
 * @see .kiro/specs/member-pool-security/tasks.md — Task 5.2
 */

import type { IECIESConfig } from '@digitaldefiance/ecies-lib';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import * as crypto from 'crypto';
import * as http from 'http';
import { WebSocket } from 'ws';
import { WebSocketMessageServer } from '../lib/services/webSocketMessageServer';

function generateKeyPair() {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  return {
    privateKey: Buffer.from(ecdh.getPrivateKey()),
    publicKey: Buffer.from(ecdh.getPublicKey()),
    compressedPublicKey: Buffer.from(
      ecdh.getPublicKey(undefined, 'compressed'),
    ),
  };
}

function waitForEvent(
  ws: WebSocket,
  event: string,
  timeoutMs = 5000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ${event}`)),
      timeoutMs,
    );
    ws.once(event, (data: unknown) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function waitForClose(ws: WebSocket, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timeout waiting for close')),
      timeoutMs,
    );
    if (ws.readyState === WebSocket.CLOSED) {
      clearTimeout(timer);
      resolve();
      return;
    }
    ws.once('close', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

const eciesConfig: IECIESConfig = {
  curveName: 'secp256k1',
  primaryKeyDerivationPath: "m/44'/0'/0'/0/0",
  mnemonicStrength: 256,
  symmetricAlgorithm: 'aes-256-gcm',
  symmetricKeyBits: 256,
  symmetricKeyMode: 'gcm',
};

describe('WebSocket Authentication — Adversarial E2E Tests', () => {
  let httpServer: http.Server;
  let wsServer: WebSocketMessageServer;
  let port: number;
  const goodNode = generateKeyPair();
  const bannedNode = generateKeyPair();
  const eciesService = new ECIESService(eciesConfig);

  beforeAll((done) => {
    httpServer = http.createServer();
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      port = typeof addr === 'object' && addr ? addr.port : 0;

      // Create server with auth REQUIRED
      wsServer = new WebSocketMessageServer(httpServer, true);

      // Register the good node's public key
      wsServer.registerNodeKey('good-node', goodNode.publicKey);
      wsServer.registerNodeKey('banned-node', bannedNode.publicKey);

      // Set ban check — banned node is refused
      wsServer.setBanCheck((publicKey: Buffer) => {
        return publicKey.equals(bannedNode.publicKey);
      });

      done();
    });
  });

  afterAll((done) => {
    wsServer.close(() => {
      httpServer.close(done);
    });
  });

  // ── Test: Unauthenticated connection closed after timeout ────────

  it('unauthenticated connection is closed after timeout', async () => {
    // Connect without sending auth message
    const ws = new WebSocket(`ws://localhost:${port}/unauthenticated-node`);

    await waitForEvent(ws, 'open');

    // Don't send auth — just wait for the server to close us
    // The server has a 10-second auth timeout
    await waitForClose(ws, 15000);

    expect(ws.readyState).toBe(WebSocket.CLOSED);
  }, 20000);

  // ── Test: Authenticated connection succeeds ──────────────────────

  it('properly authenticated connection is accepted', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/good-node`);

    await waitForEvent(ws, 'open');

    // Send auth message with valid signature
    const timestamp = Date.now().toString();
    const message = Buffer.from(`good-node:${timestamp}`);
    const signature = eciesService.signMessage(goodNode.privateKey, message);

    ws.send(
      JSON.stringify({
        type: 'auth',
        nodeId: 'good-node',
        timestamp,
        signature: Buffer.from(signature).toString('hex'),
      }),
    );

    // Wait for auth_success response
    const response = await waitForEvent(ws, 'message', 5000);
    const parsed = JSON.parse(response!.toString());
    expect(parsed.type).toBe('auth_success');

    // Connection should still be open
    expect(ws.readyState).toBe(WebSocket.OPEN);

    ws.close();
  });

  // ── Test: Banned node connection refused during auth ──────────────

  it('banned node is refused during authentication', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/banned-node`);

    await waitForEvent(ws, 'open');

    // Send auth message with valid signature (the signature is valid,
    // but the node is banned — should be refused)
    const timestamp = Date.now().toString();
    const message = Buffer.from(`banned-node:${timestamp}`);
    const signature = eciesService.signMessage(bannedNode.privateKey, message);

    ws.send(
      JSON.stringify({
        type: 'auth',
        nodeId: 'banned-node',
        timestamp,
        signature: Buffer.from(signature).toString('hex'),
      }),
    );

    // Server should close the connection (banned)
    await waitForClose(ws, 5000);
    expect(ws.readyState).toBe(WebSocket.CLOSED);
  });

  // ── Test: Invalid signature rejected ─────────────────────────────

  it('connection with invalid signature is closed', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/good-node`);

    await waitForEvent(ws, 'open');

    // Send auth with garbage signature
    ws.send(
      JSON.stringify({
        type: 'auth',
        nodeId: 'good-node',
        timestamp: Date.now().toString(),
        signature: 'deadbeefdeadbeefdeadbeefdeadbeef',
      }),
    );

    // Server should close the connection (bad signature)
    await waitForClose(ws, 5000);
    expect(ws.readyState).toBe(WebSocket.CLOSED);
  });

  // ── Test: Messages before auth are rejected ──────────────────────

  it('messages sent before authentication are rejected', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/sneaky-node`);

    await waitForEvent(ws, 'open');

    // Try to send a gossip batch without authenticating first
    ws.send(
      JSON.stringify({
        type: 'gossip_batch',
        announcements: [{ type: 'add', blockId: 'fake-block' }],
      }),
    );

    // Server should close the connection (not authenticated)
    await waitForClose(ws, 15000);
    expect(ws.readyState).toBe(WebSocket.CLOSED);
  }, 20000);
});
