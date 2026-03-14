/**
 * ConversationSearch Component
 *
 * Search within a conversation's messages.
 *
 * @remarks
 * Implements Requirements 44.11, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { Clear, Search } from '@mui/icons-material';
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the ConversationSearch component */
export interface ConversationSearchProps {
  /** Callback when search query changes */
  onSearch: (query: string) => void;
  /** Number of results found */
  resultCount?: number;
  /** Whether a search is active */
  isSearching?: boolean;
}

/**
 * ConversationSearch
 *
 * Compact search bar with result count and clear button.
 */
export function ConversationSearch({
  onSearch,
  resultCount,
  isSearching = false,
}: ConversationSearchProps) {
  const { t } = useBrightHubTranslation();
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <Box aria-label={t(BrightHubStrings.ConversationSearch_AriaLabel)}>
      <TextField
        fullWidth
        size="small"
        placeholder={t(BrightHubStrings.ConversationSearch_Placeholder)}
        value={query}
        onChange={handleChange}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClear}
                  aria-label={t(BrightHubStrings.ConversationSearch_Clear)}
                >
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
            'aria-label': t(BrightHubStrings.ConversationSearch_AriaLabel),
          },
        }}
      />
      {query && resultCount !== undefined && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: 'block' }}
        >
          {resultCount === 0
            ? t(BrightHubStrings.ConversationSearch_NoResults)
            : t(BrightHubStrings.ConversationSearch_ResultCountTemplate, {
                COUNT: String(resultCount),
              })}
        </Typography>
      )}
    </Box>
  );
}

export default ConversationSearch;
