/**
 * AdminChatServersPanel — Admin panel for managing BrightChat servers,
 * channels, and members. Platform admins can view and manage organizational
 * structure without access to encrypted message content.
 *
 * Tabs: Servers | Channels | Members
 *
 * Features:
 * - List/edit/delete servers
 * - List/delete channels per server
 * - List/remove/change-role members per server
 * - Encryption notice (admins cannot see message content)
 */
import {
  faEdit,
  faServer,
  faTrash,
  faUserMinus,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import { DefaultRole } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ChangeEvent, FC, memo, SyntheticEvent, useCallback, useEffect, useState } from 'react';
import authenticatedApi from '../../services/authenticatedApi';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface AdminServer {
  id: string;
  name: string;
  iconUrl?: string;
  ownerId: string;
  memberCount: number;
  channelCount: number;
  createdAt: string;
}

interface AdminChannel {
  id: string;
  name: string;
  topic: string;
  visibility: string;
  memberCount: number;
  serverId: string;
  serverName?: string;
  createdAt: string;
}

interface AdminMember {
  memberId: string;
  displayName: string;
  role: string;
  joinedAt: string;
  serverId: string;
  serverName?: string;
}

interface ServersResponse {
  servers: AdminServer[];
  total: number;
  page: number;
  limit: number;
}

interface ChannelsResponse {
  channels: AdminChannel[];
  total: number;
  page: number;
  limit: number;
}

interface MembersResponse {
  members: AdminMember[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_LIMIT = 20;

// ─── Component ──────────────────────────────────────────────────────────────

const AdminChatServersPanel: FC = () => {
  const { tBranded: t } = useI18n();

  // Tab state
  const [tabIndex, setTabIndex] = useState(0);

  // Servers state
  const [servers, setServers] = useState<AdminServer[]>([]);
  const [serversTotal, setServersTotal] = useState(0);
  const [serversPage, setServersPage] = useState(1);
  const [serversLoading, setServersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Channels state
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [channelsTotal, setChannelsTotal] = useState(0);
  const [channelsPage, setChannelsPage] = useState(1);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelServerFilter, setChannelServerFilter] = useState('');

  // Members state
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersPage, setMembersPage] = useState(1);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberServerFilter, setMemberServerFilter] = useState('');

