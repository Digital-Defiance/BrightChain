/**
 * BrightChatApp — Smart wrapper that wires BrightChatLayout with
 * CreateServerDialog, CreateDMDialog, CreateChannelDialog,
 * ServerSettingsPanel, and route navigation.
 *
 * Manages:
 * - Server list fetching and active server state
 * - Channel list fetching when a server is selected
 * - Dialog open/close state for all modals
 * - ServerRail → ChannelSidebar → ChatArea navigation flow
 * - Route-based navigation via react-router
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 6.1, 7.1, 8.1
 */
import type {
  IChannel,
  IConversation,
  IGroup,
  IServer,
  IServerCategory,
  IServerInviteToken,
} from '@brightchain/brightchain-lib';
import { brightDateNow, DefaultRole } from '@brightchain/brightchain-lib';
import { useAuth } from '@digitaldefiance/express-suite-react-components';
import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import BrightChatLayout from './BrightChatLayout';
import CreateChannelDialog from './CreateChannelDialog';
import CreateDMDialog, { DMConversation, DMUser } from './CreateDMDialog';
import CreateServerDialog from './CreateServerDialog';
import DeleteChannelDialog from './DeleteChannelDialog';
import EditChannelDialog from './EditChannelDialog';
import ServerSettingsPanel from './ServerSettingsPanel';
import { useChatApi } from './hooks/useChatApi';

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Outlet context type for passing callbacks to child routes.
 */
export interface BrightChatOutletContext {
  onNewMessage: () => void;
}

