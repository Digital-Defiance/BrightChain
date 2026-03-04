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

import type { IBaseNotification } from '@brightchain/brighthub-lib';
import {
  NotificationCategory,
  NotificationType,
} from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { NotificationDropdown } from './NotificationDropdown';

const makeNotification = (
  overrides: Partial<IBaseNotification<string>> = {},
): IBaseNotification<string> => ({
  _id: 'notif-1',
  recipientId: 'user-1',
  type: NotificationType.Like,
  category: NotificationCategory.Social,
  actorId: 'actor-1',
  content: 'Alice liked your post',
  clickThroughUrl: '/posts/1',
  isRead: false,
  createdAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('NotificationDropdown', () => {
  let anchorEl: HTMLElement;

  beforeEach(() => {
    anchorEl = document.createElement('div');
    document.body.appendChild(anchorEl);
  });

  afterEach(() => {
    document.body.removeChild(anchorEl);
  });

  it('renders when open', () => {
    render(
      <NotificationDropdown
        open={true}
        anchorEl={anchorEl}
        notifications={[makeNotification()]}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    expect(screen.getByText('Alice liked your post')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <NotificationDropdown
        open={false}
        anchorEl={anchorEl}
        notifications={[]}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.queryByTestId('notification-dropdown'),
    ).not.toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    render(
      <NotificationDropdown
        open={true}
        anchorEl={anchorEl}
        notifications={[]}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('limits to 10 notifications', () => {
    const notifications = Array.from({ length: 15 }, (_, i) =>
      makeNotification({ _id: `notif-${i}`, content: `Notification ${i}` }),
    );
    render(
      <NotificationDropdown
        open={true}
        anchorEl={anchorEl}
        notifications={notifications}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Notification 0')).toBeInTheDocument();
    expect(screen.getByText('Notification 9')).toBeInTheDocument();
    expect(screen.queryByText('Notification 10')).not.toBeInTheDocument();
  });

  it('calls onViewAll when view all is clicked', () => {
    const onViewAll = jest.fn();
    render(
      <NotificationDropdown
        open={true}
        anchorEl={anchorEl}
        notifications={[]}
        onClose={jest.fn()}
        onViewAll={onViewAll}
      />,
    );
    fireEvent.click(screen.getByTestId('view-all'));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkAllRead when mark all read is clicked', () => {
    const onMarkAllRead = jest.fn();
    render(
      <NotificationDropdown
        open={true}
        anchorEl={anchorEl}
        notifications={[makeNotification()]}
        onClose={jest.fn()}
        onMarkAllRead={onMarkAllRead}
      />,
    );
    fireEvent.click(screen.getByTestId('mark-all-read'));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key', () => {
    const onClose = jest.fn();
    render(
      <NotificationDropdown
        open={true}
        anchorEl={anchorEl}
        notifications={[]}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
