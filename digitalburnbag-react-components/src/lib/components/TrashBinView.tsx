import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { toBrightDateString } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import {
  Box,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface ITrashItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  originalPath: string;
  /** ISO-8601 date string */
  deletedAt: string;
  /** ISO-8601 date string */
  autoPurgeAt: string;
}

export interface ITrashBinViewProps {
  items: ITrashItem[];
  onRestore: (itemId: string) => void;
  onPermanentDelete: (itemId: string) => void;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO date to a locale-friendly string with BrightDate. */
function formatDate(iso: string): string {
  try {
    const localeStr = new Date(iso).toLocaleString();
    const bd = toBrightDateString(iso, 3);
    return bd ? `${localeStr} (BD ${bd})` : localeStr;
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Trash bin view displaying soft-deleted items with restore and permanent
 * delete actions.
 */
export function TrashBinView({
  items,
  onRestore,
  onPermanentDelete,
  loading = false,
}: ITrashBinViewProps) {
  const { tBranded: t } = useI18n();

  /** Format the remaining time until auto-purge as "X days" or "X hours". */
  function formatTimeRemaining(autoPurgeAt: string): string {
    const now = Date.now();
    const purge = new Date(autoPurgeAt).getTime();
    const diffMs = purge - now;

    if (diffMs <= 0) return t(DigitalBurnbagStrings.Trash_Expired);

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return t(DigitalBurnbagStrings.Trash_DaysRemaining, {
        count: days,
      });
    }
    return t(DigitalBurnbagStrings.Trash_HoursRemaining, {
      count: hours,
    });
  }

  return (
    <Box>
      {loading && (
        <LinearProgress aria-label={t(DigitalBurnbagStrings.Trash_Loading)} />
      )}

      <Table size="small" aria-label="Trash bin">
        <TableHead>
          <TableRow>
            <TableCell>{t(DigitalBurnbagStrings.Trash_ColName)}</TableCell>
            <TableCell>
              {t(DigitalBurnbagStrings.Trash_ColOriginalPath)}
            </TableCell>
            <TableCell>{t(DigitalBurnbagStrings.Trash_ColDeleted)}</TableCell>
            <TableCell>
              {t(DigitalBurnbagStrings.Trash_ColTimeRemaining)}
            </TableCell>
            <TableCell align="right">
              {t(DigitalBurnbagStrings.Trash_ColActions)}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Typography variant="body2" color="text.secondary" py={4}>
                  {t(DigitalBurnbagStrings.Trash_Empty)}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.type === 'folder' ? (
                      <FolderIcon fontSize="small" color="action" aria-hidden />
                    ) : (
                      <InsertDriveFileIcon
                        fontSize="small"
                        color="action"
                        aria-hidden
                      />
                    )}
                    <Typography variant="body2" noWrap>
                      {item.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {item.originalPath}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(item.deletedAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatTimeRemaining(item.autoPurgeAt)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={t(DigitalBurnbagStrings.Trash_Restore)}>
                    <IconButton
                      size="small"
                      onClick={() => onRestore(item.id)}
                      aria-label={`${t(DigitalBurnbagStrings.Trash_Restore)} ${item.name}`}
                    >
                      <RestoreFromTrashIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={t(DigitalBurnbagStrings.Trash_DeletePermanently)}
                  >
                    <IconButton
                      size="small"
                      onClick={() => onPermanentDelete(item.id)}
                      aria-label={`${t(DigitalBurnbagStrings.Trash_DeletePermanently)} ${item.name}`}
                      color="error"
                    >
                      <DeleteForeverIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Box>
  );
}

export default TrashBinView;
