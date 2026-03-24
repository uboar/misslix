<script lang="ts">
  import type { AccountRuntime } from '$lib/types';
  import type { entities } from 'misskey-js';
  import Avatar from '$components/common/Avatar.svelte';
  import EmojiRenderer from '$lib/emoji/EmojiRenderer.svelte';
  import { getEmojiMap } from '$lib/emoji/cache';
  import { formatRelativeTime } from '$lib/utils/date';
  import { X } from 'lucide-svelte';

  type Notification = entities.Notification;

  type Props = {
    runtime: AccountRuntime;
    onclose?: () => void;
  };

  let { runtime, onclose }: Props = $props();

  // 通知種別ごとのラベルとアイコンSVGパス
  type NotificationMeta = {
    label: string;
    iconPath: string;
    colorClass: string;
  };

  function getNotificationMeta(type: string): NotificationMeta {
    switch (type) {
      case 'follow':
        return {
          label: 'フォローされました',
          iconPath: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
          colorClass: 'text-info',
        };
      case 'mention':
        return {
          label: 'メンションされました',
          iconPath: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
          colorClass: 'text-primary',
        };
      case 'reply':
        return {
          label: 'リプライされました',
          iconPath: 'M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z',
          colorClass: 'text-secondary',
        };
      case 'renote':
        return {
          label: 'Renoteされました',
          iconPath: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
          colorClass: 'text-success',
        };
      case 'reaction':
        return {
          label: 'リアクションされました',
          iconPath: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z',
          colorClass: 'text-warning',
        };
      case 'quote':
        return {
          label: '引用されました',
          iconPath: 'M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z',
          colorClass: 'text-accent',
        };
      case 'pollEnded':
        return {
          label: 'アンケートが終了しました',
          iconPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
          colorClass: 'text-neutral-content',
        };
      default:
        return {
          label: '通知',
          iconPath: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
          colorClass: 'text-base-content',
        };
    }
  }

  // 通知からユーザーを取得するヘルパー
  function getNotificationUser(n: Notification) {
    if ('user' in n && n.user) return n.user as entities.UserDetailed;
    return null;
  }

  // 通知からノート本文プレビューを取得するヘルパー
  function getNotePreview(n: Notification): string {
    if ('note' in n && n.note) {
      const note = n.note as entities.Note;
      const text = note.text ?? '';
      return text.length > 60 ? text.slice(0, 60) + '…' : text;
    }
    return '';
  }

  // リアクション絵文字取得
  function getReaction(n: Notification): string {
    if (n.type === 'reaction' && 'reaction' in n) {
      return (n as { reaction: string }).reaction ?? '';
    }
    return '';
  }

  // 絵文字マップ (カスタム絵文字名 → URL)
  const emojiMap = $derived(getEmojiMap('', runtime.emojis));

  function isCustomEmoji(reaction: string): boolean {
    return reaction.startsWith(':') && reaction.endsWith(':');
  }

  function getCustomEmojiName(reaction: string): string {
    return reaction.slice(1, -1).split('@')[0];
  }

  function getEmojiUrl(reaction: string): string | null {
    const name = getCustomEmojiName(reaction);
    const fullName = reaction.slice(1, -1);
    return emojiMap[name] ?? emojiMap[fullName] ?? emojiMap[reaction] ?? null;
  }
</script>

<!-- 通知パネル本体 -->
<div
  class="notification-panel flex flex-col bg-base-200 border border-base-300 rounded-lg shadow-xl overflow-hidden"
  style="width: 20rem; max-height: 24rem;"
  role="dialog"
  aria-label="通知パネル"
>
  <!-- パネルヘッダー -->
  <div class="flex items-center justify-between px-3 py-2 bg-base-300 shrink-0">
    <span class="text-sm font-semibold text-base-content">通知</span>
    {#if onclose}
      <button
        class="btn btn-ghost btn-xs btn-square"
        onclick={onclose}
        aria-label="閉じる"
      >
        <X class="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    {/if}
  </div>

  <!-- 通知リスト -->
  <div class="flex-1 overflow-y-auto">
    {#if runtime.notifState.notifications.length === 0}
      <div class="flex items-center justify-center h-20 text-base-content/40 text-sm">
        通知はありません
      </div>
    {:else}
      <ul class="divide-y divide-base-300">
        {#each runtime.notifState.notifications as notification (notification.id)}
          {@const meta = getNotificationMeta(notification.type)}
          {@const user = getNotificationUser(notification)}
          {@const notePreview = getNotePreview(notification)}
          {@const reaction = getReaction(notification)}
          <li class="flex gap-2 px-3 py-2 hover:bg-base-100 transition-colors">
            <!-- 種別アイコン -->
            <div class="flex flex-col items-center shrink-0 gap-1 pt-0.5">
              <svg
                class="w-3.5 h-3.5 {meta.colorClass}"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d={meta.iconPath} />
              </svg>
              {#if user}
                <Avatar url={user.avatarUrl} size="1.5rem" alt={user.name ?? user.username} />
              {/if}
            </div>

            <!-- 通知内容 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1 flex-wrap">
                <!-- ユーザー名 -->
                {#if user}
                  <span class="text-xs font-semibold text-base-content truncate max-w-[8rem]">
                    {user.name || user.username}
                  </span>
                {/if}
                <!-- 種別ラベル -->
                <span class="text-xs text-base-content/60">{meta.label}</span>
              </div>

              <!-- リアクション絵文字 -->
              {#if reaction}
                <div class="text-sm mt-0.5" aria-label={reaction}>
                  {#if isCustomEmoji(reaction)}
                    {@const emojiUrl = getEmojiUrl(reaction)}
                    {#if emojiUrl}
                      <EmojiRenderer name={getCustomEmojiName(reaction)} url={emojiUrl} height="1.25em" />
                    {:else}
                      <span class="text-xs">{getCustomEmojiName(reaction)}</span>
                    {/if}
                  {:else}
                    <EmojiRenderer emoji={reaction} height="1.25em" />
                  {/if}
                </div>
              {/if}

              <!-- ノートプレビュー -->
              {#if notePreview}
                <p class="text-xs text-base-content/50 mt-0.5 line-clamp-2 break-all">
                  {notePreview}
                </p>
              {/if}

              <!-- 日時 -->
              <time class="text-[10px] text-base-content/30 mt-0.5 block">
                {formatRelativeTime(notification.createdAt)}
              </time>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
