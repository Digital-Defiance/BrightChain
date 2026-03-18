import {
  faBan,
  faFilter,
  faLockOpen,
  faShieldHalved,
  faTrash,
  faUserGear,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import {
  useAuth,
  useI18n,
} from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { FC, memo, useCallback, useEffect, useState } from 'react';
import authenticatedApi from '../../services/authenticatedApi';

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  accountStatus: string;
  emailVerified: boolean;
  lastLogin: string | null;
  roleName?: string;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_LIMIT = 20;

const AdminUserManagementPanel: FC = () => {
  const { tBranded: t } = useI18n();
  const { userData } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<'lock' | 'unlock'>('lock');

  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [roleConfirmUser, setRoleConfirmUser] = useState<AdminUser | null>(
    null,
  );
  const [roleConfirmTarget, setRoleConfirmTarget] = useState<string>('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminUser | null>(
    null,
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (statusFilter !== 'All') {
        const statusMap: Record<string, string> = {
          Active: 'Active',
          Locked: 'AdminLock',
          Pending: 'PendingEmailVerification',
        };
        params.set('status', statusMap[statusFilter] ?? statusFilter);
      }
      const res = await authenticatedApi.get(
        `/admin/users?${params.toString()}`,
      );
      const data: UsersResponse = res.data.data ?? res.data;
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (e: SelectChangeEvent<string>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const openConfirm = (user: AdminUser, action: 'lock' | 'unlock') => {
    setConfirmUser(user);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmUser) return;
    const newStatus = confirmAction === 'lock' ? 'AdminLock' : 'Active';
    try {
      await authenticatedApi.put(`/admin/users/${confirmUser._id}/status`, {
        status: newStatus,
      });
      setConfirmOpen(false);
      setConfirmUser(null);
      fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update user status',
      );
      setConfirmOpen(false);
    }
  };

  const openRoleConfirm = (user: AdminUser, targetRole: string) => {
    // Prevent changing own role
    if (userData?.id === user._id) {
      setError(t(BrightChainStrings.Admin_Users_CannotChangeOwnRole));
      return;
    }
    // Prevent changing system user
    if (user.roleName === 'System') {
      setError(t(BrightChainStrings.Admin_Users_CannotChangeSystemUser));
      return;
    }
    setRoleConfirmUser(user);
    setRoleConfirmTarget(targetRole);
    setRoleConfirmOpen(true);
  };

  const handleRoleConfirm = async () => {
    if (!roleConfirmUser || !roleConfirmTarget) return;
    try {
      await authenticatedApi.put(
        `/admin/users/${roleConfirmUser._id}/role`,
        { role: roleConfirmTarget },
      );
      setRoleConfirmOpen(false);
      setRoleConfirmUser(null);
      setRoleConfirmTarget('');
      fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update user role',
      );
      setRoleConfirmOpen(false);
    }
  };

  const openDeleteConfirm = (user: AdminUser) => {
    if (userData?.id === user._id) {
      setError(t(BrightChainStrings.Admin_Users_CannotDeleteSelf));
      return;
    }
    if (user.roleName === 'System') {
      setError(t(BrightChainStrings.Admin_Users_CannotDeleteSystemUser));
      return;
    }
    setDeleteConfirmUser(user);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmUser) return;
    try {
      await authenticatedApi.delete(
        `/admin/users/${deleteConfirmUser._id}`,
      );
      setDeleteConfirmOpen(false);
      setDeleteConfirmUser(null);
      fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete user',
      );
      setDeleteConfirmOpen(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <FontAwesomeIcon icon={faUserGear} />
        <Typography variant="h6">
          {t(BrightChainStrings.Admin_Users_Title)}
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <FontAwesomeIcon icon={faFilter} />
        <Select
          size="small"
          value={statusFilter}
          onChange={handleFilterChange}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="All">
            {t(BrightChainStrings.Admin_Users_FilterAll)}
          </MenuItem>
          <MenuItem value="Active">
            {t(BrightChainStrings.Admin_Users_FilterActive)}
          </MenuItem>
          <MenuItem value="Locked">
            {t(BrightChainStrings.Admin_Users_FilterLocked)}
          </MenuItem>
          <MenuItem value="Pending">
            {t(BrightChainStrings.Admin_Users_FilterPending)}
          </MenuItem>
        </Select>
      </Box>

      {error && (
        <Typography color="error" mb={1}>
          {error}
        </Typography>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              {t(BrightChainStrings.Admin_Users_ColUsername)}
            </TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Users_ColEmail)}</TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Users_ColRole)}</TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Users_ColStatus)}</TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Users_ColEmailVerified)}
            </TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Users_ColLastLogin)}
            </TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Users_ColActions)}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                {t(BrightChainStrings.Admin_Common_Loading)}
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                {t(BrightChainStrings.Admin_Users_NoUsersFound)}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.roleName ?? 'Member'}</TableCell>
                <TableCell>{user.accountStatus}</TableCell>
                <TableCell>
                  {user.emailVerified
                    ? t(BrightChainStrings.Admin_Common_Yes)
                    : t(BrightChainStrings.Admin_Common_No)}
                </TableCell>
                <TableCell>
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : t(BrightChainStrings.Admin_Common_Never)}
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5}>
                    {user.roleName !== 'System' && (
                      <Tooltip
                        title={t(BrightChainStrings.Admin_Users_ChangeRole)}
                      >
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() =>
                            openRoleConfirm(
                              user,
                              user.roleName === 'Admin' ? 'Member' : 'Admin',
                            )
                          }
                        >
                          <FontAwesomeIcon icon={faShieldHalved} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {user.accountStatus === 'AdminLock' ? (
                      <Tooltip
                        title={t(BrightChainStrings.Admin_Users_UnlockUser)}
                      >
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => openConfirm(user, 'unlock')}
                        >
                          <FontAwesomeIcon icon={faLockOpen} />
                        </IconButton>
                      </Tooltip>
                    ) : user.accountStatus === 'Active' ? (
                      <Tooltip
                        title={t(BrightChainStrings.Admin_Users_LockUser)}
                      >
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openConfirm(user, 'lock')}
                        >
                          <FontAwesomeIcon icon={faBan} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {user.roleName !== 'System' && (
                      <Tooltip
                        title={t(BrightChainStrings.Admin_Users_DeleteUser)}
                      >
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openDeleteConfirm(user)}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        gap={2}
        mt={2}
      >
        <Button
          size="small"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t(BrightChainStrings.Admin_Common_Previous)}
        </Button>
        <Typography variant="body2">
          {t(BrightChainStrings.Admin_Common_PageTemplate, {
            PAGE: String(page),
            TOTAL: String(totalPages),
          })}
        </Typography>
        <Button
          size="small"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          {t(BrightChainStrings.Admin_Common_Next)}
        </Button>
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          {confirmAction === 'lock'
            ? t(BrightChainStrings.Admin_Users_LockUserTitle)
            : t(BrightChainStrings.Admin_Users_UnlockUserTitle)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction === 'lock'
              ? t(BrightChainStrings.Admin_Users_LockConfirmTemplate, {
                  USERNAME: confirmUser?.username ?? '',
                })
              : t(BrightChainStrings.Admin_Users_UnlockConfirmTemplate, {
                  USERNAME: confirmUser?.username ?? '',
                })}
            {confirmAction === 'lock' &&
              t(BrightChainStrings.Admin_Users_LockWarning)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button
            onClick={handleConfirm}
            color={confirmAction === 'lock' ? 'error' : 'success'}
            variant="contained"
          >
            {confirmAction === 'lock'
              ? t(BrightChainStrings.Admin_Users_LockUserTitle)
              : t(BrightChainStrings.Admin_Users_UnlockUserTitle)}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={roleConfirmOpen}
        onClose={() => setRoleConfirmOpen(false)}
      >
        <DialogTitle>
          {t(BrightChainStrings.Admin_Users_ChangeRoleTitle)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightChainStrings.Admin_Users_ChangeRoleConfirmTemplate, {
              USERNAME: roleConfirmUser?.username ?? '',
              OLD_ROLE: roleConfirmUser?.roleName ?? 'Member',
              NEW_ROLE: roleConfirmTarget,
            })}
            {roleConfirmTarget === 'Admin' &&
              t(BrightChainStrings.Admin_Users_ChangeRoleWarning)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleConfirmOpen(false)}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button
            onClick={handleRoleConfirm}
            color="warning"
            variant="contained"
          >
            {t(BrightChainStrings.Admin_Users_ChangeRoleTitle)}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>
          {t(BrightChainStrings.Admin_Users_DeleteUserTitle)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightChainStrings.Admin_Users_DeleteConfirmTemplate, {
              USERNAME: deleteConfirmUser?.username ?? '',
            })}
            {t(BrightChainStrings.Admin_Users_DeleteWarning)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            {t(BrightChainStrings.Admin_Common_Delete)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default memo(AdminUserManagementPanel);
