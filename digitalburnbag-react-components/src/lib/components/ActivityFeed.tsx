import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { formatDateWithBD } from '../utils/formatBrightDate';
import {
  Box,
  Chip,
  Link,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';

export interface IActivityEntry {
  id: string;
  operationType: string;
  actorName: string;
  targetName: string;
  targetId: string;
  targetType: 'file' | 'folder';
  timestamp: string;
}

export interface IActivityFeedProps {
  entries: IActivityEntry[];
  onNavigateToTarget: (targetId: string, targetType: 'file' | 'folder') => void;
  operationTypes?: string[];
}

function formatDate(iso: string): string {
  return formatDateWithBD(iso);
}

/**
 * Chronological activity feed showing operations on user's files.
 */
export function ActivityFeed({
  entries,
  onNavigateToTarget,
  operationTypes = [],
}: IActivityFeedProps) {
  const { tBranded: t } = useI18n();
  const [filterType, setFilterType] = useState<string>('');

  const filtered = filterType
    ? entries.filter((e) => e.operationType === filterType)
    : entries;

  const handleFilterChange = useCallback((value: string) => {
    setFilterType(value);
  }, []);

  return (
    <Box>
      {operationTypes.length > 0 && (
        <Box sx={{ mb: 1, px: 2 }}>
          <Select
            size="small"
            displayEmpty
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">
              {t(DigitalBurnbagStrings.Activity_AllOperations)}
            </MenuItem>
            {operationTypes.map((tp) => (
              <MenuItem key={tp} value={tp}>
                {tp}
              </MenuItem>
            ))}
          </Select>
        </Box>
      )}

      {filtered.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          py={4}
        >
          {t(DigitalBurnbagStrings.Activity_NoActivity)}
        </Typography>
      ) : (
        <List dense>
          {filtered.map((entry) => (
            <ListItem key={entry.id}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={entry.operationType} size="small" />
                    <Typography variant="body2">
                      {t(DigitalBurnbagStrings.Activity_OnTarget)
                        .replace('{actor}', entry.actorName)
                        .replace('{target}', '')}
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() =>
                          onNavigateToTarget(entry.targetId, entry.targetType)
                        }
                      >
                        {entry.targetName}
                      </Link>
                    </Typography>
                  </Box>
                }
                secondary={formatDate(entry.timestamp)}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
