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
import { MessagingMenuBadge } from './MessagingMenuBadge';

describe('MessagingMenuBadge', () => {
  it('renders with zero unread', () => {
    render(<MessagingMenuBadge unreadCount={0} />);
    expect(screen.getByTestId('messaging-menu-badge')).toBeInTheDocument();
  });

  it('renders with unread count', () => {
    render(<MessagingMenuBadge unreadCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<MessagingMenuBadge unreadCount={3} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('messaging-menu-badge'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
