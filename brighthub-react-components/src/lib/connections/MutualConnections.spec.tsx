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
  IBaseUserProfile,
} from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MutualConnections } from './MutualConnections';

const makeUser = (id: string, name: string): IBaseUserProfile<string> => ({
  _id: id,
  username: name.toLowerCase().replace(/\s/g, ''),
  displayName: name,
  bio: '',
  followerCount: 0,
  followingCount: 0,
  postCount: 0,
  isVerified: false,
  isProtected: false,
  approveFollowersMode: ApproveFollowersMode.ApproveNone,
  privacySettings: {
    hideFollowerCount: false,
    hideFollowingCount: false,
    hideFollowersFromNonFollowers: false,
    hideFollowingFromNonFollowers: false,
    allowDmsFromNonFollowers: true,
    showOnlineStatus: true,
    showReadReceipts: true,
  },
  createdAt: '2024-01-01T00:00:00Z',
});

const sampleUsers = [
  makeUser('u1', 'Alice Smith'),
  makeUser('u2', 'Bob Jones'),
  makeUser('u3', 'Carol White'),
];

describe('MutualConnections', () => {
  it('renders mutual connections list with avatars and names', () => {
    render(<MutualConnections connections={sampleUsers} totalCount={3} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('@alicesmith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
  });

  it('displays count header with plural template', () => {
    render(<MutualConnections connections={sampleUsers} totalCount={5} />);

    expect(screen.getByTestId('mutual-connections-count')).toBeInTheDocument();
  });

  it('displays singular count for 1 mutual connection', () => {
    render(<MutualConnections connections={[sampleUsers[0]]} totalCount={1} />);

    expect(screen.getByTestId('mutual-connections-count')).toHaveTextContent(
      'MutualConnections_CountSingular',
    );
  });

  it('shows empty state when no mutual connections', () => {
    render(<MutualConnections connections={[]} totalCount={0} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows loading spinner when loading with no data', () => {
    render(<MutualConnections connections={[]} totalCount={0} loading />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows Load more button when hasMore is true', () => {
    render(
      <MutualConnections connections={sampleUsers} totalCount={10} hasMore />,
    );

    expect(screen.getByTestId('load-more-button')).toBeInTheDocument();
  });

  it('calls onLoadMore when Load more is clicked', () => {
    const onLoadMore = jest.fn();
    render(
      <MutualConnections
        connections={sampleUsers}
        totalCount={10}
        hasMore
        onLoadMore={onLoadMore}
      />,
    );

    fireEvent.click(screen.getByTestId('load-more-button'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not show Load more button when hasMore is false', () => {
    render(
      <MutualConnections
        connections={sampleUsers}
        totalCount={3}
        hasMore={false}
      />,
    );

    expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument();
  });

  it('calls onSelect when a connection is clicked', () => {
    const onSelect = jest.fn();
    render(
      <MutualConnections
        connections={sampleUsers}
        totalCount={3}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('mutual-connection-u1'));
    expect(onSelect).toHaveBeenCalledWith('u1');
  });

  it('renders data-testid per connection item', () => {
    render(<MutualConnections connections={sampleUsers} totalCount={3} />);

    expect(screen.getByTestId('mutual-connection-u1')).toBeInTheDocument();
    expect(screen.getByTestId('mutual-connection-u2')).toBeInTheDocument();
    expect(screen.getByTestId('mutual-connection-u3')).toBeInTheDocument();
  });
});
