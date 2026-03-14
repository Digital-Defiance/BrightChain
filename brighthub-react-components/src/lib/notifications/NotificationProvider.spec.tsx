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

import type { IBaseNotification } from '@brightchain/brighthub-lib';
import {
  NotificationCategory,
  NotificationType,
} from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import { NotificationProvider, useNotifications } from './NotificationProvider';

const makeNotification = (
  overrides: Partial<IBaseNotification<string>> = {},
): IBaseNotification<string> => ({
  _id: 'notif-1',
  recipientId: 'user-1',
  type: NotificationType.Like,
  category: NotificationCategory.Social,
  actorId: 'actor-1',
  content: 'Someone liked your post',
  clickThroughUrl: '/posts/1',
  isRead: false,
  createdAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

function TestConsumer() {
  const ctx = useNotifications();
  return (
    <div>
      <span data-testid="unread-count">{ctx.unreadCount}</span>
      <span data-testid="notification-count">{ctx.notifications.length}</span>
      <span data-testid="is-loading">{String(ctx.isLoading)}</span>
      <span data-testid="is-connected">{String(ctx.isConnected)}</span>
      <button data-testid="mark-all-read" onClick={() => ctx.markAllAsRead()} />
      <button
        data-testid="refresh"
        onClick={() => ctx.refreshNotifications()}
      />
    </div>
  );
}

describe('NotificationProvider', () => {
  it('provides default state', () => {
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>,
    );
    expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });

  it('loads notifications from fetchNotifications', async () => {
    const notifications = [
      makeNotification(),
      makeNotification({ _id: 'notif-2' }),
    ];
    const fetchNotifications = jest.fn().mockResolvedValue(notifications);
    const fetchUnreadCount = jest.fn().mockResolvedValue(2);

    await act(async () => {
      render(
        <NotificationProvider
          fetchNotifications={fetchNotifications}
          fetchUnreadCount={fetchUnreadCount}
        >
          <TestConsumer />
        </NotificationProvider>,
      );
    });

    expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
    expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
  });

  it('deduplicates notifications', async () => {
    const notifications = [makeNotification(), makeNotification()];
    const fetchNotifications = jest.fn().mockResolvedValue(notifications);

    await act(async () => {
      render(
        <NotificationProvider fetchNotifications={fetchNotifications}>
          <TestConsumer />
        </NotificationProvider>,
      );
    });

    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });

  it('marks all as read', async () => {
    const notifications = [
      makeNotification({ _id: 'n1', isRead: false }),
      makeNotification({ _id: 'n2', isRead: false }),
    ];
    const fetchNotifications = jest.fn().mockResolvedValue(notifications);
    const fetchUnreadCount = jest.fn().mockResolvedValue(2);
    const onMarkAllAsRead = jest.fn().mockResolvedValue(undefined);

    await act(async () => {
      render(
        <NotificationProvider
          fetchNotifications={fetchNotifications}
          fetchUnreadCount={fetchUnreadCount}
          onMarkAllAsRead={onMarkAllAsRead}
        >
          <TestConsumer />
        </NotificationProvider>,
      );
    });

    await act(async () => {
      screen.getByTestId('mark-all-read').click();
    });

    expect(onMarkAllAsRead).toHaveBeenCalled();
    expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
  });

  it('throws when useNotifications is used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useNotifications must be used within a NotificationProvider',
    );
    spy.mockRestore();
  });
});
