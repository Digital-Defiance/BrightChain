import {
  faCubes,
  faGlobe,
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

interface BlockEntry {
  hash: string;
  pool: string;
  metadata: {
    size?: number;
    createdAt?: string;
    accessCount?: number;
    durabilityLevel?: string;
    replicationStatus?: string;
    checksum?: string;
    parityBlockIds?: string[];
    replicaNodeIds?: string[];
  } | null;
}

interface PoolInfo {
  poolId: string;
  blockCount: number;
  totalBytes: number;
}

interface NetworkSearchResult {
  source: 'network';
  blockId?: string;
  found?: boolean;
  locations?: Array<{ nodeId: string; latencyMs?: number }>;
  hits?: Array<{ entry: Record<string, unknown>; sourceNodeId: string }>;
  queriedPeers?: number;
  duration?: number;
  warning?: string;
}

const PAGE_LIMIT = 20;

const AdminBlockExplorerPanel: FC = () => {
  const { tBranded: t } = useI18n();

  // Pool state
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState<string>('');

  // Block list state (cursor-based)
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [poolTotal, setPoolTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([
    undefined,
  ]);

  // Search state
  const [searchId, setSearchId] = useState('');
  const [searchResults, setSearchResults] = useState<BlockEntry[] | null>(null);

  // Network search state
  const [networkQuery, setNetworkQuery] = useState('');
  const [networkResult, setNetworkResult] =
    useState<NetworkSearchResult | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailBlock, setDetailBlock] = useState<BlockEntry | null>(null);
  const [discoverResult, setDiscoverResult] = useState<Array<{
    nodeId: string;
    latencyMs?: number;
  }> | null>(null);
  const [discoverBlockId, setDiscoverBlockId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);

  // Fetch pools on mount
  const fetchPools = useCallback(async () => {
    try {
      const res = await authenticatedApi.get('/admin/blocks/pools');
      const data = res.data.data ?? res.data;
      setPools(data.pools ?? []);
      if (!selectedPool && data.pools?.length > 0) {
        setSelectedPool(data.pools[0].poolId);
      }
    } catch {
      // Pools not available
    }
  }, [selectedPool]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  // Fetch blocks for current pool + cursor
  const fetchBlocks = useCallback(
    async (cursor?: string) => {
      if (!selectedPool) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          pool: selectedPool,
          limit: String(PAGE_LIMIT),
        });
        if (cursor) params.set('cursor', cursor);
        const res = await authenticatedApi.get(
          `/admin/blocks?${params.toString()}`,
        );
        const data = res.data.data ?? res.data;
        setBlocks(data.blocks ?? []);
        setPoolTotal(data.poolTotal ?? 0);
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch blocks');
      } finally {
        setLoading(false);
      }
    },
    [selectedPool],
  );

  // Reload when pool changes
  useEffect(() => {
    setCursorStack([undefined]);
    fetchBlocks();
  }, [fetchBlocks]);

  const handleNextPage = () => {
    if (nextCursor) {
      setCursorStack((s) => [...s, nextCursor]);
      fetchBlocks(nextCursor);
    }
  };

  const handlePrevPage = () => {
    setCursorStack((s) => {
      const next = s.slice(0, -1);
      fetchBlocks(next[next.length - 1]);
      return next;
    });
  };

  // Local search by hash prefix
  const handleSearch = async () => {
    const q = searchId.trim();
    if (!q) return;
    setError(null);
    setSearchResults(null);
    try {
      const params = new URLSearchParams({ q, limit: '20' });
      if (selectedPool) params.set('pool', selectedPool);
      const res = await authenticatedApi.get(
        `/admin/blocks/search?${params.toString()}`,
      );
      const data = res.data.data ?? res.data;
      setSearchResults(data.blocks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    }
  };

  // Network search (gossip discovery)
  const handleNetworkSearch = async () => {
    const q = networkQuery.trim();
    if (!q) return;
    setError(null);
    setNetworkResult(null);
    try {
      // If it looks like a block hash (hex), search by blockId; otherwise by fileName
      const isHex = /^[0-9a-f]+$/i.test(q);
      const body = isHex ? { blockId: q } : { fileName: q };
      const res = await authenticatedApi.post(
        '/admin/blocks/network-search',
        body,
      );
      setNetworkResult(res.data.data ?? res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network search failed');
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
      setDiscoverResult(data.locations ?? []);
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
      fetchBlocks(cursorStack[cursorStack.length - 1]);
      fetchPools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete block');
      setDeleteOpen(false);
    }
  };

  const currentPage = cursorStack.length;
  const displayBlocks = searchResults ?? blocks;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <FontAwesomeIcon icon={faCubes} />
        <Typography variant="h6">
          {t(BrightChainStrings.Admin_Blocks_Title)}
        </Typography>
      </Box>

      {/* Pool selector + stats */}
      {pools.length > 0 && (
        <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
          <Select
            size="small"
            value={selectedPool}
            onChange={(e: SelectChangeEvent<string>) => {
              setSelectedPool(e.target.value);
              setSearchResults(null);
            }}
            sx={{ minWidth: 200 }}
          >
            {pools.map((p) => (
              <MenuItem key={p.poolId} value={p.poolId}>
                {p.poolId} ({p.blockCount} blocks)
              </MenuItem>
            ))}
          </Select>
          {pools.find((p) => p.poolId === selectedPool) && (
            <Chip
              size="small"
              label={`${poolTotal} blocks in pool`}
              variant="outlined"
            />
          )}
        </Box>
      )}

      {/* Local search */}
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <TextField
          size="small"
          placeholder={t(BrightChainStrings.Admin_Blocks_SearchPlaceholder)}
          value={searchId}
          onChange={(e) => {
            setSearchId(e.target.value);
            if (!e.target.value) setSearchResults(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ minWidth: 300 }}
        />
        <IconButton onClick={handleSearch} title="Search local blocks">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </IconButton>
      </Box>

      {/* Network search */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <TextField
          size="small"
          placeholder="Network search (block hash or file name)..."
          value={networkQuery}
          onChange={(e) => setNetworkQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNetworkSearch()}
          sx={{ minWidth: 300 }}
        />
        <IconButton
          onClick={handleNetworkSearch}
          title="Search across network via gossip"
        >
          <FontAwesomeIcon icon={faGlobe} />
        </IconButton>
      </Box>

      {searchResults && (
        <Box mb={1}>
          <Chip
            size="small"
            label={`Local search: ${searchResults.length} result(s)`}
            onDelete={() => {
              setSearchResults(null);
              setSearchId('');
            }}
          />
        </Box>
      )}

      {error && (
        <Typography color="error" mb={1}>
          {error}
        </Typography>
      )}

      {/* Network search results */}
      {networkResult && (
        <Box mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>
            <FontAwesomeIcon icon={faGlobe} /> Network Search Results
            {networkResult.warning && (
              <Chip
                size="small"
                label={networkResult.warning}
                color="warning"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Queried {networkResult.queriedPeers ?? 0} peers in{' '}
            {networkResult.duration ?? 0}ms
          </Typography>
          {networkResult.blockId && (
            <Box>
              <Typography variant="body2">
                Block {networkResult.blockId}:{' '}
                {networkResult.found ? 'Found' : 'Not found'}
              </Typography>
              {networkResult.locations?.map((loc, i) => (
                <Typography key={i} variant="body2" sx={{ pl: 2 }}>
                  Node: {loc.nodeId}{' '}
                  {loc.latencyMs != null && `(${loc.latencyMs}ms)`}
                </Typography>
              ))}
            </Box>
          )}
          {networkResult.hits && networkResult.hits.length > 0 && (
            <Box>
              {networkResult.hits.map((hit, i) => (
                <Box key={i} mb={0.5}>
                  <Typography variant="body2">
                    From node {hit.sourceNodeId}: {JSON.stringify(hit.entry)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          {!networkResult.blockId &&
            (!networkResult.hits || networkResult.hits.length === 0) && (
              <Typography variant="body2">
                No results found on the network.
              </Typography>
            )}
          <Button
            size="small"
            onClick={() => setNetworkResult(null)}
            sx={{ mt: 1 }}
          >
            {t(BrightChainStrings.Admin_Common_Close)}
          </Button>
        </Box>
      )}

      {/* Block detail panel */}
      {detailBlock && (
        <Box mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            {t(BrightChainStrings.Admin_Blocks_Detail)}
          </Typography>
          <Typography variant="body2">Hash: {detailBlock.hash}</Typography>
          <Typography variant="body2">Pool: {detailBlock.pool}</Typography>
          {detailBlock.metadata && (
            <>
              {detailBlock.metadata.size != null && (
                <Typography variant="body2">
                  Size: {detailBlock.metadata.size} bytes
                </Typography>
              )}
              {detailBlock.metadata.createdAt && (
                <Typography variant="body2">
                  Created:{' '}
                  {new Date(detailBlock.metadata.createdAt).toLocaleString()}
                </Typography>
              )}
              {detailBlock.metadata.durabilityLevel && (
                <Typography variant="body2">
                  Durability: {detailBlock.metadata.durabilityLevel}
                </Typography>
              )}
              {detailBlock.metadata.checksum && (
                <Typography variant="body2">
                  Checksum: {detailBlock.metadata.checksum}
                </Typography>
              )}
            </>
          )}
          <Box display="flex" gap={1} mt={1}>
            <Button
              size="small"
              startIcon={<FontAwesomeIcon icon={faRadar} />}
              onClick={() => handleDiscover(detailBlock.hash)}
            >
              {t(BrightChainStrings.Admin_Blocks_DiscoverNodes)}
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<FontAwesomeIcon icon={faTrash} />}
              onClick={() => {
                setDeleteBlockId(detailBlock.hash);
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

      {/* Discover result */}
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
            discoverResult.map((loc, i) => (
              <Typography key={i} variant="body2">
                {loc.nodeId} {loc.latencyMs != null && `(${loc.latencyMs}ms)`}
              </Typography>
            ))
          )}
        </Box>
      )}

      {/* Block table */}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Hash</TableCell>
            <TableCell>Pool</TableCell>
            <TableCell>Size</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Blocks_ColActions)}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && displayBlocks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                {t(BrightChainStrings.Admin_Common_Loading)}
              </TableCell>
            </TableRow>
          ) : displayBlocks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                {t(BrightChainStrings.Admin_Blocks_NoBlocksFound)}
              </TableCell>
            </TableRow>
          ) : (
            displayBlocks.map((block) => (
              <TableRow
                key={block.hash}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => setDetailBlock(block)}
              >
                <TableCell>
                  {block.hash.length > 16
                    ? `${block.hash.slice(0, 16)}…`
                    : block.hash}
                </TableCell>
                <TableCell>{block.pool}</TableCell>
                <TableCell>{block.metadata?.size ?? '—'}</TableCell>
                <TableCell>
                  {block.metadata?.createdAt
                    ? new Date(block.metadata.createdAt).toLocaleString()
                    : '—'}
                </TableCell>
                <TableCell>
                  <Tooltip
                    title={t(BrightChainStrings.Admin_Blocks_DiscoverNodes)}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDiscover(block.hash);
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
                        setDeleteBlockId(block.hash);
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

      {/* Cursor-based pagination */}
      {!searchResults && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          gap={2}
          mt={2}
        >
          <Button
            size="small"
            disabled={cursorStack.length <= 1}
            onClick={handlePrevPage}
          >
            {t(BrightChainStrings.Admin_Common_Previous)}
          </Button>
          <Typography variant="body2">
            Page {currentPage} · {poolTotal} blocks in pool
          </Typography>
          <Button size="small" disabled={!nextCursor} onClick={handleNextPage}>
            {t(BrightChainStrings.Admin_Common_Next)}
          </Button>
        </Box>
      )}

      {/* Delete confirmation dialog */}
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
