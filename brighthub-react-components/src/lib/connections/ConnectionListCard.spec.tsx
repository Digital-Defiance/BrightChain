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

import { ConnectionVisibility } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectionListCard } from './ConnectionListCard';

const makeList = (overrides = {}) => ({
  _id: 'list-1',
  ownerId: 'user-1',
  name: 'Close Friends',
  description: 'My closest connections',
  visibility: ConnectionVisibility.Private,
  memberCount: 12,
  followerCount: 3,
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  ...overrides,
});

describe('ConnectionListCard', () => {
  it('renders list name and description', () => {
    render(<ConnectionListCard list={makeList()} />);

    expect(screen.getByText('Close Friends')).toBeInTheDocument();
    expect(screen.getByText('My closest connections')).toBeInTheDocument();
  });

  it('shows visibility indicator for private list', () => {
    render(<ConnectionListCard list={makeList()} />);

    expect(screen.getByTestId('visibility-private')).toBeInTheDocument();
  });

  it('shows visibility indicator for public list', () => {
    render(
      <ConnectionListCard
        list={makeList({ visibility: ConnectionVisibility.Public })}
      />,
    );

    expect(screen.getByTestId('visibility-public')).toBeInTheDocument();
  });

  it('shows visibility indicator for followers-only list', () => {
    render(
      <ConnectionListCard
        list={makeList({ visibility: ConnectionVisibility.FollowersOnly })}
      />,
    );

    expect(screen.getByTestId('visibility-followers_only')).toBeInTheDocument();
  });

  it('displays member count', () => {
    render(<ConnectionListCard list={makeList()} />);

    expect(
      screen.getByText('ConnectionListCard_MembersTemplate'),
    ).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<ConnectionListCard list={makeList()} onClick={onClick} />);

    fireEvent.click(screen.getByTestId('connection-list-card'));

    expect(onClick).toHaveBeenCalledWith('list-1');
  });

  it('renders without description when not provided', () => {
    render(<ConnectionListCard list={makeList({ description: undefined })} />);

    expect(screen.getByText('Close Friends')).toBeInTheDocument();
    expect(
      screen.queryByText('My closest connections'),
    ).not.toBeInTheDocument();
  });
});
