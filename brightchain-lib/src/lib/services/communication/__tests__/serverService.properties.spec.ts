/**
 * Property-based tests for ServerService (Properties 1-8).
 *
 * Validates: Requirements 1.3, 1.4, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3
 */
import fc from 'fast-check';
import { PermissionService } from '../permissionService';
import { ChannelService } from '../channelService';
import {
  ServerService,
  ServerPermissionError,
  ServerInviteExpiredError,
  MemberAlreadyInServerError,
} from '../serverService';
import { ChannelVisibility, DefaultRole } from '../../../enumerations/communication';

// ─── Helpers ────────────────────────────────────────────────────────────────

const createServices = () => {
  const permissionService = new PermissionService();
  const channelService = new ChannelService(permissionService);
  const serverService = new ServerService({ channelService });
  return { permissionService, channelService, serverService };
};

/** Arbitrary for valid server names (1-100 chars, non-empty). */
const arbServerName = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

/** Arbitrary for a unique user ID (uuid-like string). */
const arbUserId = fc.uuid();

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-discord-experience — ServerService Properties', () => {
  // ── Property 1 ──────────────────────────────────────────────────────────
  describe('Property 1: Server creation produces default category and channel', () => {
    /**
     * Validates: Requirements 1.3
     *
     * For any valid server creation request (name 1-100 chars, any ownerId),
     * the resulting server SHALL contain exactly one category named "General"
     * with position 0, and that category SHALL contain exactly one channel
     * named "general".
     */
    it('should create a server with a default "General" category containing a "general" channel', async () => {
      await fc.assert(
        fc.asyncProperty(arbServerName, arbUserId, async (name, ownerId) => {
          const { serverService, channelService } = createServices();
          const server = await serverService.createServer(ownerId, { name });

          // Exactly one category
          expect(server.categories).toHaveLength(1);

          const category = server.categories[0];
          expect(category.name).toBe('General');
          expect(category.position).toBe(0);

          // Category contains exactly one channel
          expect(category.channelIds).toHaveLength(1);

          // That channel is named "general"
          const channel = channelService.getChannelById(category.channelIds[0]);
          expect(channel).toBeDefined();
          expect(channel!.name).toBe('general');
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 2 ──────────────────────────────────────────────────────────
  describe('Property 2: Channel serverId matches parent server', () => {
    /**
     * Validates: Requirements 1.4
     *
     * For any channel created via createChannelInServer(serverId, ...),
     * the resulting channel's serverId field SHALL equal the provided serverId.
     */
    it('should set serverId on channels created within a server', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbServerName,
          arbUserId,
          fc.string({ minLength: 1, maxLength: 50 }),
          async (serverName, ownerId, channelName) => {
            const { serverService } = createServices();
            const server = await serverService.createServer(ownerId, { name: serverName });

            const channel = await serverService.createChannelInServer(
              server.id,
              ownerId,
              { name: channelName, visibility: ChannelVisibility.PUBLIC },
            );

            expect(channel.serverId).toBe(server.id);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 3 ──────────────────────────────────────────────────────────
  describe('Property 3: Server listing membership filter', () => {
    /**
     * Validates: Requirements 2.2
     *
     * For any set of servers and any memberId, listServersForMember(memberId)
     * SHALL return only servers whose memberIds array contains that memberId,
     * and SHALL return all such servers.
     */
    it('should return exactly the servers the member belongs to', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbServerName,
          arbUserId,
          arbUserId,
          fc.boolean(),
          async (serverName, ownerId, queryUser, addQueryUserAsMember) => {
            fc.pre(ownerId !== queryUser);

            // Fresh services per run — ChannelService enforces unique channel
            // names, so each run can only create one server (with its default
            // "general" channel).
            const { serverService } = createServices();
            const server = await serverService.createServer(ownerId, { name: serverName });

            if (addQueryUserAsMember) {
              await serverService.addMembers(server.id, ownerId, [queryUser]);
            }

            const result = await serverService.listServersForMember(queryUser);
            const returnedIds = result.items.map((s) => s.id);

            if (addQueryUserAsMember) {
              // queryUser is a member → server should be returned
              expect(returnedIds).toContain(server.id);
            } else {
              // queryUser is NOT a member → server should NOT be returned
              expect(returnedIds).not.toContain(server.id);
            }

            // Owner's own listing should always include the server
            const ownerResult = await serverService.listServersForMember(ownerId);
            expect(ownerResult.items.map((s) => s.id)).toContain(server.id);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 4 ──────────────────────────────────────────────────────────
  describe('Property 4: Server mutation authorization', () => {
    /**
     * Validates: Requirements 2.4, 2.5, 2.6
     *
     * updateServer SHALL succeed if and only if the user's role is owner or admin.
     * deleteServer SHALL succeed if and only if the user is the owner.
     */
    it('should allow updateServer only for owner/admin and deleteServer only for owner', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbServerName,
          arbUserId,
          arbUserId,
          async (serverName, ownerId, nonOwnerId) => {
            // Ensure owner and non-owner are different
            fc.pre(ownerId !== nonOwnerId);

            const { serverService } = createServices();
            const server = await serverService.createServer(ownerId, { name: serverName });

            // Add non-owner as a member
            await serverService.addMembers(server.id, ownerId, [nonOwnerId]);

            // Owner CAN update
            await expect(
              serverService.updateServer(server.id, ownerId, { name: 'new-name' }),
            ).resolves.toBeDefined();

            // Non-owner (MEMBER role) CANNOT update
            await expect(
              serverService.updateServer(server.id, nonOwnerId, { name: 'hack' }),
            ).rejects.toThrow(ServerPermissionError);

            // Non-owner CANNOT delete
            await expect(
              serverService.deleteServer(server.id, nonOwnerId),
            ).rejects.toThrow(ServerPermissionError);

            // Owner CAN delete
            await expect(
              serverService.deleteServer(server.id, ownerId),
            ).resolves.toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 5 ──────────────────────────────────────────────────────────
  describe('Property 5: Adding members grows server membership', () => {
    /**
     * Validates: Requirements 2.7
     *
     * For any server and any list of new memberIds (not already in the server),
     * after addMembers succeeds, the server's memberIds SHALL contain all
     * previously existing members plus all newly added members, with no duplicates.
     */
    it('should grow membership with no duplicates after addMembers', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbServerName,
          arbUserId,
          fc.uniqueArray(arbUserId, { minLength: 1, maxLength: 10 }),
          async (serverName, ownerId, newMemberIds) => {
            // Filter out the owner from new members to avoid duplicates
            const filteredNewMembers = newMemberIds.filter((id) => id !== ownerId);
            fc.pre(filteredNewMembers.length > 0);

            const { serverService } = createServices();
            const server = await serverService.createServer(ownerId, { name: serverName });

            const previousMembers = [...server.memberIds];

            await serverService.addMembers(server.id, ownerId, filteredNewMembers);

            const updatedServer = await serverService.getServer(server.id);

            // All previous members still present
            for (const id of previousMembers) {
              expect(updatedServer.memberIds).toContain(id);
            }

            // All new members present
            for (const id of filteredNewMembers) {
              expect(updatedServer.memberIds).toContain(id);
            }

            // No duplicates
            const uniqueIds = new Set(updatedServer.memberIds);
            expect(uniqueIds.size).toBe(updatedServer.memberIds.length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 6 ──────────────────────────────────────────────────────────
  describe('Property 6: Member removal cascades to server channels', () => {
    /**
     * Validates: Requirements 2.8
     *
     * For any server with a member who belongs to one or more of the server's
     * channels, after removeMember succeeds, that member SHALL not appear in
     * the server's memberIds nor in any channel's members array within that server.
     */
    it('should remove member from server and all server channels', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbServerName,
          arbUserId,
          arbUserId,
          async (serverName, ownerId, memberId) => {
            fc.pre(ownerId !== memberId);

            const { serverService, channelService } = createServices();
            const server = await serverService.createServer(ownerId, { name: serverName });

            // Add member to server (this now also adds them to all server channels)
            await serverService.addMembers(server.id, ownerId, [memberId]);

            // The default "general" channel was created with the owner.
            // addMembers now automatically distributes keys and adds the member
            // to all server channels.
            const generalChannelId = server.channelIds[0];

            // Verify member is in the channel (added by addMembers key distribution)
            const channelBefore = channelService.getChannelById(generalChannelId)!;
            expect(channelBefore.members.some((m) => m.memberId === memberId)).toBe(true);

            // Remove member from server
            await serverService.removeMember(server.id, ownerId, memberId);

            // Member should NOT be in server memberIds
            const updatedServer = await serverService.getServer(server.id);
            expect(updatedServer.memberIds).not.toContain(memberId);

            // Member should NOT be in any channel's members
            for (const channelId of updatedServer.channelIds) {
              const channel = channelService.getChannelById(channelId);
              if (channel) {
                expect(channel.members.some((m) => m.memberId === memberId)).toBe(false);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 7 ──────────────────────────────────────────────────────────
  describe('Property 7: Invite token uniqueness', () => {
    /**
     * Validates: Requirements 3.1
     *
     * For any sequence of createInvite calls on the same server,
     * all returned tokens SHALL be distinct strings.
     */
    it('should produce unique tokens for every createInvite call', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbServerName,
          arbUserId,
          fc.integer({ min: 2, max: 20 }),
          async (serverName, ownerId, inviteCount) => {
            const { serverService } = createServices();
            const server = await serverService.createServer(ownerId, { name: serverName });

            const tokens: string[] = [];
            for (let i = 0; i < inviteCount; i++) {
              const invite = await serverService.createInvite(server.id, ownerId, {});
              tokens.push(invite.token);
            }

            const uniqueTokens = new Set(tokens);
            expect(uniqueTokens.size).toBe(tokens.length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 8 ──────────────────────────────────────────────────────────
  describe('Property 8: Invite redemption round-trip with max-use enforcement', () => {
    /**
     * Validates: Requirements 3.2, 3.3
     *
     * For any invite with maxUses = N (where N >= 1), the first N distinct
     * users who redeem the invite SHALL be successfully added to the server's
     * memberIds. The (N+1)th redemption attempt SHALL fail with an
     * expiration/exhaustion error.
     */
    it('should allow exactly N redemptions then reject the (N+1)th', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbServerName,
          arbUserId,
          fc.integer({ min: 1, max: 10 }),
          async (serverName, ownerId, maxUses) => {
            const { serverService } = createServices();
            const server = await serverService.createServer(ownerId, { name: serverName });

            const invite = await serverService.createInvite(server.id, ownerId, {
              maxUses,
            });

            // Generate N+1 distinct user IDs (different from owner)
            const userIds: string[] = [];
            for (let i = 0; i <= maxUses; i++) {
              userIds.push(`user-${i}-${Date.now()}-${Math.random()}`);
            }

            // First N redemptions should succeed
            for (let i = 0; i < maxUses; i++) {
              await serverService.redeemInvite(server.id, invite.token, userIds[i]);
            }

            // Verify all N users are members
            const updatedServer = await serverService.getServer(server.id);
            for (let i = 0; i < maxUses; i++) {
              expect(updatedServer.memberIds).toContain(userIds[i]);
            }

            // (N+1)th redemption should fail
            await expect(
              serverService.redeemInvite(server.id, invite.token, userIds[maxUses]),
            ).rejects.toThrow(ServerInviteExpiredError);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
