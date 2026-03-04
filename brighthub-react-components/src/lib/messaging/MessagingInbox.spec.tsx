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

import { ConversationType } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { InboxConversation } from './MessagingInbox';
import { MessagingInbox } from './MessagingInbox';

const makeConversation = (
  overrides: Partial<InboxConversation> = {},
): InboxConversation => ({
  _id: 'conv-1',
  type: ConversationType.Direct,
  participantIds: ['user-1', 'user-2'],
  lastMessageAt: '2024-01-15T10:00:00Z',
  lastMessagePreview: 'Hey there!',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  unreadCount: 2,
  isPinned: false,
  displayName: 'Alice',
  ...overrides,
});

describe('MessagingInbox', () => {
  it('renders conversation list', () => {
    render(<MessagingInbox conversations={[makeConversation()]} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Hey there!')).toBeInTheDocument();
  });

  it('shows empty state when no conversations', () => {
    render(<MessagingInbox conversations={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows pinned section for pinned conversations', () => {
    const convs = [
      makeConversation({
        _id: 'conv-1',
        isPinned: true,
        displayName: 'Pinned Alice',
      }),
      makeConversation({ _id: 'conv-2', isPinned: false, displayName: 'Bob' }),
    ];
    render(<MessagingInbox conversations={convs} />);
    expect(screen.getByText('Pinned Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onSelect when a conversation is clicked', () => {
    const onSelect = jest.fn();
    render(
      <MessagingInbox
        conversations={[makeConversation()]}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId('conversation-conv-1'));
    expect(onSelect).toHaveBeenCalledWith('conv-1');
  });

  it('calls onNewConversation when new button is clicked', () => {
    const onNew = jest.fn();
    render(<MessagingInbox conversations={[]} onNewConversation={onNew} />);
    fireEvent.click(screen.getByLabelText('MessagingInbox_NewConversation'));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('shows group badge for group conversations', () => {
    render(
      <MessagingInbox
        conversations={[
          makeConversation({
            type: ConversationType.Group,
            displayName: 'Team Chat',
          }),
        ]}
      />,
    );
    expect(screen.getByText('MessagingInbox_GroupBadge')).toBeInTheDocument();
  });
});
