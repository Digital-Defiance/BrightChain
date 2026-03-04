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

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { FollowRequest, FollowRequestList } from './FollowRequestList';

const makeRequest = (
  id: string,
  name: string,
  message?: string,
): FollowRequest => ({
  _id: id,
  requester: {
    _id: `user-${id}`,
    displayName: name,
    username: name.toLowerCase().replace(/\s/g, ''),
    profilePictureUrl: `https://example.com/${id}.jpg`,
  },
  message,
  createdAt: '2024-01-01T00:00:00Z',
});

const sampleRequests: FollowRequest[] = [
  makeRequest('r1', 'Alice Smith', 'Hi, I would love to connect!'),
  makeRequest('r2', 'Bob Jones'),
  makeRequest('r3', 'Carol White', 'We met at the conference.'),
];

describe('FollowRequestList', () => {
  it('renders follow requests with avatars and names', () => {
    render(<FollowRequestList requests={sampleRequests} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('@alicesmith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
  });

  it('displays custom messages when provided', () => {
    render(<FollowRequestList requests={sampleRequests} />);

    expect(screen.getByTestId('follow-request-message-r1')).toHaveTextContent(
      'Hi, I would love to connect!',
    );
    expect(screen.getByTestId('follow-request-message-r3')).toHaveTextContent(
      'We met at the conference.',
    );
    expect(
      screen.queryByTestId('follow-request-message-r2'),
    ).not.toBeInTheDocument();
  });

  it('displays pending count header with plural template', () => {
    render(<FollowRequestList requests={sampleRequests} />);

    expect(screen.getByTestId('follow-request-count')).toBeInTheDocument();
  });

  it('displays singular count for 1 request', () => {
    render(<FollowRequestList requests={[sampleRequests[0]]} />);

    expect(screen.getByTestId('follow-request-count')).toHaveTextContent(
      'FollowRequestList_PendingCountSingular',
    );
  });

  it('shows empty state when no pending requests', () => {
    render(<FollowRequestList requests={[]} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows loading spinner when loading with no data', () => {
    render(<FollowRequestList requests={[]} loading />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('calls onApprove when approve button is clicked', () => {
    const onApprove = jest.fn();
    render(
      <FollowRequestList requests={sampleRequests} onApprove={onApprove} />,
    );

    fireEvent.click(screen.getByTestId('approve-button-r1'));
    expect(onApprove).toHaveBeenCalledWith('r1');
  });

  it('calls onReject when reject button is clicked', () => {
    const onReject = jest.fn();
    render(<FollowRequestList requests={sampleRequests} onReject={onReject} />);

    fireEvent.click(screen.getByTestId('reject-button-r2'));
    expect(onReject).toHaveBeenCalledWith('r2');
  });

  it('renders data-testid per request item', () => {
    render(<FollowRequestList requests={sampleRequests} />);

    expect(screen.getByTestId('follow-request-r1')).toBeInTheDocument();
    expect(screen.getByTestId('follow-request-r2')).toBeInTheDocument();
    expect(screen.getByTestId('follow-request-r3')).toBeInTheDocument();
  });

  it('renders approve and reject buttons for each request', () => {
    render(<FollowRequestList requests={sampleRequests} />);

    expect(screen.getByTestId('approve-button-r1')).toBeInTheDocument();
    expect(screen.getByTestId('reject-button-r1')).toBeInTheDocument();
    expect(screen.getByTestId('approve-button-r2')).toBeInTheDocument();
    expect(screen.getByTestId('reject-button-r2')).toBeInTheDocument();
    expect(screen.getByTestId('approve-button-r3')).toBeInTheDocument();
    expect(screen.getByTestId('reject-button-r3')).toBeInTheDocument();
  });
});
