import {
  faTrash,
  faVault,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
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
  IconButton,
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

interface Vault {
  id: string;
  ownerId: string;
  ownerUsername: string;
  isShared: boolean;
  createdAt: string;
  lastAccessedAt: string | null;
}

interface VaultsResponse {
  vaults: Vault[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_LIMIT = 20;

const AdminPassPanel: FC = () => {
  const { tBranded: t } = useI18n();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteVaultId, setDeleteVaultId] = useState<string | null>(null);

  const fetchVaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      const res = await authenticatedApi.get(
        `/admin/pass/vaults?${params.toString()}`,
      );
      const data: VaultsResponse = res.data.data ?? res.data;
      setVaults(data.vaults);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vaults');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  const handleDelete = async () => {
    if (!deleteVaultId) return;
    try {
      await authenticatedApi.delete(`/admin/pass/vaults/${deleteVaultId}`);
      setDeleteOpen(false);
      setDeleteVaultId(null);
      fetchVaults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vault');
      setDeleteOpen(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <FontAwesomeIcon icon={faVault} />
        <Typography variant="h6">
          {t(BrightChainStrings.Admin_Pass_Title)}
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        {t(BrightChainStrings.Admin_Pass_EncryptedNotice)}
      </Alert>

      {error && (
        <Typography color="error" mb={1}>
          {error}
        </Typography>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t(BrightChainStrings.Admin_Pass_ColOwner)}</TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Pass_ColShared)}</TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Pass_ColCreated)}</TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Pass_ColLastAccessed)}
            </TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Pass_ColActions)}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && vaults.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                {t(BrightChainStrings.Admin_Common_Loading)}
              </TableCell>
            </TableRow>
          ) : vaults.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                {t(BrightChainStrings.Admin_Pass_NoVaultsFound)}
              </TableCell>
            </TableRow>
          ) : (
            vaults.map((vault) => (
              <TableRow key={vault.id}>
                <TableCell>{vault.ownerUsername}</TableCell>
                <TableCell>
                  {vault.isShared
                    ? t(BrightChainStrings.Admin_Common_Yes)
                    : t(BrightChainStrings.Admin_Common_No)}
                </TableCell>
                <TableCell>
                  {new Date(vault.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {vault.lastAccessedAt
                    ? new Date(vault.lastAccessedAt).toLocaleString()
                    : t(BrightChainStrings.Admin_Common_Never)}
                </TableCell>
                <TableCell>
                  <Tooltip title={t(BrightChainStrings.Admin_Pass_DeleteVault)}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setDeleteVaultId(vault.id);
                        setDeleteOpen(true);
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

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>
          {t(BrightChainStrings.Admin_Pass_DeleteVaultTitle)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightChainStrings.Admin_Pass_DeleteVaultConfirm)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t(BrightChainStrings.Admin_Common_Delete)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default memo(AdminPassPanel);
