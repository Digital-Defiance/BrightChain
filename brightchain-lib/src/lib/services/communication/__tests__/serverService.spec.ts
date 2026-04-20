/**
 * Unit tests for ServerService — CRUD happy paths, error conditions, cascade delete.
 *
 * Requirements: 1.1, 1.3, 2.1, 2.4, 2.5, 2.6
 */
import { PermissionService } from '../permissionService';
import { ChannelService } from '../channelService';
import {
  ServerService,
  ServerNotFoundError,
  ServerPermissionError,
  ServerNameValidationError,
} from '../serverService';
import { ChannelVisibility } from '../../../enumerations/communication';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createServices() {
  const permissionService = new PermissionService();
  const channelService = new ChannelService(permissionService);
  const serverService = new ServerService({ channelService });
  return { permissionService, channelService, serverService };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ServerService — unit tests', () => {
  // ── 1. createServer happy path ────────────────────────────────────────
  describe('createServer', () => {
    it('creates a server with correct fields, default category, and default channel', async () => {
      const { serverService, channelService } = createServices();
      const ownerId = 'owner-1';

      const server = await serverService.createServer(ownerId, {
        name: 'My Server',
        iconUrl: 'https://example.com/icon.png',
      });

      // Basic fields
      expect(server.id).toBeDefined();
      expect(server.name).toBe('My Server');
      expect(server.iconUrl).toBe('https://example.com/icon.png');
      expect(server.ownerId).toBe(ownerId);
      expect(server.memberIds).toEqual([ownerId]);
      expect(server.createdAt).toBeInstanceOf(Date);
      expect(server.updatedAt).toBeInstanceOf(Date);

      // Default category
      expect(server.categories).toHaveLength(1);
      expect(server.categories[0].name).toBe('General');
      expect(server.categories[0].position).toBe(0);
      expect(server.categories[0].channelIds).toHaveLength(1);

      // Default channel
      expect(server.channelIds).toHaveLength(1);
      const channel = channelService.getChannelById(server.channelIds[0]);
      expect(channel).toBeDefined();
      expect(channel!.name).toBe('general');
      expect(channel!.serverId).toBe(server.id);
    });

    // ── 2. createServer with invalid name ─────────────────────────────────
    it('throws ServerNameValidationError for an empty name', async () => {
      const { serverService } = createServices();
      await expect(
        serverService.createServer('owner-1', { name: '' }),
      ).rejects.toThrow(ServerNameValidationError);
    });

    it('throws ServerNameValidationError for a name longer than 100 characters', async () => {
      const { serverService } = createServices();
      const longName = 'a'.repeat(101);
      await expect(
        serverService.createServer('owner-1', { name: longName }),
      ).rejects.toThrow(ServerNameValidationError);
    });
  });

  // ── 3. getServer happy path ───────────────────────────────────────────
  describe('getServer', () => {
    it('returns the server when it exists', async () => {
      const { serverService } = createServices();
      const created = await serverService.createServer('owner-1', { name: 'Test' });

      const fetched = await serverService.getServer(created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe('Test');
    });

    // ── 4. getServer with non-existent ID ─────────────────────────────────
    it('throws ServerNotFoundError for a non-existent ID', async () => {
      const { serverService } = createServices();
      await expect(
        serverService.getServer('non-existent-id'),
      ).rejects.toThrow(ServerNotFoundError);
    });
  });

  // ── 5. updateServer by owner ──────────────────────────────────────────
  describe('updateServer', () => {
    it('succeeds when the owner updates the server', async () => {
      const { serverService } = createServices();
      const ownerId = 'owner-1';
      const server = await serverService.createServer(ownerId, { name: 'Original' });

      const updated = await serverService.updateServer(server.id, ownerId, {
        name: 'Updated',
        iconUrl: 'https://example.com/new-icon.png',
      });

      expect(updated.name).toBe('Updated');
      expect(updated.iconUrl).toBe('https://example.com/new-icon.png');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        server.updatedAt.getTime(),
      );
    });

    // ── 6. updateServer by non-owner member ───────────────────────────────
    it('throws ServerPermissionError when a non-owner member tries to update', async () => {
      const { serverService } = createServices();
      const ownerId = 'owner-1';
      const memberId = 'member-1';
      const server = await serverService.createServer(ownerId, { name: 'Test' });
      await serverService.addMembers(server.id, ownerId, [memberId]);

      await expect(
        serverService.updateServer(server.id, memberId, { name: 'Hacked' }),
      ).rejects.toThrow(ServerPermissionError);
    });
  });

  // ── 7 & 8. deleteServer ───────────────────────────────────────────────
  describe('deleteServer', () => {
    it('succeeds when the owner deletes the server', async () => {
      const { serverService } = createServices();
      const ownerId = 'owner-1';
      const server = await serverService.createServer(ownerId, { name: 'ToDelete' });

      await serverService.deleteServer(server.id, ownerId);

      await expect(serverService.getServer(server.id)).rejects.toThrow(
        ServerNotFoundError,
      );
    });

    // ── 8. deleteServer by non-owner ──────────────────────────────────────
    it('throws ServerPermissionError when a non-owner tries to delete', async () => {
      const { serverService } = createServices();
      const ownerId = 'owner-1';
      const memberId = 'member-1';
      const server = await serverService.createServer(ownerId, { name: 'Protected' });
      await serverService.addMembers(server.id, ownerId, [memberId]);

      await expect(
        serverService.deleteServer(server.id, memberId),
      ).rejects.toThrow(ServerPermissionError);
    });

    // ── 9. deleteServer cascade ───────────────────────────────────────────
    it('cascade-deletes all channels belonging to the server', async () => {
      const { serverService, channelService } = createServices();
      const ownerId = 'owner-1';
      const server = await serverService.createServer(ownerId, { name: 'Cascade' });

      // Create additional channels in the server
      const ch1 = await serverService.createChannelInServer(
        server.id,
        ownerId,
        { name: 'channel-one', visibility: ChannelVisibility.PUBLIC },
      );
      const ch2 = await serverService.createChannelInServer(
        server.id,
        ownerId,
        { name: 'channel-two', visibility: ChannelVisibility.PUBLIC },
      );

      // Collect all channel IDs (default general + 2 new)
      const refreshed = await serverService.getServer(server.id);
      const allChannelIds = [...refreshed.channelIds];
      expect(allChannelIds.length).toBe(3);

      // Delete the server
      await serverService.deleteServer(server.id, ownerId);

      // All channels should be gone from ChannelService
      for (const channelId of allChannelIds) {
        expect(channelService.getChannelById(channelId)).toBeUndefined();
      }
    });
  });

  // ── 10. listServersForMember ──────────────────────────────────────────
  describe('listServersForMember', () => {
    it('returns only servers the member belongs to', async () => {
      const { serverService } = createServices();
      const owner = 'owner-1';
      const member = 'member-1';

      // Create two servers — add member to only the first
      const s1 = await serverService.createServer(owner, { name: 'Server-A' });
      // Need a fresh ChannelService for the second server to avoid channel name conflicts
      const perm2 = new PermissionService();
      const ch2 = new ChannelService(perm2);
      const ss2 = new ServerService({ channelService: ch2 });
      const s2 = await ss2.createServer(owner, { name: 'Server-B' });

      await serverService.addMembers(s1.id, owner, [member]);

      // member should see s1 from the first service
      const result = await serverService.listServersForMember(member);
      const ids = result.items.map((s) => s.id);
      expect(ids).toContain(s1.id);

      // member should NOT see s2 (different service instance, but also not a member)
      const result2 = await ss2.listServersForMember(member);
      expect(result2.items.map((s) => s.id)).not.toContain(s2.id);

      // owner should see their own server in each service
      const ownerResult = await serverService.listServersForMember(owner);
      expect(ownerResult.items.map((s) => s.id)).toContain(s1.id);
    });
  });
});
