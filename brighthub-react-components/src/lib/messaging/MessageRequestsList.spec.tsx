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

import type { IBaseMessageRequest } from '@brightchain/brighthub-lib';
import { MessageRequestStatus } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MessageRequestsList } from './MessageRequestsList';

const makeRequest = (
  overrides: Partial<IBaseMessageRequest<string>> = {},
): IBaseMessageRequest<string> => ({
  _id: 'req-1',
  senderId: 'user-2',
  recipientId: 'user-1',
  messagePreview: 'Hey, can we connect?',
  status: MessageRequestStatus.Pending,
  createdAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('MessageRequestsList', () => {
  it('renders pending requests', () => {
    const requests = [makeRequest()];
    render(<MessageRequestsList requests={requests} />);
    expect(screen.getByText('Hey, can we connect?')).toBeInTheDocument();
  });

  it('shows empty state when no pending requests', () => {
    render(<MessageRequestsList requests={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('filters out non-pending requests', () => {
    const requests = [makeRequest({ status: MessageRequestStatus.Accepted })];
    render(<MessageRequestsList requests={requests} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('calls onAccept when accept is clicked', () => {
    const onAccept = jest.fn();
    render(
      <MessageRequestsList requests={[makeRequest()]} onAccept={onAccept} />,
    );
    fireEvent.click(screen.getByLabelText('MessageRequestsList_Accept'));
    expect(onAccept).toHaveBeenCalledWith('req-1');
  });

  it('calls onDecline when decline is clicked', () => {
    const onDecline = jest.fn();
    render(
      <MessageRequestsList requests={[makeRequest()]} onDecline={onDecline} />,
    );
    fireEvent.click(screen.getByLabelText('MessageRequestsList_Decline'));
    expect(onDecline).toHaveBeenCalledWith('req-1');
  });

  it('uses getSenderName to resolve display names', () => {
    render(
      <MessageRequestsList
        requests={[makeRequest()]}
        getSenderName={() => 'Alice'}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
