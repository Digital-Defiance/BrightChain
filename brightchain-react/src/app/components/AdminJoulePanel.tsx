import { faBolt } from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import {
  useAuth,
  useI18n,
} from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import authenticatedApi from '../../services/authenticatedApi';

// ---------------------------------------------------------------------------
// Types matching the backend AdminJouleController DTOs
// ---------------------------------------------------------------------------

interface IAccountSnapshot {
  memberId: string;
  assetId: string;
  balance: string;
  earned: string;
  spent: string;
  reserved: string;
  available: string;
  reputation: string | number;
  createdAt: string; // ISO
  lastUpdated: string; // ISO
}

interface IAdminJouleEvent {
  id: string;
  userId: string;
  action: 'credit' | 'debit' | 'adjust';
  performedBy: string;
  reason: string;
  memo?: string | null;
  deltaMicroJoules: string;
  balanceAfterMicroJoules: string;
  /** ISO timestamp string. */
  at: string;
}

interface IBalanceResponse {
  account: IAccountSnapshot;
}

interface IMutationResponse {
  account: IAccountSnapshot;
  event: IAdminJouleEvent;
}

interface IEventsResponse {
  events: IAdminJouleEvent[];
  /** ISO timestamp of the oldest event in the page; null when no more. */
  nextCursor: string | null;
}

interface IAdminUserListItem {
  _id: string;
  username: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MICRO_PER_JOULE = 1_000_000n;

function formatMicro(raw: string): string {
  // raw is decimal string of bigint microJoules (may be negative)
  if (!raw) return '0';
  const neg = raw.startsWith('-');
  const digits = neg ? raw.slice(1) : raw;
  let value: bigint;
  try {
    value = BigInt(digits);
  } catch {
    return raw;
  }
  const whole = value / MICRO_PER_JOULE;
  const frac = value % MICRO_PER_JOULE;
  const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '');
  const sign = neg ? '-' : '';
  return fracStr.length > 0
    ? `${sign}${whole.toString()}.${fracStr} J`
    : `${sign}${whole.toString()} J`;
}

