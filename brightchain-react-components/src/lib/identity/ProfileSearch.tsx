/**
 * ProfileSearch — Search the public key directory and view profiles.
 *
 * Requirements: 10.6, 10.10
 */

import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { FC, useCallback, useEffect, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchResult {
  memberId: string;
  displayName: string;
  username?: string;
  verifiedProofs: string[];
  relevanceScore: number;
}

interface ProfileSearchProps {
  /** Search function that returns matching profiles */
  onSearch: (query: string) => Promise<SearchResult[]>;
  /** Called when a profile is selected */
  onSelectProfile: (memberId: string) => void;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ProfileSearch: FC<ProfileSearchProps> = ({
  onSearch,
  onSelectProfile,
  debounceMs = 300,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }
      setSearching(true);
      try {
        const res = await onSearch(q.trim());
        setResults(res);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [onSearch],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs, performSearch]);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Find People
      </Typography>

      <TextField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        fullWidth
        placeholder="Search by name, username, or key fingerprint..."
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">🔍</InputAdornment>
            ),
            endAdornment: searching ? (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ) : undefined,
          },
        }}
        sx={{ mb: 2 }}
        inputProps={{ 'aria-label': 'Search profiles' }}
      />

      {/* Results */}
      <List>
        {results.map((result) => (
          <ListItem
            key={result.memberId}
            divider
            component="div"
            onClick={() => onSelectProfile(result.memberId)}
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            role="button"
            tabIndex={0}
            aria-label={`View profile of ${result.displayName}`}
          >
            <ListItemAvatar>
              <Avatar>{result.displayName.charAt(0).toUpperCase()}</Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>{result.displayName}</Typography>
                  {result.username && (
                    <Typography variant="body2" color="text.secondary">
                      @{result.username}
                    </Typography>
                  )}
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                  {result.verifiedProofs.map((proof) => (
                    <Chip
                      key={proof}
                      label={`✓ ${proof}`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  ))}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      {searched && results.length === 0 && !searching && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', py: 2 }}
        >
          No profiles found matching your search.
        </Typography>
      )}
    </Paper>
  );
};
