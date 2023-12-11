/**
 * Persistence tests for ServerService — verifies that data written by one
 * ServerService instance can be read by a NEW instance backed by the SAME
 * storage provider.  This simulates a server restart scenario.
 *
 * Each test creates a storageProvider, performs operations with one service
 * instance, then constructs a fresh ServerService (and ChannelService) on
 * the same storageProvider, calls init(), and asserts the data survived.
 */

import { ChannelService } from '../channelService';
import { PermissionService } from '../permissionService';
import { ServerNotFoundError, ServerService } from '../serverService';
import { createMockStorageProvider } from './mockStorageProvider';
import type { IChatStorageProvider } from '../../../interfaces/communication/chatStorageProvider';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createChannelService(
  storageProvider?: IChatStorageProvider,
): ChannelService {
  return new ChannelService(new PermissionService(), undefined, undefined, undefined, undefined, storageProvider);
}

interface ServicePair {
  channelService: ChannelService;
  serverService: ServerService;
}

function createServices(storageProvider: IChatStorageProvider): ServicePair {
  const channelService = createChannelService(storageProvider);
  const serverService = new ServerService({ channelService, storageProvider });
  return { channelService, serverService };
}

/**
 * Create a fresh service pair and initialize both services.
 * This simulates a full restart: new ChannelService + new ServerService,
 * both rehydrated from the same underlying storage.
 */
async function createAndInitServices(
  storageProvider: IChatStorageProvider,
): Promise<ServicePair> {
  const pair = createServices(storageProvider);
  await pair.channelService.init();
  await pair.serverService.init();
  return pair;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ServerService — collection-backed persistence', () => {
  // ── 1. Server persists across service instances ───────────────────────
  it('server created by one instance is readable by a new instance', async () => {
    const storageProvider = createMockStorageProvider();

    // --- Instance 1: create a server ---
    const { serverService: service1 } =
      await createAndInitServices(storageProvider);

    const ownerId = 'owner-1';
    const created = await service1.createServer(ownerId, {
      name: 'Persistent Server',
      iconUrl: 'https://example.com/icon.png',
    });

    // --- Instance 2: new services, same storage ---
    const { serverService: service2 } =
      await createAndInitServices(storageProvider);

    const fetched = await service2.getServer(created.id);

    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe('Persistent Server');
    expect(fetched.ownerId).toBe(ownerId);
    expect(fetched.iconUrl).toBe('https://example.com/icon.png');
    expect(fetched.memberIds).toEqual([ownerId]);
    expect(fetched.channelIds).toHaveLength(1);
    expect(fetched.categories).toHaveLength(1);
    expect(fetched.categories[0].name).toBe('General');
  });

  // ── 2. Updated server persists ────────────────────────────────────────
  it('updated server fields persist across instances', async () => {
    const storageProvider = createMockStorageProvider();

    // --- Instance 1: create and update ---
    const { serverService: service1 } =
      await createAndInitServices(storageProvider);

    const ownerId = 'owner-1';
    const created = await service1.createServer(ownerId, {
      name: 'Original Name',
    });

    await service1.updateServer(created.id, ownerId, {
      name: 'Updated Name',
      iconUrl: 'https://example.com/new-icon.png',
    });

    // --- Instance 2: verify updates survived ---
    const { serverService: service2 } =
      await createAndInitServices(storageProvider);

    const fetched = await service2.getServer(created.id);

    expect(fetched.name).toBe('Updated Name');
    expect(fetched.iconUrl).toBe('https://example.com/new-icon.png');
  });

  // ── 3. Deleted server is gone after restart ───────────────────────────
  it('deleted server is not found by a new instance', async () => {
    const storageProvider = createMockStorageProvider();

    // --- Instance 1: create then delete ---
    const { serverService: service1 } =
      await createAndInitServices(storageProvider);

    const ownerId = 'owner-1';
    const created = await service1.createServer(ownerId, {
      name: 'Doomed Server',
    });

    await service1.deleteServer(created.id, ownerId);

    // --- Instance 2: verify it's gone ---
    const { serverService: service2 } =
      await createAndInitServices(storageProvider);

    await expect(service2.getServer(created.id)).rejects.toThrow(
      ServerNotFoundError,
    );
  });

  // ── 4. Server members persist ─────────────────────────────────────────
  it('added members persist across instances', async () => {
    const storageProvider = createMockStorageProvider();

    // --- Instance 1: create server and add members ---
    const { serverService: service1 } =
      await createAndInitServices(storageProvider);

    const ownerId = 'owner-1';
    const server = await service1.createServer(ownerId, {
      name: 'Members Server',
    });

    await service1.addMembers(server.id, ownerId, ['member-2', 'member-3']);

    // --- Instance 2: verify members survived ---
    const { serverService: service2 } =
      await createAndInitServices(storageProvider);

    const result = await service2.listServersForMember('member-2');
    const memberServer = result.items.find((s) => s.id === server.id);

    expect(memberServer).toBeDefined();
    expect(memberServer!.memberIds).toContain('member-2');
    expect(memberServer!.memberIds).toContain('member-3');
    expect(memberServer!.memberIds).toContain(ownerId);
  });

  // ── 5. Server invites persist ─────────────────────────────────────────
  it('invite created by one instance can be redeemed by a new instance', async () => {
    const storageProvider = createMockStorageProvider();

    // --- Instance 1: create server and invite ---
    const { serverService: service1 } =
      await createAndInitServices(storageProvider);

    const ownerId = 'owner-1';
    const server = await service1.createServer(ownerId, {
      name: 'Invite Server',
    });

    const invite = await service1.createInvite(server.id, ownerId, {
      maxUses: 5,
    });

    // --- Instance 2: redeem the invite ---
    const { serverService: service2 } =
      await createAndInitServices(storageProvider);

    const newUserId = 'new-user';
    await service2.redeemInvite(server.id, invite.token, newUserId);

    const fetched = await service2.getServer(server.id);
    expect(fetched.memberIds).toContain(newUserId);
  });

  // ── 6. Multiple servers persist ───────────────────────────────────────
  it('multiple servers created by one instance are all found by a new instance', async () => {
    const storageProvider = createMockStorageProvider();

    // --- Instance 1: create 3 servers ---
    const { serverService: service1 } =
      await createAndInitServices(storageProvider);

    const ownerId = 'owner-1';
    const server1 = await service1.createServer(ownerId, {
      name: 'Server Alpha',
    });
    const server2 = await service1.createServer(ownerId, {
      name: 'Server Beta',
    });
    const server3 = await service1.createServer(ownerId, {
      name: 'Server Gamma',
    });

    // --- Instance 2: verify all 3 are present ---
    const { serverService: service2 } =
      await createAndInitServices(storageProvider);

    const result = await service2.listServersForMember(ownerId);
    const serverIds = result.items.map((s) => s.id);

    expect(serverIds).toContain(server1.id);
    expect(serverIds).toContain(server2.id);
    expect(serverIds).toContain(server3.id);
    expect(result.items).toHaveLength(3);
  });
});