function formatTimestamp(
  iso: string | null | undefined,
  placeholder: string,
): string {
  if (!iso) return placeholder;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

type ActionKind = 'credit' | 'debit' | 'adjust';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AdminJoulePanel: FC = () => {
  const { t } = useI18n();
  useAuth();

  const timestampPlaceholder = t(
    BrightChainStrings.Admin_Joule_TimestampPlaceholder,
  );

  const actionLabelMap: Record<ActionKind, string> = {
    credit: t(BrightChainStrings.Admin_Joule_ButtonCredit),
    debit: t(BrightChainStrings.Admin_Joule_ButtonDebit),
    adjust: t(BrightChainStrings.Admin_Joule_ButtonSetBalance),
  };

  // user lookup
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<IAdminUserListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<IAdminUserListItem | null>(
    null,
  );
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // account state
  const [account, setAccount] = useState<IAccountSnapshot | null>(null);
  const [events, setEvents] = useState<IAdminJouleEvent[]>([]);
  const [eventsCursor, setEventsCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // form state
  const [action, setAction] = useState<ActionKind>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [memo, setMemo] = useState('');

  // confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // User search
  // -------------------------------------------------------------------------
  const runUserSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setUserResults([]);
      return;
    }
    setUserSearchLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '10',
        search: q.trim(),
      });
      const res = await authenticatedApi.get(
        `/admin/users?${params.toString()}`,
      );
      const data = res.data?.data ?? res.data;
      setUserResults(Array.isArray(data?.users) ? data.users : []);
    } catch {
      setUserResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      runUserSearch(userQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [userQuery, runUserSearch]);

  // -------------------------------------------------------------------------
  // Load balance + events for selected user
  // -------------------------------------------------------------------------
  const loadAccount = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);
      try {
        const [balRes, evRes] = await Promise.all([
          authenticatedApi.get(`/admin/joule/users/${userId}/balance`),
          authenticatedApi.get(`/admin/joule/users/${userId}/events?limit=50`),
        ]);
        const bal: IBalanceResponse = balRes.data?.data ?? balRes.data;
        const ev: IEventsResponse = evRes.data?.data ?? evRes.data;
        setAccount(bal.account);
        setEvents(ev.events ?? []);
        setEventsCursor(ev.nextCursor ?? null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t(BrightChainStrings.Admin_Joule_ErrorLoadAccount),
        );
        setAccount(null);
        setEvents([]);
        setEventsCursor(null);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const loadMoreEvents = useCallback(async () => {
    if (!selectedUser || !eventsCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: '50',
        before: eventsCursor,
      });
      const res = await authenticatedApi.get(
        `/admin/joule/users/${selectedUser._id}/events?${params.toString()}`,
      );
      const ev: IEventsResponse = res.data?.data ?? res.data;
      setEvents((prev) => [...prev, ...(ev.events ?? [])]);
      setEventsCursor(ev.nextCursor ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(BrightChainStrings.Admin_Joule_ErrorLoadMore),
      );
    } finally {
      setLoadingMore(false);
    }
  }, [selectedUser, eventsCursor, loadingMore, t]);

  useEffect(() => {
    if (selectedUser) {
      loadAccount(selectedUser._id);
    } else {
      setAccount(null);
      setEvents([]);
      setEventsCursor(null);
    }
  }, [selectedUser, loadAccount]);

  // -------------------------------------------------------------------------
  // Form helpers
  // -------------------------------------------------------------------------
  const amountLabel = useMemo(() => {
    switch (action) {
      case 'credit':
        return t(BrightChainStrings.Admin_Joule_AmountCreditLabel);
      case 'debit':
        return t(BrightChainStrings.Admin_Joule_AmountDebitLabel);
      case 'adjust':
        return t(BrightChainStrings.Admin_Joule_AmountAdjustLabel);
      default:
        return t(BrightChainStrings.Admin_Joule_AmountFallbackLabel);
    }
  }, [action, t]);

  const canSubmit = Boolean(
    selectedUser &&
      amount.trim().length > 0 &&
      reason.trim().length > 0 &&
      !submitting,
  );

  const openConfirm = () => {
    setError(null);
    setInfo(null);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (!submitting) setConfirmOpen(false);
  };

  const submit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    setError(null);
    try {
      let endpoint: string;
      let body: Record<string, unknown>;
      if (action === 'adjust') {
        endpoint = `/admin/joule/users/${selectedUser._id}/adjust`;
        body = {
          targetMicroJoules: amount.trim(),
          reason: reason.trim(),
          memo: memo.trim() || undefined,
        };
      } else {
        endpoint = `/admin/joule/users/${selectedUser._id}/${action}`;
        body = {
          microJoules: amount.trim(),
          reason: reason.trim(),
          memo: memo.trim() || undefined,
        };
      }
      const res = await authenticatedApi.post(endpoint, body);
      const data: IMutationResponse = res.data?.data ?? res.data;
      setAccount(data.account);
      setEvents((prev) => [data.event, ...prev]);
      setInfo(
        t(BrightChainStrings.Admin_Joule_SuccessTemplate, {
          ACTION: actionLabelMap[action],
          DELTA: formatMicro(data.event.deltaMicroJoules),
        }),
      );
      setAmount('');
      setReason('');
      setMemo('');
      setConfirmOpen(false);
    } catch (err) {
      const anyErr = err as { response?: { data?: { error?: string } } };
      setError(
        anyErr?.response?.data?.error ??
          (err instanceof Error
            ? err.message
            : t(BrightChainStrings.Admin_Joule_ErrorOperationFailed)),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <FontAwesomeIcon icon={faBolt} />
        <Typography variant="h5">
          {t(BrightChainStrings.Admin_Joule_PageTitle)}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {t(BrightChainStrings.Admin_Joule_PageDescription)}
      </Typography>

      {/* User selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t(BrightChainStrings.Admin_Joule_SelectUser)}
        </Typography>
        <TextField
          fullWidth
          size="small"
          label={t(BrightChainStrings.Admin_Joule_SearchUsersLabel)}
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
        />
        {userSearchLoading && (
          <Typography variant="caption" color="text.secondary">
            {t(BrightChainStrings.Admin_Joule_Searching)}
          </Typography>
        )}
        {userResults.length > 0 && (
          <Box sx={{ mt: 1, maxHeight: 220, overflow: 'auto' }}>
            {userResults.map((u) => (
              <Box
                key={u._id}
                sx={{
                  p: 1,
                  cursor: 'pointer',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor:
                    selectedUser?._id === u._id ? 'action.selected' : undefined,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => {
                  setSelectedUser(u);
                  setUserResults([]);
                  setUserQuery(`${u.username} <${u.email}>`);
                }}
              >
                <Typography variant="body2">
                  <strong>{u.username}</strong> &lt;{u.email}&gt;
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {u._id}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
        {selectedUser && (
          <Box mt={1}>
            <Typography variant="body2">
              {t(BrightChainStrings.Admin_Joule_SelectedTemplate, {
                USERNAME: selectedUser.username,
                USER_ID: selectedUser._id,
              })}
            </Typography>
            <Button
              size="small"
              onClick={() => {
                setSelectedUser(null);
                setUserQuery('');
              }}
            >
              {t(BrightChainStrings.Admin_Joule_Clear)}
            </Button>
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>
          {info}
        </Alert>
      )}

      {/* Account summary */}
      {selectedUser && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t(BrightChainStrings.Admin_Joule_AccountSection)}
          </Typography>
          {loading && (
            <Typography variant="body2" color="text.secondary">
              {t(BrightChainStrings.Admin_Common_Loading)}
            </Typography>
          )}
          {account && (
            <Stack direction="row" spacing={4} flexWrap="wrap">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t(BrightChainStrings.Admin_Joule_FieldBalance)}
                </Typography>
                <Typography variant="h6">
                  {formatMicro(account.balance)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t(BrightChainStrings.Admin_Joule_FieldAvailable)}
                </Typography>
                <Typography variant="h6">
                  {formatMicro(account.available)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t(BrightChainStrings.Admin_Joule_FieldReserved)}
                </Typography>
                <Typography variant="h6">
                  {formatMicro(account.reserved)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t(BrightChainStrings.Admin_Joule_FieldEarned)}
                </Typography>
                <Typography variant="h6">
                  {formatMicro(account.earned)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t(BrightChainStrings.Admin_Joule_FieldSpent)}
                </Typography>
                <Typography variant="h6">
                  {formatMicro(account.spent)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t(BrightChainStrings.Admin_Joule_FieldReputation)}
                </Typography>
                <Typography variant="h6">{account.reputation}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t(BrightChainStrings.Admin_Joule_FieldLastUpdated)}
                </Typography>
                <Typography variant="body2">
                  {formatTimestamp(account.lastUpdated, timestampPlaceholder)}
                </Typography>
              </Box>
            </Stack>
          )}
        </Paper>
      )}

      {/* Adjustment form */}
      {selectedUser && account && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t(BrightChainStrings.Admin_Joule_AdjustBalanceSection)}
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              label={t(BrightChainStrings.Admin_Joule_ActionLabel)}
              value={action}
              onChange={(e) => setAction(e.target.value as ActionKind)}
              size="small"
            >
              <MenuItem value="credit">
                {t(BrightChainStrings.Admin_Joule_ActionCredit)}
              </MenuItem>
              <MenuItem value="debit">
                {t(BrightChainStrings.Admin_Joule_ActionDebit)}
              </MenuItem>
              <MenuItem value="adjust">
                {t(BrightChainStrings.Admin_Joule_ActionAdjust)}
              </MenuItem>
            </TextField>
            <TextField
              label={amountLabel}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              size="small"
              helperText={t(BrightChainStrings.Admin_Joule_AmountHelperText)}
            />
            <TextField
              label={t(BrightChainStrings.Admin_Joule_ReasonLabel)}
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 256))}
              size="small"
              required
            />
            <TextField
              label={t(BrightChainStrings.Admin_Joule_MemoLabel)}
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, 1024))}
              size="small"
              multiline
              rows={2}
            />
            <Box>
              <Button
                variant="contained"
                color={action === 'debit' ? 'warning' : 'primary'}
                disabled={!canSubmit}
                onClick={openConfirm}
              >
                {actionLabelMap[action]}
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Recent events */}
      {selectedUser && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t(BrightChainStrings.Admin_Joule_RecentActionsSection)}
          </Typography>
          {events.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t(BrightChainStrings.Admin_Joule_NoActions)}
            </Typography>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Joule_ColWhen)}
                    </TableCell>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Joule_ColAction)}
                    </TableCell>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Joule_ColDelta)}
                    </TableCell>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Joule_ColBalanceAfter)}
                    </TableCell>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Joule_ColReason)}
                    </TableCell>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Joule_ColActor)}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell>
                        {formatTimestamp(ev.at, timestampPlaceholder)}
                      </TableCell>
                      <TableCell>{actionLabelMap[ev.action]}</TableCell>
                      <TableCell>{formatMicro(ev.deltaMicroJoules)}</TableCell>
                      <TableCell>
                        {formatMicro(ev.balanceAfterMicroJoules)}
                      </TableCell>
                      <TableCell>
                        {ev.reason}
                        {ev.memo ? (
                          <>
                            <Divider sx={{ my: 0.5 }} />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {ev.memo}
                            </Typography>
                          </>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {ev.performedBy ?? timestampPlaceholder}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box mt={2} display="flex" justifyContent="center">
                {eventsCursor ? (
                  <Button
                    size="small"
                    onClick={loadMoreEvents}
                    disabled={loadingMore}
                  >
                    {loadingMore
                      ? t(BrightChainStrings.Admin_Joule_LoadingMore)
                      : t(BrightChainStrings.Admin_Joule_LoadMore)}
                  </Button>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {t(BrightChainStrings.Admin_Joule_EndOfLog)}
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Paper>
      )}

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onClose={closeConfirm}>
        <DialogTitle>
          {t(BrightChainStrings.Admin_Joule_ConfirmTitleTemplate, {
            ACTION: actionLabelMap[action],
          })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Box>
              {t(BrightChainStrings.Admin_Joule_ConfirmUserTemplate, {
                USERNAME: selectedUser?.username ?? '',
                USER_ID: selectedUser?._id ?? '',
              })}
            </Box>
            <Box>
              {t(BrightChainStrings.Admin_Joule_ConfirmActionTemplate, {
                ACTION: actionLabelMap[action],
              })}
            </Box>
            <Box>
              {action === 'adjust'
                ? t(BrightChainStrings.Admin_Joule_ConfirmTargetTemplate, {
                    AMOUNT: amount,
                    FORMATTED: amount ? formatMicro(amount) : '',
                  })
                : t(BrightChainStrings.Admin_Joule_ConfirmAmountTemplate, {
                    AMOUNT: amount,
                    FORMATTED: amount ? formatMicro(amount) : '',
                  })}
            </Box>
            <Box>
              {t(BrightChainStrings.Admin_Joule_ConfirmReasonTemplate, {
                REASON: reason,
              })}
            </Box>
            {memo && (
              <Box>
                {t(BrightChainStrings.Admin_Joule_ConfirmMemoTemplate, {
                  MEMO: memo,
                })}
              </Box>
            )}
            <Box mt={1} color="warning.main">
              {t(BrightChainStrings.Admin_Joule_ConfirmWarning)}
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm} disabled={submitting}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button
            onClick={submit}
            variant="contained"
            color={action === 'debit' ? 'warning' : 'primary'}
            disabled={submitting}
          >
            {submitting
              ? t(BrightChainStrings.Admin_Joule_Submitting)
              : t(BrightChainStrings.Admin_Joule_Confirm)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminJoulePanel;
