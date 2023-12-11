/**
 * Public block list page with cursor-based pagination and search.
 */
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FC, memo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface BlockEntry {
  hash: string;
  pool: string;
  metadata: { size?: number; createdAt?: string } | null;
}

interface PoolInfo { poolId: string; blockCount: number }

const PAGE_LIMIT = 20;

const BlockExplorerListPage: FC<{ searchMode?: boolean }> = ({ searchMode }) => {
  const { tBranded: t } = useI18n();
  const navigate = useNavigate();
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState('');
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [poolTotal, setPoolTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BlockEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get('/api/explorer/pools').then((res) => {
      const data = res.data.data ?? res.data;
      setPools(data.pools ?? []);
      if (data.pools?.length > 0 && !selectedPool) setSelectedPool(data.pools[0].poolId);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBlocks = useCallback(async (cursor?: string) => {
    if (!selectedPool) return;
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ pool: selectedPool, limit: String(PAGE_LIMIT) });
      if (cursor) params.set('cursor', cursor);
      const res = await axios.get(`/api/explorer/blocks?${params}`);
      const data = res.data.data ?? res.data;
      setBlocks(data.blocks ?? []); setPoolTotal(data.poolTotal ?? 0); setNextCursor(data.nextCursor ?? null);
    } catch { setError(t(BrightChainStrings.Explorer_FetchFailed)); }
    finally { setLoading(false); }
  }, [selectedPool, t]);

  useEffect(() => { if (!searchMode) { setCursorStack([undefined]); fetchBlocks(); } }, [fetchBlocks, searchMode]);

  const handleSearch = async () => {
    const q = searchQuery.trim(); if (!q) return; setError(null);
    try {
      const params = new URLSearchParams({ q, limit: '20' });
      if (selectedPool) params.set('pool', selectedPool);
      const res = await axios.get(`/api/explorer/blocks/search?${params}`);
      setSearchResults((res.data.data ?? res.data).blocks ?? []);
    } catch { setError(t(BrightChainStrings.Explorer_SearchFailed)); }
  };

  const displayBlocks = searchResults ?? blocks;

  return (
    <Box>
      <Typography variant="h5" mb={2}>
        {searchMode ? t(BrightChainStrings.Explorer_Nav_Search) : t(BrightChainStrings.Explorer_Title)}
      </Typography>

      {pools.length > 0 && (
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Select size="small" value={selectedPool} sx={{ minWidth: 200 }}
            onChange={(e: SelectChangeEvent) => { setSelectedPool(e.target.value); setSearchResults(null); }}>
            {pools.map((p) => (
              <MenuItem key={p.poolId} value={p.poolId}>
                {p.poolId} ({t(BrightChainStrings.Explorer_PoolBlocksTemplate, { COUNT: String(p.blockCount) })})
              </MenuItem>
            ))}
          </Select>
          {!searchMode && (
            <Chip size="small" label={t(BrightChainStrings.Explorer_PoolBlocksTemplate, { COUNT: String(poolTotal) })} variant="outlined" />
          )}
        </Box>
      )}

      <Box display="flex" gap={1} mb={2}>
        <TextField size="small" placeholder={t(BrightChainStrings.Explorer_SearchPlaceholder)} value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()} sx={{ minWidth: 300 }} />
        <Button variant="outlined" onClick={handleSearch}>{t(BrightChainStrings.Explorer_SearchButton)}</Button>
      </Box>

      {searchResults && (
        <Chip size="small" label={t(BrightChainStrings.Explorer_SearchResults, { COUNT: String(searchResults.length) })}
          onDelete={() => { setSearchResults(null); setSearchQuery(''); }} sx={{ mb: 1 }} />
      )}

      {error && <Typography color="error" mb={1}>{error}</Typography>}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t(BrightChainStrings.Explorer_ColHash)}</TableCell>
            <TableCell>{t(BrightChainStrings.Explorer_ColPool)}</TableCell>
            <TableCell>{t(BrightChainStrings.Explorer_ColSize)}</TableCell>
            <TableCell>{t(BrightChainStrings.Explorer_ColCreated)}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && displayBlocks.length === 0 ? (
            <TableRow><TableCell colSpan={4} align="center">…</TableCell></TableRow>
          ) : displayBlocks.length === 0 ? (
            <TableRow><TableCell colSpan={4} align="center">{t(BrightChainStrings.Explorer_NoBlocksFound)}</TableCell></TableRow>
          ) : (
            displayBlocks.map((b) => (
              <TableRow key={b.hash} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/explorer/block/${b.hash}`)}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {b.hash.length > 24 ? `${b.hash.slice(0, 24)}…` : b.hash}
                </TableCell>
                <TableCell>{b.pool}</TableCell>
                <TableCell>{b.metadata?.size != null ? `${b.metadata.size} B` : '—'}</TableCell>
                <TableCell>{b.metadata?.createdAt ? new Date(b.metadata.createdAt).toLocaleString() : '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!searchResults && (
        <Box display="flex" justifyContent="center" gap={2} mt={2}>
          <Button size="small" disabled={cursorStack.length <= 1}
            onClick={() => setCursorStack((s) => { const n = s.slice(0, -1); fetchBlocks(n[n.length - 1]); return n; })}>
            {t(BrightChainStrings.Explorer_Previous)}
          </Button>
          <Typography variant="body2" sx={{ lineHeight: '30px' }}>
            {t(BrightChainStrings.Explorer_PageTemplate, { PAGE: String(cursorStack.length), TOTAL: String(poolTotal) })}
          </Typography>
          <Button size="small" disabled={!nextCursor}
            onClick={() => { setCursorStack((s) => [...s, nextCursor!]); fetchBlocks(nextCursor!); }}>
            {t(BrightChainStrings.Explorer_Next)}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default memo(BlockExplorerListPage);
