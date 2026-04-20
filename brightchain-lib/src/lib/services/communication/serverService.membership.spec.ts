/**
 * Unit tests for ServerService membership management methods:
 * addMembers and removeMember.
 *
 * Requirements: 2.7, 2.8
 */
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ICommunicationEventEmitter } from '../../interfaces/events';
import { NullEventEmitter } from '../../interfaces/events/communicationEventEmitter';
import { ChannelService } from './channelService';
import { PermissionService } from './permissionService';
import {
  ServerService,
  ServerPermissionError,
} from './serverService';

describe('ServerService membership management', () => {
  let channelService: ChannelService;
  let eventEmitter: ICommunicationEventEmitter;
  let serverService: ServerService;

  beforeEach(() => {
    const permissionService = new PermissionService();
    channelService = new ChannelService(permissionService);
    eventEmitter = new NullEventEmitter();
    serverService = new ServerService({
      channelService,
      eventEmitter,
    });
  });

  describe('addMembers', () => {
    it('should add new members when called by the owner', async () => {
      const owner = 'owner-1';
      const server = await serverService.createServer(owner, {
        name: 'Test Server',
      });

      const added = await serverService.addMembers(server.id, owner, [
        'user-a',
        'user-b',
      ]);

      expect(added).toEqual(['user-a', 'user-b']);
      const updated = await serverService.getServer(server.id);
      expect(updated.memberIds).toContain('user-a');
      expect(updated.memberIds).toContain('user-b');
      expect(updated.memberIds).toContain(owner);
    });

    it('should skip duplicate members already in the server', async () => {
      const owner = 'owner-1';
      const server = await serverService.createServer(owner, {
        name: 'Test Server',
      });

      // Add user-a first
      await serverService.addMembers(server.id, owner, ['user-a']);

      // Try adding user-a again along with user-b
      const added = await serverService.addMembers(server.id, owner, [
        'user-a',
        'user-b',
      ]);

      expect(added).toEqual(['user-b']);
      const updated = await serverService.getServer(server.id);
      // user-a should appear only once
      expect(
        updated.memberIds.filter((id) => id === 'user-a'),
      ).toHaveLength(1);
    });

    it('should skip the owner if included in the memberIds list', async () => {
      const owner = 'owner-1';
      const server = await serverService.createServer(owner, {
        name: 'Test Server',
      });

      const added = await serverService.addMembers(server.id, owner, [
        owner,
        'user-a',
      ]);

      expect(added).toEqual(['user-a']);
    });

    it('should throw ServerPermissionError when a non-owner/non-admin calls addMembers', async () => {
      const owner = 'owner-1';
      const server = await serverService.createServer(owner, {
        name: 'Test Server',
      });
      await serverService.addMembers(server.id, owner, ['regular-user']);

      await expect(
        serverService.addMembers(server.id, 'regular-user', ['user-x']),
      ).rejects.toThrow(ServerPermissionError);
    });

    it('should return empty array when all members are already present', async () => {
      const owner = 'owner-1';
      const server = await serverService.createServer(owner, {
        name: 'Test Server',
      });

      const added = await serverService.addMembers(server.id, owner, [owner]);
      expect(added).toEqual([]);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the server', async () => {
      const owner = 'owner-1';
      const server = await serverService.createServer(owner, {
        name: 'Test Server',
      });
      await serverService.addMembers(server.id, owner, ['user-a']);

      await serverService.removeMember(server.id, owner, 'user-a');

      const updated = await serverService.getServer(server.id);
      expect(updated.memberIds).not.toContain('user-a');
    });

    it('should remove the member from all server channels', async () => {
      const owner = 'owner-1';
      const server = await serverService.createServer(owner, {
        name: 'Test Server',
      });
      await serverService.addMembers(server.id, owner, ['user-a']);

      // Join user-a to the default general channel
      const generalChannelId = server.channelIds[0];
      await channelService.joinChannel(generalChannelId, 'user-a');

      // Verify user-a is in the channel
      const channelBefore = channelService.getChannelById(generalChannelId);
      expect(
        channelBefore?.members.some((m) => m.memberId === 'user-a'),
      ).toBe(true);

      // Remove user-a from the server
      await serverService.removeMember(server.id, owner, 'user-a');

      // Verify user-a is removed from the channel
      const channelAfter = channelService.getChannelById(generalChannelId);
      expect(
        channelAfter?.members.some((m) => m.memberId === 'user-a'),
      ).toBe(false);
    });

    it('should emit SERVER_MEMBER_REMOVED event', async () => {
      const emitSpy = jest.fn();
      const nullEmitter = new NullEventEmitter();
      const spyEmitter: ICommunicationEventEmitter = Object.create(nullEmitter);
      spyEmitter.emitServerMemberRemoved = emitSpy;

      const permSvc = new PermissionService();
      const chSvc = new ChannelService(permSvc);
      const svc = new ServerService({
        channelService: chSvc,
        eventEmitter: spyEmitter,
      });

      const owner = 'owner-1';
      const server = await svc.createServer(owner, { name: 'Test Server' });
      await svc.addMembers(server.id, owner, ['user-a']);

      await svc.removeMember(server.id, owner, 'user-a');

      expect(emitSpy).toHaveBeenCalledWith(server.id, 'user-a');
    });

    it('should throw ServerPermissionError when a non-owner/non-admin calls removeMember', async () => {
      const owner = 'owner-1';
      const server = await serverService.createServer(owner, {
        name: 'Test Server',
      });
      await serverService.addMembers(server.id, owner, ['regular-user', 'user-a']);

      await expect(
        serverService.removeMember(server.id, 'regular-user', 'user-a'),
      ).rejects.toThrow(ServerPermissionError);
    });
  });
});
