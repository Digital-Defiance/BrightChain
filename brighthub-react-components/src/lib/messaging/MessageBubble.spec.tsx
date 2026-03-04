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

import type { IBaseDirectMessage } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';

const makeMessage = (
  overrides: Partial<IBaseDirectMessage<string>> = {},
): IBaseDirectMessage<string> => ({
  _id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-1',
  content: 'Hello world',
  formattedContent: '<p>Hello world</p>',
  attachments: [],
  isEdited: false,
  isDeleted: false,
  createdAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('MessageBubble', () => {
  it('renders message content', () => {
    render(<MessageBubble message={makeMessage()} isOwn={false} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows deleted indicator for deleted messages', () => {
    render(
      <MessageBubble
        message={makeMessage({ isDeleted: true })}
        isOwn={false}
      />,
    );
    expect(screen.getByTestId('deleted-indicator')).toBeInTheDocument();
  });

  it('shows edited indicator', () => {
    render(
      <MessageBubble message={makeMessage({ isEdited: true })} isOwn={true} />,
    );
    expect(screen.getByTestId('edited-indicator')).toBeInTheDocument();
  });

  it('shows forwarded indicator', () => {
    render(
      <MessageBubble
        message={makeMessage({ forwardedFromId: 'msg-0' })}
        isOwn={false}
      />,
    );
    expect(screen.getByTestId('forwarded-indicator')).toBeInTheDocument();
  });

  it('shows reply preview when provided', () => {
    render(
      <MessageBubble
        message={makeMessage({ replyToMessageId: 'msg-0' })}
        isOwn={false}
        replyPreview="Original message"
      />,
    );
    expect(screen.getByTestId('reply-preview')).toBeInTheDocument();
    expect(screen.getByText('Original message')).toBeInTheDocument();
  });

  it('renders reactions when provided', () => {
    render(
      <MessageBubble
        message={makeMessage()}
        isOwn={false}
        reactions={[{ emoji: '👍', count: 2, reacted: false }]}
      />,
    );
    expect(screen.getByTestId('reaction-👍')).toBeInTheDocument();
  });
});
