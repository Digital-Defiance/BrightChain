/**
 * AuditLogView — Displays the append-only audit trail for a vault.
 *
 * - Fetches and displays audit log entries (timestamp, action type, member ID)
 * - Filters by action type
 * - Displays in reverse chronological order (newest first)
 * - All strings via useBrightPassTranslation()
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import type { AuditLogEntry } from '@brightchain/brightchain-lib';
import { AuditAction, BrightPassStrings } from '@brightchain/brightchain-lib';
import FilterListIcon from '@mui/icons-material/FilterList';
import type { SelectChangeEvent } from '@mui/material';
import {
  Alert,
  Box,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BreadcrumbNav from '../components/BreadcrumbNav';
import { useBrightPassApi } from '../hooks/useBrightPassApi';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

/**
 * Lightweight view-layer type for audit entries used by pure helper functions.
 * Maps from the API's AuditLogEntry to a simpler shape for display and testing.
 */
export interface AuditEntry {
  id: string;
  timestamp: string;
  actionType: string;
  memberId: string;
  details?: string;
}

/** All filterable action types. */
const AUDIT_ACTION_VALUES: string[] = Object.values(AuditAction);

// ---------------------------------------------------------------------------
// Pure helper functions (exported for property-based testing)
// ---------------------------------------------------------------------------

/**
 * Sorts audit entries in reverse chronological order (newest first).
 *
 * Property 18: For all adjacent pairs (entry[i], entry[i+1]),
 * entry[i].timestamp >= entry[i+1].timestamp.
 */
export function sortAuditEntries(entries: AuditEntry[]): AuditEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/**
 * Filters audit entries by action type. Returns all entries when
 * actionType is null or empty string.
 *
 * Property 17: The filtered result contains exactly those entries
 * whose actionType matches the selected filter.
 */
export function filterAuditEntries(
  entries: AuditEntry[],
  actionType: string | null,
): AuditEntry[] {
  if (!actionType) return entries;
  return entries.filter((e) => e.actionType === actionType);
}

/**
 * Formats an audit entry for display: ISO timestamp → locale string,
 * action type as-is label.
 *
 * Property 16: The rendered row contains a formatted timestamp,
 * the action type string, and the member ID.
 */
export function formatAuditEntry(entry: AuditEntry): {
  formattedTimestamp: string;
  actionLabel: string;
} {
  const d = new Date(entry.timestamp);
  return {
    formattedTimestamp: d.toLocaleString(),
    actionLabel: entry.actionType,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps an API AuditLogEntry to the view-layer AuditEntry. */
function toAuditEntry(entry: AuditLogEntry): AuditEntry {
  const ts =
    entry.timestamp instanceof Date
      ? entry.timestamp.toISOString()
      : String(entry.timestamp);
  return {
    id: entry.id,
    timestamp: ts,
    actionType: entry.action,
    memberId: entry.memberId,
    details: entry.metadata
      ? Object.entries(entry.metadata)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AuditLogView: React.FC = () => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();
  const { vaultId } = useParams<{ vaultId: string }>();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('');

  const fetchAuditLog = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await brightPassApi.getAuditLog(vaultId);
      setEntries(raw.map(toAuditEntry));
    } catch {
      setError(t(BrightPassStrings.AuditLog_Error));
    } finally {
      setLoading(false);
    }
  }, [vaultId, brightPassApi, t]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setActionFilter(event.target.value);
  };

  const displayed = sortAuditEntries(
    filterAuditEntries(entries, actionFilter || null),
  );

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <BreadcrumbNav />

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h4" component="h1">
          {t(BrightPassStrings.AuditLog_Title)}
        </Typography>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="audit-action-filter-label">
            <FilterListIcon
              fontSize="small"
              sx={{ mr: 0.5, verticalAlign: 'middle' }}
            />
            {t(BrightPassStrings.AuditLog_Action)}
          </InputLabel>
          <Select
            labelId="audit-action-filter-label"
            id="audit-action-filter"
            value={actionFilter}
            label={t(BrightPassStrings.AuditLog_Action)}
            onChange={handleFilterChange}
          >
            <MenuItem value="">
              {t(BrightPassStrings.AuditLog_FilterAll)}
            </MenuItem>
            {AUDIT_ACTION_VALUES.map((action) => (
              <MenuItem key={action} value={action}>
                {action}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && displayed.length === 0 && !error && (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          {t(BrightPassStrings.AuditLog_NoEntries)}
        </Typography>
      )}

      {displayed.length > 0 && (
        <TableContainer>
          <Table size="small" aria-label={t(BrightPassStrings.AuditLog_Title)}>
            <TableHead>
              <TableRow>
                <TableCell>{t(BrightPassStrings.AuditLog_Timestamp)}</TableCell>
                <TableCell>{t(BrightPassStrings.AuditLog_Action)}</TableCell>
                <TableCell>{t(BrightPassStrings.AuditLog_Member)}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayed.map((entry) => {
                const { formattedTimestamp, actionLabel } =
                  formatAuditEntry(entry);
                return (
                  <TableRow key={entry.id}>
                    <TableCell>{formattedTimestamp}</TableCell>
                    <TableCell>{actionLabel}</TableCell>
                    <TableCell>{entry.memberId}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default AuditLogView;
