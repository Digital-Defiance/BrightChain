/**
 * useBrightChatMenuItems — React hook that generates IMenuOption entries
 * for the BrightChat dropdown menu, following the same pattern as
 * useBrightHubMenuItems in brighthub-react-components.
 *
 * Generates:
 *   1. "Direct Messages" link → /brightchat  (Home / DM view)
 *   2. Up to MAX_SERVERS dynamic server entries → /brightchat/server/:id
 *
 * A pure helper `generateBrightChatMenuOptions` is extracted for direct
 * property-based testing without React rendering.
 */

import type { IServer } from '@brightchain/brightchain-lib';
import type {
  IMenuOption,
  MenuType,
} from '@digitaldefiance/express-suite-react-components';
import { MenuTypes } from '@digitaldefiance/express-suite-react-components';
import { createElement, useMemo } from 'react';
import type { ReactNode } from 'react';

/** Maximum number of servers shown in the menu. */
const MAX_SERVERS = 5;

/** Index increment between consecutive server menu items. */
const INDEX_STEP = 10;

/**
 * Pure helper that builds menu options from a server list.
 * Extracted so property-based tests can exercise the logic directly
 * without mounting a React component.
 *
 * Produces a "Direct Messages" entry first, then up to MAX_SERVERS
 * server entries. This replaces the old static Groups/Channels items
 * that didn't correspond to actual navigation targets in the layout.
 */
export function generateBrightChatMenuOptions(
  chatMenu: MenuType,
  servers: IServer<string>[],
  startingIndex: number,
  directMessagesLabel = 'Direct Messages',
  serverIcon?: ReactNode,
): { options: IMenuOption[]; nextIndex: number } {
  const options: IMenuOption[] = [];

  // 1. Direct Messages — links to the Home / DM view
  options.push({
    id: 'brightchat-direct-messages',
    label: directMessagesLabel,
    link: '/brightchat',
    requiresAuth: true,
    includeOnMenus: [chatMenu, MenuTypes.SideMenu],
    index: startingIndex,
  });

  // 2. Dynamic server entries (capped at MAX_SERVERS)
  const capped = servers.slice(0, MAX_SERVERS);
  capped.forEach((server, i) => {
    const entry: IMenuOption = {
      id: `brightchat-server-${server.id}`,
      label: server.name,
      link: `/brightchat/server/${server.id}`,
      requiresAuth: true,
      includeOnMenus: [chatMenu, MenuTypes.SideMenu],
      index: startingIndex + (i + 1) * INDEX_STEP,
    };
    // Use FA icon, uploaded image icon, or generic chat icon (in priority order)
    if (server.iconFaClass && typeof createElement === 'function') {
      // Wrap in a span with innerHTML to avoid Font Awesome's kit JS
      // replacing the <i> and causing React "removeChild" crashes.
      entry.icon = createElement('span', {
        style: { display: 'inline-flex', alignItems: 'center', marginRight: 4 },
        ref: (el: HTMLSpanElement | null) => {
          if (el && server.iconFaClass) {
            el.innerHTML = `<i class="${server.iconFaClass}" style="font-size:16px"></i>`;
          }
        },
      });
    } else if (server.iconUrl && typeof createElement === 'function') {
      entry.icon = createElement('img', {
        src: server.iconUrl,
        alt: server.name,
        style: {
          width: 20,
          height: 20,
          maxWidth: 20,
          maxHeight: 20,
          borderRadius: 4,
          objectFit: 'cover' as const,
          marginRight: 4,
        },
      });
    } else if (serverIcon) {
      entry.icon = serverIcon;
    }
    options.push(entry);
  });

  return {
    options,
    nextIndex: startingIndex + (capped.length + 1) * INDEX_STEP,
  };
}

/**
 * React hook wrapping `generateBrightChatMenuOptions` in a `useMemo`.
 */
export function useBrightChatMenuItems(
  chatMenu: MenuType,
  servers: IServer<string>[],
  startingIndex: number,
  directMessagesLabel = 'Direct Messages',
  serverIcon?: ReactNode,
): { options: IMenuOption[]; nextIndex: number } {
  return useMemo(
    () =>
      generateBrightChatMenuOptions(
        chatMenu,
        servers,
        startingIndex,
        directMessagesLabel,
        serverIcon,
      ),
    [chatMenu, servers, startingIndex, directMessagesLabel, serverIcon],
  );
}

export default useBrightChatMenuItems;
