import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { filterLedgerEntries } from '../utils/analytics-utils';
import {
  getSignalTypeColor,
  getSignalTypeLabel,
} from '../utils/provider-utils';
import { IStatusHistoryEntryDTO } from './ProviderDetailView';

export interface IHistoryLedgerProps {
  /** All entries to display */
  entries: IStatusHistoryEntryDTO[];
  /** Export handler */
  onExport?: (format: 'csv' | 'json') => void;
}

const PAGE_SIZES = [25, 50, 100];

/**
 * Paginated, searchable history ledger table with export buttons.
 */
export function HistoryLedger({ entries, onExport }: IHistoryLedgerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filtered = useMemo(
    () => filterLedgerEntries(entries, searchQuery),
    [entries, searchQuery],
  );

  const pageEntries = useMemo(
    () => filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filtered, page, rowsPerPage],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setPage(0);
    },
    [],
  );

  return (
    <Box data-testid="history-ledger">
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          size="small"
          placeholder="Search entries..."
          value={searchQuery}
          onChange={handleSearchChange}
          data-testid="ledger-search"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 220 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} entries
          </Typography>
          {onExport && (
            <ButtonGroup size="small" variant="outlined">
              <Button
                startIcon={<DownloadIcon />}
                onClick={() => onExport('csv')}
                data-testid="export-csv"
              >
                CSV
              </Button>
              <Button
                startIcon={<DownloadIcon />}
                onClick={() => onExport('json')}
                data-testid="export-json"
              >
                JSON
              </Button>
            </ButtonGroup>
          )}
        </Box>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Signal Type</TableCell>
              <TableCell align="right">Events</TableCell>
              <TableCell align="right">Confidence</TableCell>
              <TableCell align="right">Time Since Activity</TableCell>
              <TableCell align="right">HTTP Status</TableCell>
              <TableCell>Error</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" variant="body2">
                    No entries found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pageEntries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(entry.timestamp).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getSignalTypeLabel(entry.signalType)}
                      color={getSignalTypeColor(entry.signalType)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{entry.eventCount}</TableCell>
                  <TableCell align="right">
                    {(entry.confidence * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell align="right">
                    {entry.timeSinceLastActivityMs != null
                      ? `${(entry.timeSinceLastActivityMs / 1000).toFixed(1)}s`
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {entry.httpStatusCode ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={entry.errorMessage ? 'error' : 'text.secondary'}
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.errorMessage ?? '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={PAGE_SIZES}
      />
    </Box>
  );
}
