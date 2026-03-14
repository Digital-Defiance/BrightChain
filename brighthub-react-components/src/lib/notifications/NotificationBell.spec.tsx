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

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { NotificationBell } from './NotificationBell';

describe('NotificationBell', () => {
  it('renders with zero unread', () => {
    render(<NotificationBell unreadCount={0} />);
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('renders with unread count', () => {
    render(<NotificationBell unreadCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows 99+ when count exceeds 99', () => {
    render(<NotificationBell unreadCount={150} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<NotificationBell unreadCount={3} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('notification-bell'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has accessible aria-label', () => {
    render(<NotificationBell unreadCount={0} />);
    expect(
      screen.getByLabelText('NotificationBell_AriaLabel'),
    ).toBeInTheDocument();
  });
});
