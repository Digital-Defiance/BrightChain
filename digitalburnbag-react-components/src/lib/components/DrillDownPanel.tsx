import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { formatDateWithBD } from '../utils/formatBrightDate';
import {
  getSignalTypeColor,
  getSignalTypeLabel,
} from '../utils/provider-utils';
import { IStatusHistoryEntryDTO } from './ProviderDetailView';

export interface IDrillDownPanelProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Entries within the clicked bucket */
  entries: IStatusHistoryEntryDTO[];
  /** Label for the bucket (e.g. time range) */
  bucketLabel?: string;
  /** Navigate to ledger view */
  onViewInLedger?: () => void;
}

function EntryDetail({ entry }: { entry: IStatusHistoryEntryDTO }) {
  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Chip
          label={getSignalTypeLabel(entry.signalType)}
          color={getSignalTypeColor(entry.signalType)}
          size="small"
        />
        <Typography variant="caption" color="text.secondary">
          {formatDateWithBD(entry.timestamp)}
        </Typography>
      </Box>
      <Typography variant="body2">
        Events: {entry.eventCount} | Confidence:{' '}
        {(entry.confidence * 100).toFixed(0)}%
      </Typography>
      {entry.timeSinceLastActivityMs != null && (
        <Typography variant="body2" color="text.secondary">
          Time since activity:{' '}
          {(entry.timeSinceLastActivityMs / 1000).toFixed(1)}s
        </Typography>
      )}
      {entry.httpStatusCode != null && (
        <Typography variant="body2" color="text.secondary">
          HTTP {entry.httpStatusCode}
        </Typography>
      )}
      {entry.errorMessage && (
        <Typography variant="body2" color="error">
          {entry.errorMessage}
        </Typography>
      )}
    </Box>
  );
}

/**
 * MUI Drawer that opens when a chart data point is clicked.
 * Displays all IStatusHistoryEntryDTO records within the clicked bucket.
 */
export function DrillDownPanel({
  open,
  onClose,
  entries,
  bucketLabel,
  onViewInLedger,
}: IDrillDownPanelProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      data-testid="drill-down-panel"
      PaperProps={{ sx: { width: 400, maxWidth: '90vw' } }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Bucket Detail
        </Typography>
        {bucketLabel && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {bucketLabel}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </Typography>
        <Divider sx={{ my: 1 }} />

        {entries.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No entries in this bucket
          </Typography>
        ) : entries.length === 1 ? (
          <EntryDetail entry={entries[0]} />
        ) : (
          <List
            sx={{ maxHeight: 'calc(100vh - 220px)', overflow: 'auto' }}
            disablePadding
          >
            {entries.map((entry) => (
              <ListItem key={entry.id} disablePadding sx={{ display: 'block' }}>
                <ListItemText disableTypography>
                  <EntryDetail entry={entry} />
                </ListItemText>
                <Divider />
              </ListItem>
            ))}
          </List>
        )}

        {onViewInLedger && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={onViewInLedger}
              data-testid="view-in-ledger"
            >
              View in Ledger
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
