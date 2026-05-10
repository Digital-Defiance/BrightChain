/**
 * FriendsSuggestionSection — Renders a "Friends" section in the sharing picker.
 *
 * Calls IFriendsSuggestionProvider.getFriendSuggestions() and displays
 * friends as a list. Includes a "Share with Friends" quick action button.
 * Omits both section and button when the user has no friends.
 *
 * Requirements: 17.1, 17.2, 17.4
 */
import {
  IBaseFriendship,
  IFriendsSuggestionProvider,
} from '@brightchain/brightchain-lib';
import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { FC, memo, useCallback, useEffect, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FriendsSuggestionSectionProps {
  /** Provider that fetches friend suggestions */
  suggestionProvider: IFriendsSuggestionProvider;
  /** Current user's member ID */
  currentUserId: string;
  /** Callback when a friend is selected */
  onSelectFriend: (friendId: string) => void;
  /** Callback when "Share with Friends" quick action is clicked */
  onShareWithAllFriends?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract the "other" member ID from a friendship relative to the current user.
 */
function getFriendId(
  friendship: IBaseFriendship<string>,
  currentUserId: string,
): string {
  return friendship.memberIdA === currentUserId
    ? friendship.memberIdB
    : friendship.memberIdA;
}

// ─── Component ──────────────────────────────────────────────────────────────

const FriendsSuggestionSection: FC<FriendsSuggestionSectionProps> = ({
  suggestionProvider,
  currentUserId,
  onSelectFriend,
  onShareWithAllFriends,
}) => {
  const { tBranded: t } = useI18n();
  const [friends, setFriends] = useState<IBaseFriendship<string>[]>([]);

  useEffect(() => {
    let cancelled = false;

    suggestionProvider
      .getFriendSuggestions(currentUserId)
      .then((result) => {
        if (!cancelled) {
          setFriends(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFriends([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [suggestionProvider, currentUserId]);

  const handleSelect = useCallback(
    (friendId: string) => {
      onSelectFriend(friendId);
    },
    [onSelectFriend],
  );

  // Omit section and button entirely when user has no friends (Req 17.4)
  if (friends.length === 0) {
    return null;
  }

  return (
    <div data-testid="friends-suggestion-section">
      <Typography variant="subtitle2" sx={{ px: 2, pt: 1, pb: 0.5 }}>
        {t(DigitalBurnbagStrings.Friends_SectionTitle)}
      </Typography>
      {onShareWithAllFriends && (
        <Button
          variant="outlined"
          size="small"
          onClick={onShareWithAllFriends}
          data-testid="share-with-friends-button"
          sx={{ mx: 2, mb: 1 }}
        >
          {t(DigitalBurnbagStrings.Friends_ShareWithAll)}
        </Button>
      )}
      <List dense>
        {friends.map((friendship) => {
          const friendId = getFriendId(friendship, currentUserId);
          return (
            <ListItemButton
              key={friendship._id}
              onClick={() => handleSelect(friendId)}
              data-testid={`friend-item-${friendId}`}
            >
              <ListItemAvatar>
                <Avatar>{friendId.charAt(0).toUpperCase()}</Avatar>
              </ListItemAvatar>
              <ListItemText primary={friendId} />
            </ListItemButton>
          );
        })}
      </List>
    </div>
  );
};

export default memo(FriendsSuggestionSection);
