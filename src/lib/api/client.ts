import { Stream, api } from 'misskey-js';
import type { ChannelConnection, entities } from 'misskey-js';
import type { Account, AccountRuntime } from '$lib/types';
import { NotificationState } from '$lib/stores/notifications.svelte';
import { settingsStore } from '$lib/stores/settings.svelte';

const { APIClient } = api;

type NotificationTarget = {
  cli: InstanceType<typeof APIClient>;
  notifState: NotificationState;
};

export function createApiClient(hostUrl: string, token: string): InstanceType<typeof APIClient> {
  const origin = hostUrl.startsWith('http') ? hostUrl : `https://${hostUrl}`;
  return new APIClient({
    origin,
    credential: token,
  });
}

export function createStream(hostUrl: string, token: string): Stream {
  const origin = hostUrl.startsWith('http') ? hostUrl : `https://${hostUrl}`;
  return new Stream(origin, { token });
}

export async function refreshRuntimeNotifications(
  target: NotificationTarget,
  options: { forceUnread?: boolean } = {},
): Promise<void> {
  const buffer = settingsStore.settings.notificationBuffer;
  const nextNotifications = await target.cli.request('i/notifications', {
    limit: Math.min(buffer, 100),
  });

  const previousIds = new Set(target.notifState.notifications.map((notification) => notification.id));
  const hasNewNotification = nextNotifications.some((notification) => !previousIds.has(notification.id));

  target.notifState.notifications = nextNotifications;
  target.notifState.hasUnread = options.forceUnread
    ? nextNotifications.length > 0
    : target.notifState.hasUnread || hasNewNotification;
}

/**
 * アカウントに対してStream/APIClient/mainチャンネル接続・絵文字取得を行い
 * AccountRuntimeを返す。
 */
export async function initAccountRuntime(account: Account): Promise<AccountRuntime> {
  const cli = createApiClient(account.hostUrl, account.token);
  const stream = createStream(account.hostUrl, account.token);

  // mainチャンネル接続 (型アサーションで ChannelConnection に合わせる)
  const mainConnection = stream.useChannel('main') as unknown as ChannelConnection;

  // 絵文字一覧取得
  let emojis: AccountRuntime['emojis'] = [];
  try {
    const res = await cli.request('emojis', {});
    // emojis エンドポイントは EmojiSimple[] を返すが、AccountRuntime は EmojiDetailed[] を期待する。
    // misskey-js のバージョンによって返り値の型が異なるため、ここでは型アサーションを使用する。
    emojis = res.emojis as unknown as AccountRuntime['emojis'];
  } catch {
    // 絵文字取得失敗は無視して続行
    emojis = [];
  }

  // 自分のユーザーIDを取得
  let userId = '';
  try {
    const me = await cli.request('i', {});
    userId = me.id;
  } catch {
    // ユーザーID取得失敗は無視
  }

  // 通知リアクティブ状態を初期化
  const notifState = new NotificationState();

  // 初期通知を取得
  try {
    await refreshRuntimeNotifications({ cli, notifState }, { forceUnread: true });
  } catch {
    // 通知取得失敗は無視して続行
  }

  const runtime: AccountRuntime = {
    stream,
    cli,
    mainConnection,
    notifState,
    emojis,
    busy: false,
    userId,
    hostUrl: account.hostUrl.startsWith('http') ? account.hostUrl : `https://${account.hostUrl}`,
  };

  // mainチャンネルの通知リスナー (アカウントごとに1回のみ)
  (mainConnection as any).on('notification', (notification: entities.Notification) => {
    const buffer = settingsStore.settings.notificationBuffer;
    notifState.notifications = [notification, ...notifState.notifications].slice(0, buffer);
    notifState.hasUnread = true;
  });

  return runtime;
}
