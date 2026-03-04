// Mock @brightchain/brightchain-lib to avoid the full ECIES/GUID init chain.
jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  BrightHubStrings: new Proxy(
    {},
    { get: (_target: unknown, prop: string) => String(prop) },
  ),
  BrightHubComponentId: 'BrightHub',
}));

jest.mock('../hooks/useBrightHubTranslation', () => ({
  useBrightHubTranslation: () => ({
    t: (key: string, _vars?: Record<string, string>) => key,
  }),
}));

import {
  ApproveFollowersMode,
  SuggestionReason,
} from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectionSuggestions } from './ConnectionSuggestions';

const makeProfile = (id: string, displayName: string, username: string) => ({
  _id: id,
  username,
  displayName,
  bio: '',
  followerCount: 10,
  followingCount: 5,
  postCount: 20,
  isVerified: false,
  isProtected: false,
  approveFollowersMode: ApproveFollowersMode.ApproveNone,
  privacySettings: {
    hideFollowerCount: false,
    hideFollowingCount: false,
    hideFollowersList: false,
    hideFollowingList: false,
  },
  createdAt: '2024-01-01T00:00:00Z',
});

const makeSuggestions = () => [
  {
    userId: 'user-1',
    userProfile: makeProfile('user-1', 'Alice Smith', 'alice'),
    mutualConnectionCount: 5,
    score: 0.9,
    reason: SuggestionReason.MutualConnections,
  },
  {
    userId: 'user-2',
    userProfile: makeProfile('user-2', 'Bob Jones', 'bob'),
    mutualConnectionCount: 1,
    score: 0.7,
    reason: SuggestionReason.SimilarInterests,
  },
  {
    userId: 'user-3',
    userProfile: makeProfile('user-3', 'Carol Lee', 'carol'),
    mutualConnectionCount: 0,
    score: 0.5,
    reason: SuggestionReason.SimilarToUser,
  },
];

describe('ConnectionSuggestions', () => {
  it('renders suggestion cards with display names', () => {
    render(<ConnectionSuggestions suggestions={makeSuggestions()} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Carol Lee')).toBeInTheDocument();
  });

  it('renders usernames with @ prefix', () => {
    render(<ConnectionSuggestions suggestions={makeSuggestions()} />);

    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
  });

  it('shows empty state when no suggestions', () => {
    render(<ConnectionSuggestions suggestions={[]} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<ConnectionSuggestions suggestions={[]} loading />);

    expect(
      screen.getByLabelText('ConnectionSuggestions_Loading'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('displays mutual connection count for suggestions with mutuals', () => {
    render(<ConnectionSuggestions suggestions={makeSuggestions()} />);

    // user-1 has 5 mutuals → plural template key
    expect(screen.getByTestId('mutual-count-user-1')).toBeInTheDocument();
    // user-2 has 1 mutual → singular key
    expect(screen.getByTestId('mutual-count-user-2')).toBeInTheDocument();
    // user-3 has 0 mutuals → no mutual count shown
    expect(screen.queryByTestId('mutual-count-user-3')).not.toBeInTheDocument();
  });

  it('displays suggestion reason labels', () => {
    render(<ConnectionSuggestions suggestions={makeSuggestions()} />);

    expect(
      screen.getByText('ConnectionSuggestions_ReasonMutualConnections'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ConnectionSuggestions_ReasonSimilarInterests'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ConnectionSuggestions_ReasonSimilarToUser'),
    ).toBeInTheDocument();
  });

  it('calls onFollow when follow button is clicked', () => {
    const onFollow = jest.fn();
    render(
      <ConnectionSuggestions
        suggestions={makeSuggestions()}
        onFollow={onFollow}
      />,
    );

    const followButtons = screen.getAllByRole('button', {
      name: 'ConnectionSuggestions_Follow',
    });
    fireEvent.click(followButtons[0]);

    expect(onFollow).toHaveBeenCalledWith('user-1');
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(
      <ConnectionSuggestions
        suggestions={makeSuggestions()}
        onDismiss={onDismiss}
      />,
    );

    const dismissButtons = screen.getAllByLabelText(
      'ConnectionSuggestions_Dismiss',
    );
    fireEvent.click(dismissButtons[1]);

    expect(onDismiss).toHaveBeenCalledWith('user-2');
  });

  it('renders data-testid attributes for each suggestion', () => {
    render(<ConnectionSuggestions suggestions={makeSuggestions()} />);

    expect(screen.getByTestId('suggestion-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('suggestion-user-2')).toBeInTheDocument();
    expect(screen.getByTestId('suggestion-user-3')).toBeInTheDocument();
  });
});
