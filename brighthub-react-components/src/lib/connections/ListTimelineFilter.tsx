/**
 * ListTimelineFilter Component
 *
 * Dropdown filter for narrowing the timeline to posts from a specific
 * connection list. Shows "All connections" as the default option and
 * displays member counts next to each list name.
 *
 * @remarks
 * Implements Requirements 35.14, 61.4
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import ClearIcon from '@mui/icons-material/Clear';
import {
  Box,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Minimal list shape needed by the filter */
export interface FilterableConnectionList {
  _id: string;
  name: string;
  memberCount: number;
}

/** Props for the ListTimelineFilter component */
export interface ListTimelineFilterProps {
  /** Available connection lists */
  lists: FilterableConnectionList[];
  /** Currently selected list ID, or null for "All connections" */
  selectedListId: string | null;
  /** Called with the chosen list ID (or null for all) */
  onChange: (listId: string | null) => void;
  /** Whether the filter is disabled */
  disabled?: boolean;
}

const ALL_VALUE = '__all__';

/**
 * ListTimelineFilter
 *
 * Select-based filter that lets users narrow their timeline to a single
 * connection list. Includes a clear-filter action when a list is active.
 */
export function ListTimelineFilter({
  lists,
  selectedListId,
  onChange,
  disabled = false,
}: ListTimelineFilterProps) {
  const { t } = useBrightHubTranslation();

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onChange(value === ALL_VALUE ? null : value);
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <Box
      data-testid="list-timeline-filter"
      aria-label={t(BrightHubStrings.ListTimelineFilter_AriaLabel)}
    >
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {t(BrightHubStrings.ListTimelineFilter_Title)}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Select<string>
          value={selectedListId ?? ALL_VALUE}
          onChange={handleChange}
          disabled={disabled}
          size="small"
          fullWidth
          data-testid="list-timeline-select"
          aria-label={t(BrightHubStrings.ListTimelineFilter_SelectList)}
        >
          <MenuItem value={ALL_VALUE} data-testid="list-option-all">
            {t(BrightHubStrings.ListTimelineFilter_AllConnections)}
          </MenuItem>

          {lists.map((list) => (
            <MenuItem
              key={list._id}
              value={list._id}
              data-testid={`list-option-${list._id}`}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="body2">{list.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t(BrightHubStrings.ListTimelineFilter_MembersTemplate, {
                    COUNT: String(list.memberCount),
                  })}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>

        {selectedListId !== null && (
          <IconButton
            size="small"
            onClick={handleClear}
            disabled={disabled}
            aria-label={t(BrightHubStrings.ListTimelineFilter_ClearFilter)}
            data-testid="list-timeline-clear"
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

export default ListTimelineFilter;
