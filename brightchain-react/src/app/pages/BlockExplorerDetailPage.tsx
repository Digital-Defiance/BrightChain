/**
 * Public block detail page — metadata + network locate.
 */
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import axios from 'axios';
import { FC, memo, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface BlockMetadata {
  blockId: string;
  exists: boolean;
  metadata?: {
    size?: number;
    createdAt?: string;
    durabilityLevel?: string;
    accessCount?: number;
    replicationStatus?: string;
    checksum?: string;
    parityBlockIds?: string[];
    replicaNodeIds?: string[];
  };
}

interface LocateResult {
  found: boolean;
  locations: Array<{ nodeId: string; latencyMs?: number }>;
  queriedPeers: number;
  duration: number;
}

const BlockExplorerDetailPage: FC = () => {
  const { tBranded: t } = useI18n();
  const { blockId } = useParams<{ blockId: string }>();
  const navigate = useNavigate();
  const [block, setBlock] = useState<BlockMetadata | null>(null);
  const [locateResult, setLocateResult] = useState<LocateResult | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!blockId) return;
    setError(null);
    axios
      .get(`/api/explorer/blocks/${blockId}`)
      .then((res) => {
        const data = res.data.data ?? res.data;
        setBlock(data.block ?? data);
      })
      .catch(() => setError(t(BrightChainStrings.Explorer_BlockNotFound)));
  }, [blockId, t]);

  const handleLocate = useCallback(async () => {
    if (!blockId) return;
    setLocating(true);
    setLocateResult(null);
    try {
      const res = await axios.post(`/api/explorer/blocks/${blockId}/locate`);
      setLocateResult(res.data.data ?? res.data);
    } catch {
      setError(t(BrightChainStrings.Explorer_LocateFailed));
    } finally {
      setLocating(false);
    }
  }, [blockId, t]);

  const meta = block?.metadata;

  return (
    <Box>
      <Button size="small" onClick={() => navigate('/explorer')} sx={{ mb: 2 }}>
        {t(BrightChainStrings.Explorer_BackToBlocks)}
      </Button>

      <Typography variant="h5" mb={2}>
        {t(BrightChainStrings.Explorer_BlockDetail)}
      </Typography>

      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}

      {block && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography
            variant="body1"
            sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mb: 2 }}
          >
            {block.blockId}
          </Typography>

          {meta && (
            <Box display="flex" flexDirection="column" gap={1}>
              {meta.size != null && (
                <Typography variant="body2">
                  {t(BrightChainStrings.Explorer_ColSize)}:{' '}
                  {meta.size.toLocaleString()} B
                </Typography>
              )}
              {meta.createdAt && (
                <Typography variant="body2">
                  {t(BrightChainStrings.Explorer_ColCreated)}:{' '}
                  {new Date(meta.createdAt).toLocaleString()}
                </Typography>
              )}
              {meta.durabilityLevel && (
                <Typography variant="body2">
                  {t(BrightChainStrings.Admin_Blocks_ColDurability)}:{' '}
                  {meta.durabilityLevel}
                </Typography>
              )}
              {meta.checksum && (
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {t(BrightChainStrings.Admin_Blocks_Checksum)}: {meta.checksum}
                </Typography>
              )}
              {meta.parityBlockIds && meta.parityBlockIds.length > 0 && (
                <Box>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Explorer_Parity)}:
                  </Typography>
                  {meta.parityBlockIds.map((id) => (
                    <Chip
                      key={id}
                      label={id.slice(0, 16) + '…'}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5, fontFamily: 'monospace' }}
                      onClick={() => navigate(`/explorer/block/${id}`)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Button variant="outlined" onClick={handleLocate} disabled={locating}>
            {locating
              ? t(BrightChainStrings.Explorer_Locating)
              : t(BrightChainStrings.Explorer_LocateOnNetwork)}
          </Button>

          {locateResult && (
            <Box mt={2}>
              <Typography variant="subtitle2" fontWeight="bold">
                {t(BrightChainStrings.Explorer_NetworkLocate)} —{' '}
                {locateResult.found
                  ? t(BrightChainStrings.Explorer_NetworkFound)
                  : t(BrightChainStrings.Explorer_NetworkNotFound)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(BrightChainStrings.Explorer_NetworkQueriedTemplate, {
                  PEERS: String(locateResult.queriedPeers),
                  DURATION: String(locateResult.duration),
                })}
              </Typography>
              {locateResult.locations.length > 0 ? (
                locateResult.locations.map((loc, i) => (
                  <Typography key={i} variant="body2" sx={{ pl: 1 }}>
                    {loc.nodeId}{' '}
                    {loc.latencyMs != null && `(${loc.latencyMs}ms)`}
                  </Typography>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t(BrightChainStrings.Explorer_NetworkNoNodes)}
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default memo(BlockExplorerDetailPage);
