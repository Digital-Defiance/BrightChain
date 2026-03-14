jest.mock('@brightchain/brighthub-lib', () => ({
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

import type { IBaseDirectMessage } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConversationView } from './ConversationView';

const makeMessage = (
  overrides: Partial<IBaseDirectMessage<string>> = {},
): IBaseDirectMessage<string> => ({
  _id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-2',
  content: 'Hello',
  formattedContent: '<p>Hello</p>',
  attachments: [],
  isEdited: false,
  isDeleted: false,
  createdAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('ConversationView', () => {
  it('renders messages', () => {
    render(
      <ConversationView
        messages={[makeMessage()]}
        currentUserId="user-1"
        onSend={jest.fn()}
      />,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows empty state when no messages', () => {
    render(
      <ConversationView
        messages={[]}
        currentUserId="user-1"
        onSend={jest.fn()}
      />,
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows load more button when hasMore is true', () => {
    const onLoadMore = jest.fn();
    render(
      <ConversationView
        messages={[makeMessage()]}
        currentUserId="user-1"
        onSend={jest.fn()}
        hasMore
        onLoadMore={onLoadMore}
      />,
    );
    const loadMore = screen.getByText('ConversationView_LoadMore');
    fireEvent.click(loadMore);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('renders typing indicator when users are typing', () => {
    render(
      <ConversationView
        messages={[makeMessage()]}
        currentUserId="user-1"
        onSend={jest.fn()}
        typingUsers={['Alice']}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('includes message composer', () => {
    render(
      <ConversationView
        messages={[]}
        currentUserId="user-1"
        onSend={jest.fn()}
      />,
    );
    expect(
      screen.getByPlaceholderText('MessageComposer_Placeholder'),
    ).toBeInTheDocument();
  });
});