const BrightChatApp: FC = () => {
  const chatApi = useChatApi();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const {
    serverId,
    channelId: urlChannelId,
    conversationId: urlConversationId,
    groupId: urlGroupId,
  } = useParams<{
    serverId?: string;
    channelId?: string;
    conversationId?: string;
    groupId?: string;
  }>();
  const location = useLocation();

  // ─── Server list state ──────────────────────────────────────────────
  const [servers, setServers] = useState<IServer[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // ─── Channel list state ─────────────────────────────────────────────
  const [channels, setChannels] = useState<IChannel[]>([]);

  // ─── DM sidebar state (conversations + groups for Home view) ──────
  const [dmConversations, setDmConversations] = useState<IConversation[]>([]);
  const [dmGroups, setDmGroups] = useState<IGroup[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // ─── Dialog/panel open state ────────────────────────────────────────
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [createDMOpen, setCreateDMOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [createChannelCategoryId, setCreateChannelCategoryId] = useState<
    string | undefined
  >(undefined);
  const [editChannelId, setEditChannelId] = useState<string | null>(null);
  const [deleteChannelId, setDeleteChannelId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInvites, setSettingsInvites] = useState<IServerInviteToken[]>(
    [],
  );

  // ─── DM dialog state ───────────────────────────────────────────────
  const [dmUsers, setDmUsers] = useState<DMUser[]>([]);
  const [existingConversations, setExistingConversations] = useState<
    DMConversation[]
  >([]);

  // ─── Fetch servers on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await chatApi.listServers();
        if (!cancelled) {
          setServers(result.items ?? []);
        }
      } catch {
        // Silently handle — empty server list
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatApi]);

  // ─── Sync URL params → internal state on every location change ─────
  // When the user navigates via the top menu (or any external navigation),
  // the URL changes but BrightChatApp's internal state must follow.
  useEffect(() => {
    if (serverId) {
      setActiveServerId(serverId);
      // Clear DM selections when viewing a server
      setActiveConversationId(null);
      setActiveGroupId(null);
    } else if (!urlChannelId && !urlConversationId && !urlGroupId) {
      // At the index route (/brightchat) — reset to Home view
      setActiveServerId(null);
      setActiveChannelId(null);
      setActiveConversationId(null);
      setActiveGroupId(null);
    }

    if (urlChannelId) {
      setActiveChannelId(urlChannelId);
    } else if (!serverId) {
      // Only clear channel when not on a server route (server route keeps
      // the channel sidebar visible without a specific channel selected)
      setActiveChannelId(null);
    }

    if (urlConversationId) {
      setActiveConversationId(urlConversationId);
      setActiveGroupId(null);
      setActiveServerId(null);
    }

    if (urlGroupId) {
      setActiveGroupId(urlGroupId);
      setActiveConversationId(null);
      setActiveServerId(null);
    }
  }, [
    serverId,
    urlChannelId,
    urlConversationId,
    urlGroupId,
    location.pathname,
  ]);

  // ─── Fetch DM conversations and groups for Home sidebar ───────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await chatApi.listConversations();
        if (!cancelled) {
          const items = result.items ?? [];
          // Sort by most recent activity
          const sorted = [...items].sort(
            (a, b) => b.lastMessageAt - a.lastMessageAt,
          );
          setDmConversations(sorted);
        }
      } catch {
        if (!cancelled) setDmConversations([]);
      }
    })();
    (async () => {
      try {
        const result = await chatApi.listGroups();
        if (!cancelled) {
          const items = result.items ?? [];
          const sorted = [...items].sort(
            (a, b) => b.lastMessageAt - a.lastMessageAt,
          );
          setDmGroups(sorted);
        }
      } catch {
        if (!cancelled) setDmGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatApi]);

  // ─── Derived state ──────────────────────────────────────────────────
  const activeServer = useMemo(
    () => servers.find((s) => s.id === activeServerId) ?? null,
    [servers, activeServerId],
  );

  // ─── Fetch channels when active server changes ─────────────────────
  useEffect(() => {
    if (!activeServerId) {
      setChannels([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await chatApi.listChannels();
        if (!cancelled) {
          // Filter channels belonging to this server
          const serverChannels = (result.items ?? []).filter(
            (ch: IChannel) => ch.serverId === activeServerId,
          );
          setChannels(serverChannels);
        }
      } catch {
        if (!cancelled) setChannels([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeServerId, chatApi]);

  // ─── Fetch conversations when DM dialog opens (users fetched on search) ──
  useEffect(() => {
    if (!createDMOpen) return;
    let cancelled = false;

    // Don't pre-fetch users — wait for the user to search.
    // This avoids suggesting contacts before a friends system is in place.
    setDmUsers([]);

    (async () => {
      try {
        const result = await chatApi.listConversations();
        if (!cancelled) {
          const mapped: DMConversation[] = (result.items ?? []).map(
            (conv: IConversation) => ({
              id: String(conv.id),
              participantIds: conv.participants.map(String),
            }),
          );
          setExistingConversations(mapped);
        }
      } catch {
        if (!cancelled) setExistingConversations([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [createDMOpen, chatApi]);

  // ─── ServerRail callbacks ───────────────────────────────────────────

  const handleServerSelect = useCallback(
    (id: string) => {
      setActiveServerId(id);
      setActiveChannelId(null);
      setActiveConversationId(null);
      setActiveGroupId(null);
      navigate(`/brightchat/server/${encodeURIComponent(id)}`);
    },
    [navigate],
  );

  const handleHomeClick = useCallback(() => {
    setActiveServerId(null);
    setActiveChannelId(null);
    setActiveConversationId(null);
    setActiveGroupId(null);
    navigate('/brightchat');
  }, [navigate]);

  const handleCreateServer = useCallback(() => {
    setCreateServerOpen(true);
  }, []);

  // ─── ChannelSidebar callbacks ───────────────────────────────────────

  const handleChannelSelect = useCallback(
    (channelId: string) => {
      setActiveChannelId(channelId);
      navigate(`/brightchat/channel/${encodeURIComponent(channelId)}`);
    },
    [navigate],
  );

  // ─── DMSidebar callbacks ────────────────────────────────────────────

  const handleDMConversationSelect = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      setActiveGroupId(null);
      navigate(
        `/brightchat/conversation/${encodeURIComponent(conversationId)}`,
      );
    },
    [navigate],
  );

  const handleDMGroupSelect = useCallback(
    (groupId: string) => {
      setActiveGroupId(groupId);
      setActiveConversationId(null);
      navigate(`/brightchat/group/${encodeURIComponent(groupId)}`);
    },
    [navigate],
  );

  const handleCreateChannel = useCallback((categoryId?: string) => {
    setCreateChannelCategoryId(categoryId);
    setCreateChannelOpen(true);
  }, []);

  const handleDeleteChannel = useCallback(async (channelId: string) => {
    setDeleteChannelId(channelId);
  }, []);

  const handleConfirmDeleteChannel = useCallback(async () => {
    if (!deleteChannelId) return;
    await chatApi.deleteChannel(deleteChannelId);
    setChannels((prev) => prev.filter((ch) => ch.id !== deleteChannelId));
    // Remove channel from local server state (channelIds + categories)
    if (activeServerId) {
      setServers((prev) =>
        prev.map((s) => {
          if (s.id !== activeServerId) return s;
          return {
            ...s,
            channelIds: s.channelIds.filter((id) => id !== deleteChannelId),
            categories: s.categories.map((cat) => ({
              ...cat,
              channelIds: cat.channelIds.filter((id) => id !== deleteChannelId),
            })),
          };
        }),
      );
    }
    if (activeChannelId === deleteChannelId) {
      setActiveChannelId(null);
      navigate('/brightchat');
    }
    setDeleteChannelId(null);
  }, [chatApi, deleteChannelId, activeServerId, activeChannelId, navigate]);

  const handleEditChannel = useCallback((channelId: string) => {
    setEditChannelId(channelId);
  }, []);

  const handleChannelUpdated = useCallback(
    (updated: IChannel, newCategoryId: string) => {
      setChannels((prev) =>
        prev.map((ch) => (ch.id === updated.id ? { ...ch, ...updated } : ch)),
      );
      // Move channel between categories in local server state
      if (activeServerId) {
        setServers((prev) =>
          prev.map((s) => {
            if (s.id !== activeServerId) return s;
            return {
              ...s,
              categories: s.categories.map((cat) => {
                const has = cat.channelIds.includes(updated.id);
                if (newCategoryId && cat.id === newCategoryId && !has) {
                  // Add to target category
                  return {
                    ...cat,
                    channelIds: [...cat.channelIds, updated.id],
                  };
                }
                if (cat.id !== newCategoryId && has) {
                  // Remove from old category (or all categories if newCategoryId is empty)
                  return {
                    ...cat,
                    channelIds: cat.channelIds.filter(
                      (id) => id !== updated.id,
                    ),
                  };
                }
                return cat;
              }),
            };
          }),
        );
      }
      setEditChannelId(null);
    },
    [activeServerId],
  );

  const handleSettingsClick = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  // ─── CreateServerDialog callbacks ───────────────────────────────────

  const handleServerCreated = useCallback(
    (server: IServer) => {
      setServers((prev) => [...prev, server]);
      setActiveServerId(server.id);

      // If the server was created with an iconFaClass, persist it via the API
      if (server.iconFaClass) {
        chatApi
          .updateServer(server.id, { iconFaClass: server.iconFaClass })
          .then((updated) => {
            setServers((prev) =>
              prev.map((s) =>
                s.id === server.id ? { ...s, ...updated } : s,
              ),
            );
          })
          .catch(() => {
            // Non-fatal — the icon is already in local state
          });
      }

      // Notify parent app (top menu) that the server list changed
      window.dispatchEvent(new CustomEvent('brightchat:servers-changed'));

      const generalChannelId = server.channelIds?.[0];
      if (generalChannelId) {
        navigate(
          `/brightchat/channel/${encodeURIComponent(generalChannelId)}`,
        );
      }
    },
    [navigate, chatApi],
  );

  // ─── CreateChannelDialog callbacks ──────────────────────────────────

  const handleChannelCreated = useCallback(
    (channel: { id: string; name: string }) => {
      // Add the new channel to the local channels list
      const newChannel: IChannel = {
        id: channel.id,
        name: channel.name,
        topic: '',
        creatorId: '',
        visibility: 'public' as never,
        members: [],
        encryptedSharedKey: new Map(),
        createdAt: brightDateNow(),
        lastMessageAt: brightDateNow(),
        pinnedMessageIds: [],
        historyVisibleToNewMembers: true,
        serverId: activeServerId ?? undefined,
      };
      setChannels((prev) => [...prev, newChannel]);

      // Update the local server state so the category includes this channel
      if (activeServerId && createChannelCategoryId) {
        setServers((prev) =>
          prev.map((s) => {
            if (s.id !== activeServerId) return s;
            return {
              ...s,
              channelIds: [...s.channelIds, channel.id],
              categories: s.categories.map((cat: IServerCategory<string>) =>
                cat.id === createChannelCategoryId
                  ? { ...cat, channelIds: [...cat.channelIds, channel.id] }
                  : cat,
              ),
            };
          }),
        );
      } else if (activeServerId) {
        // No category selected — add to first category if one exists, or just to channelIds
        setServers((prev) =>
          prev.map((s) => {
            if (s.id !== activeServerId) return s;
            const updated = { ...s, channelIds: [...s.channelIds, channel.id] };
            if (updated.categories.length > 0) {
              updated.categories = updated.categories.map((cat, idx) =>
                idx === 0
                  ? { ...cat, channelIds: [...cat.channelIds, channel.id] }
                  : cat,
              );
            }
            return updated;
          }),
        );
      }

      // Navigate to the new channel
      navigate(`/brightchat/channel/${encodeURIComponent(channel.id)}`);
      setActiveChannelId(channel.id);
    },
    [activeServerId, createChannelCategoryId, navigate],
  );

  // ─── CreateDMDialog callbacks ───────────────────────────────────────

  const handleNewMessage = useCallback(() => {
    setCreateDMOpen(true);
  }, []);

  const handleConversationStarted = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      navigate(
        `/brightchat/conversation/${encodeURIComponent(conversationId)}`,
      );
      // Refresh the DM conversations list so the sidebar shows the new entry
      (async () => {
        try {
          const result = await chatApi.listConversations();
          const items = result.items ?? [];
          const sorted = [...items].sort(
            (a, b) => b.lastMessageAt - a.lastMessageAt,
          );
          setDmConversations(sorted);
        } catch {
          // Silently handle — sidebar will refresh on next mount
        }
      })();
    },
    [navigate, chatApi],
  );

  // ─── ServerSettingsPanel callbacks ──────────────────────────────────

  const handleUpdateServer = useCallback(
    async (params: { name?: string; iconUrl?: string; iconFaClass?: string }) => {
      if (!activeServerId) return;
      const updated = await chatApi.updateServer(activeServerId, params);
      setServers((prev) =>
        prev.map((s) => (s.id === activeServerId ? { ...s, ...updated } : s)),
      );
    },
    [activeServerId, chatApi],
  );

  const handleUploadServerIcon = useCallback(
    async (serverId: string, commitToken: string): Promise<IServer> => {
      const updated = await chatApi.uploadServerIcon(serverId, commitToken);
      setServers((prev) =>
        prev.map((s) => (s.id === serverId ? { ...s, ...updated } : s)),
      );
      return updated;
    },
    [chatApi],
  );

  const handleRemoveServerIcon = useCallback(
    async (serverId: string): Promise<IServer> => {
      const updated = await chatApi.removeServerIcon(serverId);
      setServers((prev) =>
        prev.map((s) => (s.id === serverId ? { ...s, ...updated } : s)),
      );
      return updated;
    },
    [chatApi],
  );

  const handleDeleteServer = useCallback(
    async (serverId: string): Promise<void> => {
      await chatApi.deleteServer(serverId);
      setServers((prev) => prev.filter((s) => s.id !== serverId));
      if (activeServerId === serverId) {
        setActiveServerId(null);
        setActiveChannelId(null);
        navigate('/brightchat');
      }
    },
    [chatApi, activeServerId, navigate],
  );

  const handleAssignRole = useCallback(
    async (_memberId: string, _role: DefaultRole) => {
      // Placeholder — role assignment depends on API design
    },
    [],
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      if (!activeServerId) return;
      await chatApi.removeServerMember(activeServerId, memberId);
    },
    [activeServerId, chatApi],
  );

  const handleCreateInvite = useCallback(
    async (params?: { maxUses?: number; expiresInMs?: number }) => {
      if (!activeServerId) throw new Error('No active server');
      const invite = await chatApi.createServerInvite(
        activeServerId,
        params ?? {},
      );
      setSettingsInvites((prev) => [...prev, invite]);
      return invite;
    },
    [activeServerId, chatApi],
  );

  const handleCreateCategory = useCallback(
    async (name: string) => {
      if (!activeServerId || !activeServer) return;
      const newCategory = {
        id: `cat-${Date.now()}`,
        name,
        position: activeServer.categories?.length ?? 0,
        channelIds: [],
      };
      const updated = await chatApi.updateServer(activeServerId, {
        categories: [...(activeServer.categories ?? []), newCategory],
      });
      // Update local server state so the UI reflects the new category
      setServers((prev) =>
        prev.map((s) => (s.id === activeServerId ? { ...s, ...updated } : s)),
      );
    },
    [activeServerId, activeServer, chatApi],
  );

  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      if (!activeServerId || !activeServer) return;
      const category = activeServer.categories.find((c) => c.id === categoryId);
      if (!category || category.channelIds.length > 0) return;
      const updatedCategories = activeServer.categories
        .filter((c) => c.id !== categoryId)
        .map((c, idx) => ({ ...c, position: idx }));
      const updated = await chatApi.updateServer(activeServerId, {
        categories: updatedCategories,
      });
      setServers((prev) =>
        prev.map((s) => (s.id === activeServerId ? { ...s, ...updated } : s)),
      );
    },
    [activeServerId, activeServer, chatApi],
  );

  // ─── Derive active channel name for breadcrumbs ──────────────────
  const activeChannelName = useMemo(() => {
    if (!activeChannelId) return null;
    const channel = channels.find((ch) => ch.id === activeChannelId);
    return channel?.name ?? activeChannelId;
  }, [channels, activeChannelId]);

  // ─── Outlet context for child routes ──────────────────────────────
  const outletContext = useMemo<BrightChatOutletContext>(
    () => ({ onNewMessage: handleNewMessage }),
    [handleNewMessage],
  );

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <>
      <BrightChatLayout
        chatApi={chatApi}
        servers={servers}
        activeServerId={activeServerId}
        serverName={activeServer?.name ?? null}
        activeChannelName={activeChannelName}
        channelSidebarProps={{
          channels,
          categories: activeServer?.categories ?? [],
          activeChannelId,
          userRole: DefaultRole.OWNER,
          onChannelSelect: handleChannelSelect,
          onCreateChannel: handleCreateChannel,
          onEditChannel: handleEditChannel,
          onDeleteChannel: handleDeleteChannel,
          onSettingsClick: handleSettingsClick,
        }}
        dmSidebarProps={{
          conversations: dmConversations,
          groups: dmGroups,
          activeConversationId,
          activeGroupId,
          onConversationSelect: handleDMConversationSelect,
          onGroupSelect: handleDMGroupSelect,
          onNewMessage: handleNewMessage,
        }}
        onServerSelect={handleServerSelect}
        onHomeClick={handleHomeClick}
        onCreateServer={handleCreateServer}
      >
        <Outlet context={outletContext} />
      </BrightChatLayout>

      {/* CreateServerDialog — wired from ServerRail "+" button (Req 5.1) */}
      <CreateServerDialog
        open={createServerOpen}
        onClose={() => setCreateServerOpen(false)}
        onCreated={handleServerCreated}
        createServer={(params) => chatApi.createServer(params)}
        chatApi={chatApi}
      />

      {/* CreateChannelDialog — wired from ChannelSidebar "+" button (Req 7.1) */}
      <CreateChannelDialog
        open={createChannelOpen}
        onClose={() => {
          setCreateChannelOpen(false);
          setCreateChannelCategoryId(undefined);
        }}
        onCreated={handleChannelCreated}
        createChannel={(params) => chatApi.createChannel(params)}
        serverId={activeServerId ?? ''}
        categories={activeServer?.categories ?? []}
        initialCategoryId={createChannelCategoryId}
      />

      {/* EditChannelDialog — wired from ChannelSidebar context menu "Edit" */}
      <EditChannelDialog
        open={editChannelId !== null}
        channel={channels.find((ch) => ch.id === editChannelId) ?? null}
        categories={activeServer?.categories ?? []}
        currentCategoryId={
          (activeServer?.categories ?? []).find((cat) =>
            cat.channelIds.includes(editChannelId ?? ''),
          )?.id ?? ''
        }
        onClose={() => setEditChannelId(null)}
        onUpdated={handleChannelUpdated}
        updateChannel={(channelId, params) =>
          chatApi.updateChannel(channelId, params)
        }
      />

      {/* DeleteChannelDialog — wired from ChannelSidebar context menu "Delete" */}
      <DeleteChannelDialog
        open={deleteChannelId !== null}
        channelName={
          channels.find((ch) => ch.id === deleteChannelId)?.name ?? ''
        }
        onClose={() => setDeleteChannelId(null)}
        onConfirm={handleConfirmDeleteChannel}
      />

      {/* CreateDMDialog — wired from DM list "New Message" button (Req 6.1) */}
      <CreateDMDialog
        open={createDMOpen}
        onClose={() => setCreateDMOpen(false)}
        onConversationStarted={handleConversationStarted}
        currentUserId={userData?.id ?? ''}
        users={dmUsers}
        existingConversations={existingConversations}
        sendDirectMessage={async (recipientId: string) => {
          const result = await chatApi.sendDirectMessage({
            recipientId,
          });
          return String(result.id);
        }}
        onSearchUsers={async (query: string) => {
          if (!query.trim()) {
            setDmUsers([]);
            return;
          }
          try {
            const result = await chatApi.searchUsers(query);
            setDmUsers(result.users ?? []);
          } catch {
            setDmUsers([]);
          }
        }}
      />

      {/* ServerSettingsPanel — wired from ChannelSidebar settings gear (Req 8.1) */}
      <ServerSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        server={activeServer}
        members={[]}
        invites={settingsInvites}
        currentUserRole={DefaultRole.OWNER}
        onUpdateServer={handleUpdateServer}
        onAssignRole={handleAssignRole}
        onRemoveMember={handleRemoveMember}
        onCreateInvite={handleCreateInvite}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
        onUploadServerIcon={handleUploadServerIcon}
        onRemoveServerIcon={handleRemoveServerIcon}
        onDeleteServer={handleDeleteServer}
        chatApi={chatApi}
      />
    </>
  );
};

export default memo(BrightChatApp);
