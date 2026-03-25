<script lang="ts">
  import type { AccountRuntime } from '$lib/types';
  import type { entities } from 'misskey-js';
  import Avatar from '$components/common/Avatar.svelte';
  import EmojiRenderer from '$lib/emoji/EmojiRenderer.svelte';
  import { getEmojiMap } from '$lib/emoji/cache';
  import { formatRelativeTime } from '$lib/utils/date';
  import { X, UserPlus, AtSign, Reply, Repeat2, Star, Quote, BarChart2, Bell } from 'lucide-svelte';

  type Notification = entities.Notification;

  type Props = {
    runtime: AccountRuntime;
    onclose?: () => void;
  };

  let { runtime, onclose }: Props = $props();

  // 通知種別ごとのラベルとアイコンコンポーネント
  type NotificationMeta = {
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    colorClass: string;
  };

  function getNotificationMeta(type: string): NotificationMeta {
    switch (type) {
      case 'follow':
        return { label: 'フォローされました', icon: UserPlus, colorClass: 'text-info' };
      case 'mention':
        return { label: 'メンションされました', icon: AtSign, colorClass: 'text-primary' };
      case 'reply':
        return { label: 'リプライされました', icon: Reply, colorClass: 'text-secondary' };
      case 'renote':
        return { label: 'Renoteされました', icon: Repeat2, colorClass: 'text-success' };
      case 'reaction':
        return { label: 'リアクションされました', icon: Star, colorClass: 'text-warning' };
      case 'quote':
        return { label: '引用されました', icon: Quote, colorClass: 'text-accent' };
      case 'pollEnded':
        return { label: 'アンケートが終了しました', icon: BarChart2, colorClass: 'text-neutral-content' };
      default:
        return { label: '通知', icon: Bell, colorClass: 'text-base-content' };
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
  style="width: 20rem; max-width: min(20rem, calc(100vw - 1rem)); max-height: 24rem;"
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
          {@const NotifIcon = meta.icon}
          {@const user = getNotificationUser(notification)}
          {@const notePreview = getNotePreview(notification)}
          {@const reaction = getReaction(notification)}
          <li class="flex gap-2 px-3 py-2 hover:bg-base-100 transition-colors">
            <!-- 種別アイコン -->
            <div class="flex flex-col items-center shrink-0 gap-1 pt-0.5">
              <NotifIcon class="w-3.5 h-3.5 {meta.colorClass}" aria-hidden="true" />
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
