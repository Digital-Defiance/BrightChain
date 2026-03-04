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
import { MessageComposer } from './MessageComposer';

describe('MessageComposer', () => {
  it('renders input and send button', () => {
    render(<MessageComposer onSend={jest.fn()} />);
    expect(
      screen.getByPlaceholderText('MessageComposer_Placeholder'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });

  it('calls onSend with content when send is clicked', () => {
    const onSend = jest.fn();
    render(<MessageComposer onSend={onSend} />);
    const input = screen.getByPlaceholderText('MessageComposer_Placeholder');
    fireEvent.change(input, { target: { value: 'Hello!' } });
    fireEvent.click(screen.getByTestId('send-button'));
    expect(onSend).toHaveBeenCalledWith('Hello!', undefined);
  });

  it('does not send empty messages', () => {
    const onSend = jest.fn();
    render(<MessageComposer onSend={onSend} />);
    fireEvent.click(screen.getByTestId('send-button'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows reply indicator when replyTo is provided', () => {
    render(
      <MessageComposer
        onSend={jest.fn()}
        replyTo={{ id: 'msg-1', preview: 'Original message' }}
      />,
    );
    expect(screen.getByTestId('reply-indicator')).toBeInTheDocument();
    expect(screen.getByText('Original message')).toBeInTheDocument();
  });

  it('calls onCancelReply when cancel is clicked', () => {
    const onCancel = jest.fn();
    render(
      <MessageComposer
        onSend={jest.fn()}
        replyTo={{ id: 'msg-1', preview: 'test' }}
        onCancelReply={onCancel}
      />,
    );
    fireEvent.click(screen.getByLabelText('MessageComposer_CancelReply'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables input when disabled prop is true', () => {
    render(<MessageComposer onSend={jest.fn()} disabled />);
    const input = screen.getByPlaceholderText('MessageComposer_Placeholder');
    expect(input).toBeDisabled();
  });
});
