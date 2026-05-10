import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Box,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

export interface IStorageBreakdown {
  category: string;
  sizeBytes: number;
  fileCount: number;
}

export interface ILargeItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  sizeBytes: number;
}

export interface IStaleFile {
  id: string;
  name: string;
  sizeBytes: number;
  lastAccessedAt: string;
  ageDays: number;
}

export interface IStorageAnalyticsProps {
  totalUsedBytes: number;
  quotaBytes: number;
  breakdown: IStorageBreakdown[];
  largestItems: ILargeItem[];
  staleFiles: IStaleFile[];
  onMoveToTrash: (fileId: string) => void;
  onScheduleDestruction: (fileId: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1,
  );
  const value = bytes / Math.pow(k, i);
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

/**
 * Storage analytics dashboard showing usage, breakdown, and cleanup actions.
 */
export function StorageAnalytics({
  totalUsedBytes,
  quotaBytes,
  breakdown,
  largestItems,
  staleFiles,
  onMoveToTrash,
  onScheduleDestruction,
}: IStorageAnalyticsProps) {
  const { tBranded: t } = useI18n();
  const usagePercent =
    quotaBytes > 0 ? Math.min((totalUsedBytes / quotaBytes) * 100, 100) : 0;

  return (
    <Box>
      {/* Usage overview */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t(DigitalBurnbagStrings.Analytics_StorageUsage)}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={usagePercent}
          sx={{ height: 10, borderRadius: 1, mb: 1 }}
          aria-label={t(DigitalBurnbagStrings.Analytics_StorageUsage)}
        />
        <Typography variant="body2" color="text.secondary">
          {t(DigitalBurnbagStrings.Analytics_UsageSummary)
            .replace('{used}', formatBytes(totalUsedBytes))
            .replace('{quota}', formatBytes(quotaBytes))
            .replace('{percent}', usagePercent.toFixed(1))}
        </Typography>
      </Box>

      {/* Breakdown by type */}
      {breakdown.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t(DigitalBurnbagStrings.Analytics_ByFileType)}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  {t(DigitalBurnbagStrings.Analytics_ColCategory)}
                </TableCell>
                <TableCell align="right">
                  {t(DigitalBurnbagStrings.Analytics_ColFiles)}
                </TableCell>
                <TableCell align="right">
                  {t(DigitalBurnbagStrings.Analytics_ColSize)}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {breakdown.map((b) => (
                <TableRow key={b.category}>
                  <TableCell>{b.category}</TableCell>
                  <TableCell align="right">{b.fileCount}</TableCell>
                  <TableCell align="right">
                    {formatBytes(b.sizeBytes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Largest items */}
      {largestItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t(DigitalBurnbagStrings.Analytics_LargestItems)}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  {t(DigitalBurnbagStrings.Analytics_ColName)}
                </TableCell>
                <TableCell align="right">
                  {t(DigitalBurnbagStrings.Analytics_ColSize)}
                </TableCell>
                <TableCell align="right">
                  {t(DigitalBurnbagStrings.Analytics_ColItemActions)}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {largestItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align="right">
                    {formatBytes(item.sizeBytes)}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => onMoveToTrash(item.id)}>
                      {t(DigitalBurnbagStrings.Analytics_Trash)}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Stale files */}
      {staleFiles.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t(DigitalBurnbagStrings.Analytics_StaleFiles)}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  {t(DigitalBurnbagStrings.Analytics_ColName)}
                </TableCell>
                <TableCell align="right">
                  {t(DigitalBurnbagStrings.Analytics_ColSize)}
                </TableCell>
                <TableCell align="right">
                  {t(DigitalBurnbagStrings.Analytics_ColAge)}
                </TableCell>
                <TableCell align="right">
                  {t(DigitalBurnbagStrings.Analytics_ColItemActions)}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staleFiles.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.name}</TableCell>
                  <TableCell align="right">
                    {formatBytes(f.sizeBytes)}
                  </TableCell>
                  <TableCell align="right">
                    {t(DigitalBurnbagStrings.Analytics_AgeDays, {
                      count: f.ageDays,
                    })}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => onMoveToTrash(f.id)}>
                      {t(DigitalBurnbagStrings.Analytics_Trash)}
                    </Button>
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => onScheduleDestruction(f.id)}
                    >
                      {t(DigitalBurnbagStrings.Analytics_ScheduleDestroy)}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
