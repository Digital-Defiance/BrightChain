/**
 * SearchBar — Real-time client-side filtering + server-side search on submit.
 *
 * - Text input with debounced (100ms) client-side filtering by title, tags, siteUrl
 * - Filter chips for entry types (Login, Secure Note, Credit Card, Identity)
 * - Favorites toggle
 * - On Enter/submit: calls BrightPassApiService.searchEntries() for server-side search
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type {
  EntryPropertyRecord,
  VaultEntryType,
} from '@brightchain/brightchain-lib';
import { BrightPassStrings } from '@brightchain/brightchain-lib';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import {
  Box,
  Chip,
  InputAdornment,
  TextField,
  ToggleButton,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';
import { useBrightPassApi } from '../hooks/useBrightPassApi';

/** All entry types available as filter chips. */
const ENTRY_TYPES: VaultEntryType[] = [
  'login',
  'secure_note',
  'credit_card',
  'identity',
];

export interface SearchBarProps {
  entries: EntryPropertyRecord[];
  onFilteredChange: (filtered: EntryPropertyRecord[]) => void;
  vaultId: string;
  onServerSearch?: (results: EntryPropertyRecord[]) => void;
}

/**
 * Filters entries client-side based on text query, active type filters, and
 * favorites toggle. Exported for unit/property testing.
 */
export function filterEntries(
  entries: EntryPropertyRecord[],
  query: string,
  activeTypes: Set<VaultEntryType>,
  favoritesOnly: boolean,
): EntryPropertyRecord[] {
  const lowerQuery = query.trim().toLowerCase();

  return entries.filter((entry) => {
    // Text filter: match title, tags, or siteUrl
    if (lowerQuery) {
      const matchesText =
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        entry.siteUrl.toLowerCase().includes(lowerQuery);
      if (!matchesText) return false;
    }

    // Type filter: if any chips are active, only show matching types
    if (activeTypes.size > 0 && !activeTypes.has(entry.entryType)) {
      return false;
    }

    // Favorites filter
    if (favoritesOnly && !entry.favorite) {
      return false;
    }

    return true;
  });
}

const SearchBar: React.FC<SearchBarProps> = ({
  entries,
  onFilteredChange,
  vaultId,
  onServerSearch,
}) => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();
  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<VaultEntryType>>(
    new Set(),
  );
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Perform client-side filtering and notify parent
  const applyFilter = useCallback(
    (q: string, types: Set<VaultEntryType>, favs: boolean) => {
      const filtered = filterEntries(entries, q, types, favs);
      onFilteredChange(filtered);
    },
    [entries, onFilteredChange],
  );

  // Debounced text input handler (100ms)
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        applyFilter(value, activeTypes, favoritesOnly);
      }, 100);
    },
    [applyFilter, activeTypes, favoritesOnly],
  );

  // Toggle a type chip on/off
  const handleTypeToggle = useCallback(
    (type: VaultEntryType) => {
      setActiveTypes((prev) => {
        const next = new Set(prev);
        if (next.has(type)) {
          next.delete(type);
        } else {
          next.add(type);
        }
        applyFilter(query, next, favoritesOnly);
        return next;
      });
    },
    [applyFilter, query, favoritesOnly],
  );

  // Toggle favorites filter
  const handleFavoritesToggle = useCallback(() => {
    setFavoritesOnly((prev) => {
      const next = !prev;
      applyFilter(query, activeTypes, next);
      return next;
    });
  }, [applyFilter, query, activeTypes]);

  // Server-side search on Enter/submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onServerSearch) return;

      const searchQuery = {
        text: query || undefined,
        type:
          activeTypes.size === 1
            ? Array.from(activeTypes)[0]
            : undefined,
        favorite: favoritesOnly || undefined,
      };

      const results = await brightPassApi.searchEntries(
        vaultId,
        searchQuery,
      );
      onServerSearch(results);
    },
    [query, activeTypes, favoritesOnly, vaultId, onServerSearch],
  );

  // Re-apply filter when entries change externally
  useEffect(() => {
    applyFilter(query, activeTypes, favoritesOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const entryTypeLabel = (type: VaultEntryType): string => {
    switch (type) {
      case 'login':
        return t(BrightPassStrings.EntryType_Login);
      case 'secure_note':
        return t(BrightPassStrings.EntryType_SecureNote);
      case 'credit_card':
        return t(BrightPassStrings.EntryType_CreditCard);
      case 'identity':
        return t(BrightPassStrings.EntryType_Identity);
      default:
        return type;
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder={t(BrightPassStrings.SearchBar_Placeholder)}
        value={query}
        onChange={handleQueryChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        inputProps={{
          'aria-label': t(BrightPassStrings.SearchBar_Placeholder),
        }}
        sx={{ mb: 1 }}
      />

      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
        {ENTRY_TYPES.map((type) => (
          <Chip
            key={type}
            label={entryTypeLabel(type)}
            color={activeTypes.has(type) ? 'primary' : 'default'}
            variant={activeTypes.has(type) ? 'filled' : 'outlined'}
            onClick={() => handleTypeToggle(type)}
            aria-pressed={activeTypes.has(type)}
          />
        ))}

        <ToggleButton
          value="favorites"
          selected={favoritesOnly}
          onChange={handleFavoritesToggle}
          size="small"
          aria-label={t(BrightPassStrings.SearchBar_FilterFavorites)}
          sx={{ borderRadius: '16px', px: 1.5, textTransform: 'none' }}
        >
          {favoritesOnly ? (
            <StarIcon fontSize="small" sx={{ mr: 0.5 }} />
          ) : (
            <StarBorderIcon fontSize="small" sx={{ mr: 0.5 }} />
          )}
          <Typography variant="body2">
            {t(BrightPassStrings.SearchBar_FilterFavorites)}
          </Typography>
        </ToggleButton>
      </Box>
    </Box>
  );
};

export default SearchBar;
