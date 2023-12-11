/**
 * Public pool overview page — shows all pools with stats.
 */
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { FC, memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface PoolInfo { poolId: string; blockCount: number; totalBytes: number }

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const BlockExplorerPoolsPage: FC = () => {
  const { tBranded: t } = useI18n();
  const navigate = useNavigate();
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get('/api/explorer/pools').then((res) => {
      setPools((res.data.data ?? res.data).pools ?? []);
    }).catch(() => setError(t(BrightChainStrings.Explorer_FetchFailed)));
  }, [t]);

  return (
    <Box>
      <Typography variant="h5" mb={2}>{t(BrightChainStrings.Explorer_PoolsTitle)}</Typography>
      {error && <Typography color="error" mb={1}>{error}</Typography>}
      {pools.length === 0 && !error && (
        <Typography color="text.secondary">{t(BrightChainStrings.Explorer_PoolsNone)}</Typography>
      )}
      <Box display="flex" flexWrap="wrap" gap={2}>
        {pools.map((p) => (
          <Card key={p.poolId} sx={{ minWidth: 220 }}>
            <CardActionArea onClick={() => navigate(`/explorer?pool=${p.poolId}`)}>
              <CardContent>
                <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>{p.poolId}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(BrightChainStrings.Explorer_PoolBlocksTemplate, { COUNT: String(p.blockCount) })}
                </Typography>
                <Typography variant="body2" color="text.secondary">{formatBytes(p.totalBytes)}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default memo(BlockExplorerPoolsPage);
