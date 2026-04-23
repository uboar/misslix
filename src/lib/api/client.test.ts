import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshRuntimeNotifications } from './client';
import { NotificationState } from '$lib/stores/notifications.svelte';
import { settingsStore } from '$lib/stores/settings.svelte';

type NotificationShape = {
  id: string;
  createdAt: string;
};

function makeNotification(id: string): NotificationShape {
  return {
    id,
    createdAt: '2024-01-01T00:00:00Z',
  };
}

describe('refreshRuntimeNotifications', () => {
  beforeEach(() => {
    settingsStore.settings.notificationBuffer = 100;
  });

  it('通知一覧を再取得して state を置き換える', async () => {
    const notifState = new NotificationState();
    const nextNotifications = [makeNotification('n1'), makeNotification('n2')];
    const cli = {
      request: vi.fn().mockResolvedValue(nextNotifications),
    };

    await refreshRuntimeNotifications({
      cli: cli as never,
      notifState,
    });

    expect(cli.request).toHaveBeenCalledWith('i/notifications', { limit: 100 });
    expect(notifState.notifications).toEqual(nextNotifications);
    expect(notifState.hasUnread).toBe(true);
  });

  it('既知の通知だけなら未読フラグを維持する', async () => {
    const notifState = new NotificationState();
    notifState.notifications = [makeNotification('n1')] as never[];
    notifState.hasUnread = false;
    const cli = {
      request: vi.fn().mockResolvedValue([makeNotification('n1')]),
    };

    await refreshRuntimeNotifications({
      cli: cli as never,
      notifState,
    });

    expect(notifState.hasUnread).toBe(false);
  });

  it('forceUnread 指定時は結果があれば未読扱いにする', async () => {
    const notifState = new NotificationState();
    notifState.hasUnread = false;
    const cli = {
      request: vi.fn().mockResolvedValue([makeNotification('n1')]),
    };

    await refreshRuntimeNotifications({
      cli: cli as never,
      notifState,
    }, { forceUnread: true });

    expect(notifState.hasUnread).toBe(true);
  });
});
