/**
 * Unit tests for ServerService — iconFaClass handling via updateServer.
 *
 * Validates that iconFaClass can be set, cleared, and persists across
 * service instances sharing the same storage provider.
 */

import { ChannelService } from '../channelService';
import { PermissionService } from '../permissionService';
import { ServerService } from '../serverService';
import { createMockStorageProvider } from './mockStorageProvider';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createServices(storageProvider = createMockStorageProvider()) {
  const permissionService = new PermissionService();
  const channelService = new ChannelService(permissionService);
  const serverService = new ServerService({
    channelService,
    storageProvider,
  });
  return { permissionService, channelService, serverService, storageProvider };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ServerService — iconFaClass', () => {
  it('updateServer sets iconFaClass on the server', async () => {
    const { serverService } = createServices();
    const ownerId = 'owner-1';

    const server = await serverService.createServer(ownerId, {
      name: 'FA Test',
    });
    expect(server.iconFaClass).toBeUndefined();

    const updated = await serverService.updateServer(server.id, ownerId, {
      iconFaClass: 'fa-solid fa-gamepad',
    });

    expect(updated.iconFaClass).toBe('fa-solid fa-gamepad');
  });

  it('updateServer can clear iconFaClass by setting it to empty string', async () => {
    const { serverService } = createServices();
    const ownerId = 'owner-1';

    const server = await serverService.createServer(ownerId, {
      name: 'Clear Test',
    });

    // Set iconFaClass first
    await serverService.updateServer(server.id, ownerId, {
      iconFaClass: 'fa-solid fa-heart',
    });

    // Clear it
    const cleared = await serverService.updateServer(server.id, ownerId, {
      iconFaClass: '',
    });

    expect(cleared.iconFaClass).toBe('');
  });

  it('iconFaClass persists across service instances', async () => {
    const storageProvider = createMockStorageProvider();
    const { serverService } = createServices(storageProvider);
    const ownerId = 'owner-1';

    // Create server and set iconFaClass
    const server = await serverService.createServer(ownerId, {
      name: 'Persist Test',
    });
    await serverService.updateServer(server.id, ownerId, {
      iconFaClass: 'fa-solid fa-rocket',
    });

    // Create a new service instance with the same storage provider
    const { serverService: serverService2 } = createServices(storageProvider);
    await serverService2.init();

    const fetched = await serverService2.getServer(server.id);
    expect(fetched.iconFaClass).toBe('fa-solid fa-rocket');
  });
});
