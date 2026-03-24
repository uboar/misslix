import type { entities } from 'misskey-js';

type Notification = entities.Notification;

/**
 * アカウントごとの通知リアクティブ状態。
 * Svelte 5 $state クラスフィールドを使うことで、Map に格納されたまま
 * リアクティブ更新が正しく動作する。
 */
export class NotificationState {
  notifications = $state<Notification[]>([]);
  hasUnread = $state(false);
}