  // Edit server dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editServer, setEditServer] = useState<AdminServer | null>(null);
  const [editName, setEditName] = useState('');
  const [editIconUrl, setEditIconUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete server dialog
  const [deleteServerOpen, setDeleteServerOpen] = useState(false);
  const [deleteServerId, setDeleteServerId] = useState<string | null>(null);

  // Delete channel dialog
  const [deleteChannelOpen, setDeleteChannelOpen] = useState(false);
  const [deleteChannelId, setDeleteChannelId] = useState<string | null>(null);

  // Remove member dialog
  const [removeMemberOpen, setRemoveMemberOpen] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{
    serverId: string;
    memberId: string;
  } | null>(null);

  // ─── Fetch servers ──────────────────────────────────────────────────

  const fetchServers = useCallback(async () => {
    setServersLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(serversPage),
        limit: String(PAGE_LIMIT),
      });
      const res = await authenticatedApi.get(
        `/admin/chat/servers?${params.toString()}`,
      );
      const data: ServersResponse = res.data.data ?? res.data;
      setServers(data.servers ?? []);
      setServersTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch servers');
    } finally {
      setServersLoading(false);
    }
  }, [serversPage]);

  // ─── Fetch channels ─────────────────────────────────────────────────

  const fetchChannels = useCallback(async () => {
    setChannelsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(channelsPage),
        limit: String(PAGE_LIMIT),
      });
      if (channelServerFilter) params.set('serverId', channelServerFilter);
      const res = await authenticatedApi.get(
        `/admin/chat/servers/channels?${params.toString()}`,
      );
      const data: ChannelsResponse = res.data.data ?? res.data;
      setChannels(data.channels ?? []);
      setChannelsTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch channels');
    } finally {
      setChannelsLoading(false);
    }
  }, [channelsPage, channelServerFilter]);

  // ─── Fetch members ──────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(membersPage),
        limit: String(PAGE_LIMIT),
      });
      if (memberServerFilter) params.set('serverId', memberServerFilter);
      const res = await authenticatedApi.get(
        `/admin/chat/servers/members?${params.toString()}`,
      );
      const data: MembersResponse = res.data.data ?? res.data;
      setMembers(data.members ?? []);
      setMembersTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setMembersLoading(false);
    }
  }, [membersPage, memberServerFilter]);

  // ─── Effects ────────────────────────────────────────────────────────

  useEffect(() => {
    if (tabIndex === 0) fetchServers();
  }, [tabIndex, fetchServers]);

  useEffect(() => {
    if (tabIndex === 1) fetchChannels();
  }, [tabIndex, fetchChannels]);

  useEffect(() => {
    if (tabIndex === 2) fetchMembers();
  }, [tabIndex, fetchMembers]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleTabChange = useCallback((_: SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    setError(null);
  }, []);

  const handleEditServer = useCallback((server: AdminServer) => {
    setEditServer(server);
    setEditName(server.name);
    setEditIconUrl(server.iconUrl ?? '');
    setEditOpen(true);
  }, []);

  const handleSaveServer = useCallback(async () => {
    if (!editServer) return;
    setEditSaving(true);
    try {
      await authenticatedApi.put(`/admin/chat/servers/${editServer.id}`, {
        name: editName || undefined,
        iconUrl: editIconUrl || undefined,
      });
      setEditOpen(false);
      fetchServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update server');
    } finally {
      setEditSaving(false);
    }
  }, [editServer, editName, editIconUrl, fetchServers]);

  const handleDeleteServer = useCallback(async () => {
    if (!deleteServerId) return;
    try {
      await authenticatedApi.delete(`/admin/chat/servers/${deleteServerId}`);
      setDeleteServerOpen(false);
      setDeleteServerId(null);
      fetchServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete server');
      setDeleteServerOpen(false);
    }
  }, [deleteServerId, fetchServers]);

  const handleDeleteChannel = useCallback(async () => {
    if (!deleteChannelId) return;
    try {
      await authenticatedApi.delete(
        `/admin/chat/servers/channels/${deleteChannelId}`,
      );
      setDeleteChannelOpen(false);
      setDeleteChannelId(null);
      fetchChannels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete channel');
      setDeleteChannelOpen(false);
    }
  }, [deleteChannelId, fetchChannels]);

  const handleRemoveMember = useCallback(async () => {
    if (!removeMemberTarget) return;
    try {
      await authenticatedApi.delete(
        `/admin/chat/servers/${removeMemberTarget.serverId}/members/${removeMemberTarget.memberId}`,
      );
      setRemoveMemberOpen(false);
      setRemoveMemberTarget(null);
      fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      setRemoveMemberOpen(false);
    }
  }, [removeMemberTarget, fetchMembers]);

  const handleChangeRole = useCallback(
    async (serverId: string, memberId: string, e: SelectChangeEvent) => {
      try {
        await authenticatedApi.put(
          `/admin/chat/servers/${serverId}/members/${memberId}/role`,
          { role: e.target.value },
        );
        fetchMembers();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to change role');
      }
    },
    [fetchMembers],
  );

  // ─── Pagination helpers ─────────────────────────────────────────────

  const serversTotalPages = Math.max(1, Math.ceil(serversTotal / PAGE_LIMIT));
  const channelsTotalPages = Math.max(1, Math.ceil(channelsTotal / PAGE_LIMIT));
  const membersTotalPages = Math.max(1, Math.ceil(membersTotal / PAGE_LIMIT));

  const PaginationControls: FC<{
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
  }> = ({ page, totalPages, onPrev, onNext }) => (
    <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={2}>
      <Button size="small" disabled={page <= 1} onClick={onPrev}>
        {t(BrightChainStrings.Admin_Common_Previous)}
      </Button>
      <Typography variant="body2">
        {t(BrightChainStrings.Admin_Common_PageTemplate, {
          PAGE: String(page),
          TOTAL: String(totalPages),
        })}
      </Typography>
      <Button size="small" disabled={page >= totalPages} onClick={onNext}>
        {t(BrightChainStrings.Admin_Common_Next)}
      </Button>
    </Box>
  );

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <FontAwesomeIcon icon={faServer} />
        <Typography variant="h6">
          {t(BrightChainStrings.Admin_ChatServers_Title)}
        </Typography>
      </Box>

      {/* Encryption notice */}
      <Alert severity="info" sx={{ mb: 2 }}>
        {t(BrightChainStrings.Admin_ChatServers_EncryptedNote)}
      </Alert>

      {error && (
        <Typography color="error" mb={1}>
          {error}
        </Typography>
      )}

      {/* Tabs */}
      <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label={t(BrightChainStrings.Admin_ChatServers_TabServers)} />
        <Tab label={t(BrightChainStrings.Admin_ChatServers_TabChannels)} />
        <Tab label={t(BrightChainStrings.Admin_ChatServers_TabMembers)} />
      </Tabs>

      {/* ─── Servers Tab ─────────────────────────────────────────────── */}
      {tabIndex === 0 && (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ColName)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ColOwner)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ColMembers)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ColChannels)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ColCreated)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ColActions)}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {serversLoading && servers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {t(BrightChainStrings.Admin_Common_Loading)}
                  </TableCell>
                </TableRow>
              ) : servers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {t(BrightChainStrings.Admin_ChatServers_NoServersFound)}
                  </TableCell>
                </TableRow>
              ) : (
                servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell>{server.name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {server.ownerId}
                      </Typography>
                    </TableCell>
                    <TableCell>{server.memberCount}</TableCell>
                    <TableCell>{server.channelCount}</TableCell>
                    <TableCell>{new Date(server.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Tooltip title={t(BrightChainStrings.Admin_ChatServers_EditServer)}>
                        <IconButton size="small" onClick={() => handleEditServer(server)}>
                          <FontAwesomeIcon icon={faEdit} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t(BrightChainStrings.Admin_ChatServers_DeleteServer)}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeleteServerId(server.id);
                            setDeleteServerOpen(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationControls
            page={serversPage}
            totalPages={serversTotalPages}
            onPrev={() => setServersPage((p) => Math.max(1, p - 1))}
            onNext={() => setServersPage((p) => p + 1)}
          />
        </>
      )}

      {/* ─── Channels Tab ────────────────────────────────────────────── */}
      {tabIndex === 1 && (
        <>
          <Box display="flex" gap={2} mb={2} alignItems="center">
            <Select
              size="small"
              value={channelServerFilter}
              onChange={(e) => {
                setChannelServerFilter(e.target.value);
                setChannelsPage(1);
              }}
              displayEmpty
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">
                {t(BrightChainStrings.Admin_ChatServers_AllServers)}
              </MenuItem>
              {servers.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ChannelName)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ChannelTopic)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ChannelVisibility)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ChannelMembers)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ColCreated)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ColActions)}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {channelsLoading && channels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {t(BrightChainStrings.Admin_Common_Loading)}
                  </TableCell>
                </TableRow>
              ) : channels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {t(BrightChainStrings.Admin_ChatServers_NoChannelsFound)}
                  </TableCell>
                </TableRow>
              ) : (
                channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell>#{channel.name}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {channel.topic || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={channel.visibility}
                        size="small"
                        color={channel.visibility === 'public' ? 'success' : channel.visibility === 'private' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{channel.memberCount}</TableCell>
                    <TableCell>{new Date(channel.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Tooltip title={t(BrightChainStrings.Admin_ChatServers_DeleteChannel)}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeleteChannelId(channel.id);
                            setDeleteChannelOpen(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationControls
            page={channelsPage}
            totalPages={channelsTotalPages}
            onPrev={() => setChannelsPage((p) => Math.max(1, p - 1))}
            onNext={() => setChannelsPage((p) => p + 1)}
          />
        </>
      )}

      {/* ─── Members Tab ─────────────────────────────────────────────── */}
      {tabIndex === 2 && (
        <>
          <Box display="flex" gap={2} mb={2} alignItems="center">
            <Select
              size="small"
              value={memberServerFilter}
              onChange={(e) => {
                setMemberServerFilter(e.target.value);
                setMembersPage(1);
              }}
              displayEmpty
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">
                {t(BrightChainStrings.Admin_ChatServers_AllServers)}
              </MenuItem>
              {servers.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_MemberName)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_MemberRole)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ColName)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_MemberJoined)}</TableCell>
                <TableCell>{t(BrightChainStrings.Admin_ChatServers_ColActions)}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {membersLoading && members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    {t(BrightChainStrings.Admin_Common_Loading)}
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    {t(BrightChainStrings.Admin_ChatServers_NoMembersFound)}
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={`${member.serverId}-${member.memberId}`}>
                    <TableCell>{member.displayName || member.memberId}</TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.serverId, member.memberId, e)}
                        sx={{ minWidth: 110 }}
                      >
                        <MenuItem value={DefaultRole.OWNER}>Owner</MenuItem>
                        <MenuItem value={DefaultRole.ADMIN}>Admin</MenuItem>
                        <MenuItem value={DefaultRole.MODERATOR}>Moderator</MenuItem>
                        <MenuItem value={DefaultRole.MEMBER}>Member</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>{member.serverName ?? member.serverId}</TableCell>
                    <TableCell>{new Date(member.joinedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Tooltip title={t(BrightChainStrings.Admin_ChatServers_RemoveMember)}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setRemoveMemberTarget({
                              serverId: member.serverId,
                              memberId: member.memberId,
                            });
                            setRemoveMemberOpen(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faUserMinus} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationControls
            page={membersPage}
            totalPages={membersTotalPages}
            onPrev={() => setMembersPage((p) => Math.max(1, p - 1))}
            onNext={() => setMembersPage((p) => p + 1)}
          />
        </>
      )}

      {/* ─── Edit Server Dialog ──────────────────────────────────────── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t(BrightChainStrings.Admin_ChatServers_EditServerTitle)}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label={t(BrightChainStrings.Admin_ChatServers_ServerName)}
            value={editName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
            disabled={editSaving}
          />
          <TextField
            fullWidth
            margin="dense"
            label={t(BrightChainStrings.Admin_ChatServers_ServerIcon)}
            value={editIconUrl}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditIconUrl(e.target.value)}
            disabled={editSaving}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button onClick={handleSaveServer} variant="contained" disabled={editSaving}>
            {t(BrightChainStrings.Admin_ChatServers_Save)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete Server Dialog ────────────────────────────────────── */}
      <Dialog open={deleteServerOpen} onClose={() => setDeleteServerOpen(false)}>
        <DialogTitle>{t(BrightChainStrings.Admin_ChatServers_DeleteServerTitle)}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightChainStrings.Admin_ChatServers_DeleteServerConfirm)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteServerOpen(false)}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button onClick={handleDeleteServer} color="error" variant="contained">
            {t(BrightChainStrings.Admin_Common_Delete)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete Channel Dialog ───────────────────────────────────── */}
      <Dialog open={deleteChannelOpen} onClose={() => setDeleteChannelOpen(false)}>
        <DialogTitle>{t(BrightChainStrings.Admin_ChatServers_DeleteChannelTitle)}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightChainStrings.Admin_ChatServers_DeleteChannelConfirm)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteChannelOpen(false)}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button onClick={handleDeleteChannel} color="error" variant="contained">
            {t(BrightChainStrings.Admin_Common_Delete)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Remove Member Dialog ────────────────────────────────────── */}
      <Dialog open={removeMemberOpen} onClose={() => setRemoveMemberOpen(false)}>
        <DialogTitle>{t(BrightChainStrings.Admin_ChatServers_RemoveMemberTitle)}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightChainStrings.Admin_ChatServers_RemoveMemberConfirm)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveMemberOpen(false)}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button onClick={handleRemoveMember} color="error" variant="contained">
            {t(BrightChainStrings.Admin_Common_Delete)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default memo(AdminChatServersPanel);
