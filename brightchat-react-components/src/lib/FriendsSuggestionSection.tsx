/**
 * FriendsSuggestionSection — Renders a "Friends" section in the DM recipient picker.
 *
 * Calls IFriendsSuggestionProvider.getFriendSuggestions() and displays matching
 * friends as a list. Omits the section entirely when the user has no friends.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
import {
  IBaseFriendship,
  IFriendsSuggestionProvider,
} from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Avatar from '@mui/material/Avatar';
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
  /** Search query to filter friends by display name / username */
  searchQuery?: string;
  /** Callback when a friend is selected */
  onSelectFriend: (friendId: string) => void;
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
  searchQuery,
  onSelectFriend,
}) => {
  const { tBranded: t } = useI18n();
  const [friends, setFriends] = useState<IBaseFriendship<string>[]>([]);

  useEffect(() => {
    let cancelled = false;

    suggestionProvider
      .getFriendSuggestions(currentUserId, searchQuery)
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
  }, [suggestionProvider, currentUserId, searchQuery]);

  const handleSelect = useCallback(
    (friendId: string) => {
      onSelectFriend(friendId);
    },
    [onSelectFriend],
  );

  // Omit section entirely when user has no friends (Req 14.4)
  if (friends.length === 0) {
    return null;
  }

  return (
    <div data-testid="friends-suggestion-section">
      <Typography variant="subtitle2" sx={{ px: 2, pt: 1, pb: 0.5 }}>
        {t(BrightChatStrings.Friends_SectionTitle)}
      </Typography>
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
