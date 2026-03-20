import {
  faCubes,
  faMagnifyingGlass,
  faRadar,
  faTrash,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { FC, memo, useCallback, useEffect, useState } from 'react';
import authenticatedApi from '../../services/authenticatedApi';

interface BlockMeta {
  blockId: string;
  size: number;
  durabilityLevel: string;
  createdAt: string;
  accessCount: number;
  replicationStatus: string;
  expiresAt?: string;
  parityBlockIds?: string[];
  lastAccessedAt?: string;
  targetReplicationFactor?: number;
  replicaNodeIds?: string[];
  checksum?: string;
  poolId?: string;
}

interface BlocksResponse {
  blocks: BlockMeta[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_LIMIT = 20;

const AdminBlockExplorerPanel: FC = () => {
  const { tBranded: t } = useI18n();
  const [blocks, setBlocks] = useState<BlockMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [durabilityFilter, setDurabilityFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailBlock, setDetailBlock] = useState<BlockMeta | null>(null);

  const [discoverResult, setDiscoverResult] = useState<string[] | null>(null);
  const [discoverBlockId, setDiscoverBlockId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
        sortBy,
      });
      if (durabilityFilter !== 'All') {
        params.set('durabilityLevel', durabilityFilter);
      }
      const res = await authenticatedApi.get(
        `/admin/blocks?${params.toString()}`,
      );
      const data: BlocksResponse = res.data.data ?? res.data;
      setBlocks(data.blocks);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch blocks');
    } finally {
      setLoading(false);
    }
  }, [page, durabilityFilter, sortBy]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setError(null);
    try {
      const res = await authenticatedApi.get(
        `/admin/blocks/${searchId.trim()}`,
      );
      const block: BlockMeta = res.data.data ?? res.data;
      setDetailBlock(block);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Block not found');
    }
  };

  const handleDiscover = async (blockId: string) => {
    setDiscoverBlockId(blockId);
    setDiscoverResult(null);
    try {
      const res = await authenticatedApi.post(
        `/admin/blocks/${blockId}/discover`,
      );
      const data = res.data.data ?? res.data;
      setDiscoverResult(data.nodes ?? data.nodeIds ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteBlockId) return;
    try {
      await authenticatedApi.delete(`/admin/blocks/${deleteBlockId}`);
      setDeleteOpen(false);
      setDeleteBlockId(null);
      setDetailBlock(null);
      fetchBlocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete block');
      setDeleteOpen(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <FontAwesomeIcon icon={faCubes} />
        <Typography variant="h6">
          {t(BrightChainStrings.Admin_Blocks_Title)}
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <TextField
          size="small"
          placeholder={t(BrightChainStrings.Admin_Blocks_SearchPlaceholder)}
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <IconButton onClick={handleSearch}>
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </IconButton>
      </Box>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Select
          size="small"
          value={durabilityFilter}
          onChange={(e: SelectChangeEvent<string>) => {
            setDurabilityFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="All">
            {t(BrightChainStrings.Admin_Blocks_FilterAllDurability)}
          </MenuItem>
          <MenuItem value="standard">
            {t(BrightChainStrings.Admin_Blocks_FilterStandard)}
          </MenuItem>
          <MenuItem value="high_durability">
            {t(BrightChainStrings.Admin_Blocks_FilterHighDurability)}
          </MenuItem>
          <MenuItem value="ephemeral">
            {t(BrightChainStrings.Admin_Blocks_FilterEphemeral)}
          </MenuItem>
        </Select>
        <Select
          size="small"
          value={sortBy}
          onChange={(e: SelectChangeEvent<string>) => {
            setSortBy(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="createdAt">
            {t(BrightChainStrings.Admin_Blocks_SortByDate)}
          </MenuItem>
          <MenuItem value="size">
            {t(BrightChainStrings.Admin_Blocks_SortBySize)}
          </MenuItem>
        </Select>
      </Box>

      {error && (
        <Typography color="error" mb={1}>
          {error}
        </Typography>
      )}

      {detailBlock && (
        <Box mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            {t(BrightChainStrings.Admin_Blocks_Detail)}
          </Typography>
          <Typography variant="body2">
            {t(BrightChainStrings.Admin_Blocks_ColBlockId)}:{' '}
            {detailBlock.blockId}
          </Typography>
          <Typography variant="body2">
            {t(BrightChainStrings.Admin_Blocks_ColSize)}:{' '}
            {t(BrightChainStrings.Admin_Blocks_SizeBytes, {
              SIZE: String(detailBlock.size),
            })}
          </Typography>
          <Typography variant="body2">
            {t(BrightChainStrings.Admin_Blocks_ColDurability)}:{' '}
            {detailBlock.durabilityLevel}
          </Typography>
          <Typography variant="body2">
            {t(BrightChainStrings.Admin_Blocks_ColCreated)}:{' '}
            {new Date(detailBlock.createdAt).toLocaleString()}
          </Typography>
          <Typography variant="body2">
            {t(BrightChainStrings.Admin_Blocks_ColAccessCount)}:{' '}
            {detailBlock.accessCount}
          </Typography>
          <Typography variant="body2">
            {t(BrightChainStrings.Admin_Blocks_ColReplication)}:{' '}
            {detailBlock.replicationStatus}
          </Typography>
          {detailBlock.checksum && (
            <Typography variant="body2">
              {t(BrightChainStrings.Admin_Blocks_Checksum)}:{' '}
              {detailBlock.checksum}
            </Typography>
          )}
          <Box display="flex" gap={1} mt={1}>
            <Button
              size="small"
              startIcon={<FontAwesomeIcon icon={faRadar} />}
              onClick={() => handleDiscover(detailBlock.blockId)}
            >
              {t(BrightChainStrings.Admin_Blocks_DiscoverNodes)}
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<FontAwesomeIcon icon={faTrash} />}
              onClick={() => {
                setDeleteBlockId(detailBlock.blockId);
                setDeleteOpen(true);
              }}
            >
              {t(BrightChainStrings.Admin_Common_Delete)}
            </Button>
            <Button size="small" onClick={() => setDetailBlock(null)}>
              {t(BrightChainStrings.Admin_Common_Close)}
            </Button>
          </Box>
        </Box>
      )}

      {discoverBlockId && discoverResult && (
        <Box mb={2} p={1} bgcolor="action.hover" borderRadius={1}>
          <Typography variant="body2" fontWeight="bold">
            {t(BrightChainStrings.Admin_Blocks_NodesHoldingBlockTemplate, {
              BLOCK_ID: discoverBlockId,
            })}
          </Typography>
          {discoverResult.length === 0 ? (
            <Typography variant="body2">
              {t(BrightChainStrings.Admin_Blocks_NoNodesFound)}
            </Typography>
          ) : (
            discoverResult.map((nodeId) => (
              <Typography key={nodeId} variant="body2">
                {nodeId}
              </Typography>
            ))
          )}
        </Box>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              {t(BrightChainStrings.Admin_Blocks_ColBlockId)}
            </TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Blocks_ColSize)}</TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Blocks_ColDurability)}
            </TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Blocks_ColCreated)}
            </TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Blocks_ColAccessCount)}
            </TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Blocks_ColReplication)}
            </TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Blocks_ColActions)}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && blocks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                {t(BrightChainStrings.Admin_Common_Loading)}
              </TableCell>
            </TableRow>
          ) : blocks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                {t(BrightChainStrings.Admin_Blocks_NoBlocksFound)}
              </TableCell>
            </TableRow>
          ) : (
            blocks.map((block) => (
              <TableRow
                key={block.blockId}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => setDetailBlock(block)}
              >
                <TableCell>
                  {block.blockId.length > 16
                    ? `${block.blockId.slice(0, 16)}…`
                    : block.blockId}
                </TableCell>
                <TableCell>{block.size}</TableCell>
                <TableCell>{block.durabilityLevel}</TableCell>
                <TableCell>
                  {new Date(block.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{block.accessCount}</TableCell>
                <TableCell>{block.replicationStatus}</TableCell>
                <TableCell>
                  <Tooltip
                    title={t(BrightChainStrings.Admin_Blocks_DiscoverNodes)}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDiscover(block.blockId);
                      }}
                    >
                      <FontAwesomeIcon icon={faRadar} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t(BrightChainStrings.Admin_Common_Delete)}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteBlockId(block.blockId);
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
          {t(BrightChainStrings.Admin_Blocks_DeleteTitle)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightChainStrings.Admin_Blocks_DeleteConfirmTemplate, {
              BLOCK_ID: deleteBlockId ?? '',
            })}
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

export default memo(AdminBlockExplorerPanel);
