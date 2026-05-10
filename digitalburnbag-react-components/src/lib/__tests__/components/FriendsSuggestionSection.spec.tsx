/**
 * Unit tests for Digital Burnbag FriendsSuggestionSection component.
 *
 * Tests:
 * - Sharing picker renders "Friends" section when friends exist
 * - Section hidden when no friends
 * - "Share with Friends" button hidden when no friends
 * - "Share with Friends" button visible when friends exist
 *
 * Requirements: 17.1, 17.2, 17.4
 */

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
  },
  DurabilityLevel: {
    Ephemeral: 'ephemeral',
    Standard: 'standard',
    HighDurability: 'high_durability',
  },
}));

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

import type { IFriendsSuggestionProvider } from '@brightchain/brightchain-lib';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FriendsSuggestionSectionProps } from '../../components/FriendsSuggestionSection';
import FriendsSuggestionSection from '../../components/FriendsSuggestionSection';

// ─── Helpers ────────────────────────────────────────────────────────

const friendAlice = {
  _id: 'friendship-1',
  memberIdA: 'alice',
  memberIdB: 'current-user',
  createdAt: '2024-01-01T00:00:00Z',
};

const friendBob = {
  _id: 'friendship-2',
  memberIdA: 'bob',
  memberIdB: 'current-user',
  createdAt: '2024-01-02T00:00:00Z',
};

function createMockProvider(
  friends: (typeof friendAlice)[],
): IFriendsSuggestionProvider {
  return {
    getFriendSuggestions: jest.fn().mockResolvedValue({
      items: friends,
      hasMore: false,
      totalCount: friends.length,
    }),
  };
}

function renderSection(overrides: Partial<FriendsSuggestionSectionProps> = {}) {
  const defaultProps: FriendsSuggestionSectionProps = {
    suggestionProvider: createMockProvider([friendAlice, friendBob]),
    currentUserId: 'current-user',
    onSelectFriend: jest.fn(),
    onShareWithAllFriends: jest.fn(),
    ...overrides,
  };
  return {
    ...render(<FriendsSuggestionSection {...defaultProps} />),
    props: defaultProps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Digital Burnbag FriendsSuggestionSection', () => {
  it('renders "Friends" section with friend items when friends exist (Req 17.1, 17.2)', async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByTestId('friends-suggestion-section')).toBeTruthy();
    });

    expect(screen.getByTestId('friend-item-alice')).toBeTruthy();
    expect(screen.getByTestId('friend-item-bob')).toBeTruthy();
  });

  it('omits section entirely when user has no friends (Req 17.4)', async () => {
    const emptyProvider = createMockProvider([]);
    renderSection({
      suggestionProvider: emptyProvider,
    });

    await waitFor(() => {
      expect(emptyProvider.getFriendSuggestions).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('friends-suggestion-section')).toBeNull();
    expect(screen.queryByText('Friends_SectionTitle')).toBeNull();
  });

  it('"Share with Friends" button hidden when no friends (Req 17.4)', async () => {
    const emptyProvider = createMockProvider([]);
    renderSection({
      suggestionProvider: emptyProvider,
    });

    await waitFor(() => {
      expect(emptyProvider.getFriendSuggestions).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('share-with-friends-button')).toBeNull();
  });

  it('"Share with Friends" button visible and clickable when friends exist (Req 17.4)', async () => {
    const onShareWithAllFriends = jest.fn();
    renderSection({ onShareWithAllFriends });

    await waitFor(() => {
      expect(screen.getByTestId('share-with-friends-button')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('share-with-friends-button'));
    expect(onShareWithAllFriends).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectFriend with the correct friend ID when a friend is clicked', async () => {
    const onSelectFriend = jest.fn();
    renderSection({ onSelectFriend });

    await waitFor(() => {
      expect(screen.getByTestId('friend-item-alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('friend-item-alice'));
    expect(onSelectFriend).toHaveBeenCalledWith('alice');
  });
});
