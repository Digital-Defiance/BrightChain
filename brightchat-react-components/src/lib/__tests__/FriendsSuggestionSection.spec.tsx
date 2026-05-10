/**
 * Unit tests for FriendsSuggestionSection component.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
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
import type { FriendsSuggestionSectionProps } from '../FriendsSuggestionSection';
import FriendsSuggestionSection from '../FriendsSuggestionSection';

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    ...overrides,
  };
  return {
    ...render(<FriendsSuggestionSection {...defaultProps} />),
    props: defaultProps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FriendsSuggestionSection', () => {
  it('renders "Friends" heading and friend items when friends exist (Req 14.1, 14.2)', async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Friends_SectionTitle')).toBeTruthy();
    });

    expect(screen.getByTestId('friend-item-alice')).toBeTruthy();
    expect(screen.getByTestId('friend-item-bob')).toBeTruthy();
  });

  it('omits section entirely when user has no friends (Req 14.4)', async () => {
    const emptyProvider = createMockProvider([]);
    const { container } = renderSection({
      suggestionProvider: emptyProvider,
    });

    // Wait for the async effect to settle
    await waitFor(() => {
      expect(emptyProvider.getFriendSuggestions).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('friends-suggestion-section')).toBeNull();
    expect(screen.queryByText('Friends_SectionTitle')).toBeNull();
  });

  it('passes searchQuery to provider for filtering (Req 14.3)', async () => {
    const provider = createMockProvider([friendAlice]);
    renderSection({
      suggestionProvider: provider,
      searchQuery: 'alice',
    });

    await waitFor(() => {
      expect(provider.getFriendSuggestions).toHaveBeenCalledWith(
        'current-user',
        'alice',
      );
    });

    expect(screen.getByTestId('friend-item-alice')).toBeTruthy();
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
