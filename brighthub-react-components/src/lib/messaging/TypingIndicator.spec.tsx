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
import { render, screen } from '@testing-library/react';
import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator', () => {
  it('renders nothing when no users are typing', () => {
    const { container } = render(<TypingIndicator typingUsers={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders single user typing', () => {
    render(<TypingIndicator typingUsers={['Alice']} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByTestId('typing-dot-0')).toBeInTheDocument();
    expect(screen.getByTestId('typing-dot-1')).toBeInTheDocument();
    expect(screen.getByTestId('typing-dot-2')).toBeInTheDocument();
  });

  it('renders multiple users typing', () => {
    render(<TypingIndicator typingUsers={['Alice', 'Bob']} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
