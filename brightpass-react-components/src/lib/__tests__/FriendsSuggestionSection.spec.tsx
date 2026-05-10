/**
 * Unit tests for BrightPass FriendsSuggestionSection component.
 *
 * Requirements: 16.1, 16.2, 16.3
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
import type { FriendsSuggestionSectionProps } from '../components/FriendsSuggestionSection';
import FriendsSuggestionSection from '../components/FriendsSuggestionSection';

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

describe('BrightPass FriendsSuggestionSection', () => {
  it('renders "Friends" heading and friend items when friends exist (Req 16.1, 16.2)', async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Friends_SectionTitle')).toBeTruthy();
    });

    expect(screen.getByTestId('friend-item-alice')).toBeTruthy();
    expect(screen.getByTestId('friend-item-bob')).toBeTruthy();
  });

  it('omits section entirely when user has no friends (Req 16.3)', async () => {
    const emptyProvider = createMockProvider([]);
    renderSection({
      suggestionProvider: emptyProvider,
    });

    // Wait for the async effect to settle
    await waitFor(() => {
      expect(emptyProvider.getFriendSuggestions).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('friends-suggestion-section')).toBeNull();
    expect(screen.queryByText('Friends_SectionTitle')).toBeNull();
  });

  it('calls onSelectFriend with the correct friend ID when a friend is clicked (Req 16.1)', async () => {
    const onSelectFriend = jest.fn();
    renderSection({ onSelectFriend });

    await waitFor(() => {
      expect(screen.getByTestId('friend-item-alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('friend-item-alice'));
    expect(onSelectFriend).toHaveBeenCalledWith('alice');
  });
});
