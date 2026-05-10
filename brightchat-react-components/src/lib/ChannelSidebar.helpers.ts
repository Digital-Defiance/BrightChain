/**
 * Pure helper functions for ChannelSidebar logic.
 *
 * Exported for property-based testing.
 */
import type { IServerCategory } from '@brightchain/brightchain-lib';
import { DefaultRole } from '@brightchain/brightchain-lib';

/**
 * Returns true if the given role has admin-level privileges
 * (can create/delete channels, access server settings).
 *
 * Requirement 7.5, 8.5: Only OWNER and ADMIN can create/delete channels
 * and access server settings.
 */
export function isAdminOrOwner(role: DefaultRole | null): boolean {
  return role === DefaultRole.OWNER || role === DefaultRole.ADMIN;
}

/**
 * Groups channels by their category. Each channel is assigned to exactly
 * one category (the category whose channelIds contains that channel's id).
 * Channels not found in any category are placed in an "Uncategorized" group.
 *
 * Requirement 4.3, 7.3: Channels grouped under category headers.
 */
export function groupChannelsByCategory<T extends { id: string }>(
  channels: T[],
  categories: IServerCategory[],
): { category: IServerCategory | null; channels: T[] }[] {
  const channelMap = new Map(channels.map((ch) => [ch.id, ch]));
  const assigned = new Set<string>();
  const groups: { category: IServerCategory | null; channels: T[] }[] = [];

  // Sort categories by position
  const sorted = [...categories].sort((a, b) => a.position - b.position);

  for (const cat of sorted) {
    const catChannels: T[] = [];
    for (const chId of cat.channelIds) {
      if (assigned.has(chId)) continue;
      const ch = channelMap.get(chId);
      if (ch) {
        catChannels.push(ch);
        assigned.add(chId);
      }
    }
    groups.push({ category: cat, channels: catChannels });
  }

  // Uncategorized channels
  const uncategorized = channels.filter((ch) => !assigned.has(ch.id));
  if (uncategorized.length > 0) {
    groups.push({ category: null, channels: uncategorized });
  }

  return groups;
}
