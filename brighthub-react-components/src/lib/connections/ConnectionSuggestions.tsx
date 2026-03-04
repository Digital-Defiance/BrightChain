/**
 * ConnectionSuggestions Component
 *
 * Displays a list of suggested connections with mutual connection count,
 * suggestion reason, and follow/dismiss actions.
 *
 * @remarks
 * Implements Requirements 35.5, 61.4
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import {
  IBaseConnectionSuggestion,
  SuggestionReason,
} from '@brightchain/brighthub-lib';
import { Close, PersonAdd } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the ConnectionSuggestions component */
export interface ConnectionSuggestionsProps {
  /** The list of connection suggestions to display */
  suggestions: IBaseConnectionSuggestion<string>[];
  /** Whether data is loading */
  loading?: boolean;
  /** Callback when the user clicks follow on a suggestion */
  onFollow?: (userId: string) => void;
  /** Callback when the user dismisses a suggestion */
  onDismiss?: (userId: string) => void;
}

/**
 * ConnectionSuggestions
 *
 * Renders suggested connections with display name, reason,
 * mutual connection count, and follow/dismiss actions.
 */
export function ConnectionSuggestions({
  suggestions,
  loading = false,
  onFollow,
  onDismiss,
}: ConnectionSuggestionsProps) {
  const { t } = useBrightHubTranslation();

  const reasonLabel = (reason: SuggestionReason): string => {
    switch (reason) {
      case SuggestionReason.MutualConnections:
        return t(
          BrightHubStrings.ConnectionSuggestions_ReasonMutualConnections,
        );
      case SuggestionReason.SimilarInterests:
        return t(BrightHubStrings.ConnectionSuggestions_ReasonSimilarInterests);
      case SuggestionReason.SimilarToUser:
        return t(BrightHubStrings.ConnectionSuggestions_ReasonSimilarToUser);
    }
  };

  const mutualLabel = (count: number): string => {
    if (count === 1) {
      return t(BrightHubStrings.ConnectionSuggestions_MutualCountSingular);
    }
    return t(BrightHubStrings.ConnectionSuggestions_MutualCountPluralTemplate, {
      COUNT: String(count),
    });
  };

  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        aria-label={t(BrightHubStrings.ConnectionSuggestions_AriaLabel)}
      >
        <CircularProgress
          aria-label={t(BrightHubStrings.ConnectionSuggestions_Loading)}
        />
      </Box>
    );
  }

  return (
    <Box
      aria-label={t(BrightHubStrings.ConnectionSuggestions_AriaLabel)}
      data-testid="connection-suggestions"
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t(BrightHubStrings.ConnectionSuggestions_Title)}
      </Typography>

      {suggestions.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
          <Typography variant="body1" color="text.secondary">
            {t(BrightHubStrings.ConnectionSuggestions_EmptyState)}
          </Typography>
        </Box>
      )}

      {suggestions.map((suggestion) => (
        <Card
          key={suggestion.userId}
          variant="outlined"
          sx={{ mb: 1 }}
          data-testid={`suggestion-${suggestion.userId}`}
        >
          <CardContent
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              '&:last-child': { pb: 2 },
            }}
          >
            <Avatar
              src={suggestion.userProfile.profilePictureUrl}
              alt={suggestion.userProfile.displayName}
              sx={{ width: 48, height: 48 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight="bold" noWrap>
                {suggestion.userProfile.displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                @{suggestion.userProfile.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {reasonLabel(suggestion.reason)}
              </Typography>
              {suggestion.mutualConnectionCount > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block' }}
                  data-testid={`mutual-count-${suggestion.userId}`}
                >
                  {mutualLabel(suggestion.mutualConnectionCount)}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<PersonAdd />}
                onClick={() => onFollow?.(suggestion.userId)}
                aria-label={t(BrightHubStrings.ConnectionSuggestions_Follow)}
              >
                {t(BrightHubStrings.ConnectionSuggestions_Follow)}
              </Button>
              <Tooltip
                title={t(BrightHubStrings.ConnectionSuggestions_Dismiss)}
              >
                <IconButton
                  size="small"
                  onClick={() => onDismiss?.(suggestion.userId)}
                  aria-label={t(BrightHubStrings.ConnectionSuggestions_Dismiss)}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default ConnectionSuggestions;
