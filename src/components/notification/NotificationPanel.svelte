<script lang="ts">
  import type { AccountRuntime } from '$lib/types';
  import type { entities } from 'misskey-js';
  import Avatar from '$components/common/Avatar.svelte';
  import EmojiRenderer from '$lib/emoji/EmojiRenderer.svelte';
  import { getEmojiMap } from '$lib/emoji/cache';
  import { formatRelativeTime } from '$lib/utils/date';
  import MfmRenderer from '$lib/mfm/MfmRenderer.svelte';
  import {
    X, UserPlus, UserCheck, AtSign, Reply, Repeat2, Star, Quote, BarChart2, Bell,
    FileText, Clock, AlertCircle, Shield, MessageCircle, Trophy, Download, LogIn, Key, AppWindow, Users,
  } from 'lucide-svelte';

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
      case 'note':
        return { label: 'ノートを投稿しました', icon: FileText, colorClass: 'text-base-content' };
      case 'follow':
        return { label: 'フォローされました', icon: UserPlus, colorClass: 'text-info' };
      case 'receiveFollowRequest':
        return { label: 'フォローリクエストが届きました', icon: UserCheck, colorClass: 'text-info' };
      case 'followRequestAccepted':
        return { label: 'フォローリクエストが承認されました', icon: UserCheck, colorClass: 'text-success' };
      case 'mention':
        return { label: 'メンションされました', icon: AtSign, colorClass: 'text-primary' };
      case 'reply':
        return { label: 'リプライされました', icon: Reply, colorClass: 'text-secondary' };
      case 'renote':
        return { label: 'Renoteされました', icon: Repeat2, colorClass: 'text-success' };
      case 'renote:grouped':
        return { label: 'Renoteされました', icon: Repeat2, colorClass: 'text-success' };
      case 'reaction':
        return { label: 'リアクションされました', icon: Star, colorClass: 'text-warning' };
      case 'reaction:grouped':
        return { label: 'リアクションされました', icon: Star, colorClass: 'text-warning' };
      case 'quote':
        return { label: '引用されました', icon: Quote, colorClass: 'text-accent' };
      case 'pollEnded':
        return { label: 'アンケートが終了しました', icon: BarChart2, colorClass: 'text-neutral-content' };
      case 'scheduledNotePosted':
        return { label: '予約投稿が完了しました', icon: Clock, colorClass: 'text-success' };
      case 'scheduledNotePostFailed':
        return { label: '予約投稿に失敗しました', icon: AlertCircle, colorClass: 'text-error' };
      case 'roleAssigned':
        return { label: 'ロールが付与されました', icon: Shield, colorClass: 'text-accent' };
      case 'chatRoomInvitationReceived':
        return { label: 'チャットルームに招待されました', icon: MessageCircle, colorClass: 'text-info' };
      case 'achievementEarned':
        return { label: '実績を獲得しました', icon: Trophy, colorClass: 'text-warning' };
      case 'exportCompleted':
        return { label: 'エクスポートが完了しました', icon: Download, colorClass: 'text-success' };
      case 'login':
        return { label: 'ログインしました', icon: LogIn, colorClass: 'text-base-content/60' };
      case 'createToken':
        return { label: 'アクセストークンが作成されました', icon: Key, colorClass: 'text-warning' };
      case 'app':
        return { label: 'アプリからの通知', icon: AppWindow, colorClass: 'text-primary' };
      case 'test':
        return { label: 'テスト通知', icon: Bell, colorClass: 'text-base-content/40' };
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

  // リアクション絵文字取得 (単体)
  function getReaction(n: Notification): string {
    if (n.type === 'reaction' && 'reaction' in n) {
      return (n as { reaction: string }).reaction ?? '';
    }
    return '';
  }

  // グループ化リアクション取得
  function getGroupedReactions(n: Notification): { user: entities.UserLite; reaction: string }[] {
    if (n.type === 'reaction:grouped' && 'reactions' in n) {
      return (n as { reactions: { user: entities.UserLite; reaction: string }[] }).reactions ?? [];
    }
    return [];
  }

  // グループ化Renoteのユーザー一覧取得
  function getGroupedRenoteUsers(n: Notification): entities.UserLite[] {
    if (n.type === 'renote:grouped' && 'users' in n) {
      return (n as { users: entities.UserLite[] }).users ?? [];
    }
    return [];
  }

  // フォローリクエスト承認メッセージ取得
  function getFollowRequestMessage(n: Notification): string | null {
    if (n.type === 'followRequestAccepted' && 'message' in n) {
      return (n as { message: string | null }).message ?? null;
    }
    return null;
  }

  // ロール名取得
  function getRoleName(n: Notification): string {
    if (n.type === 'roleAssigned' && 'role' in n) {
      const role = (n as { role: { name?: string } }).role;
      return role?.name ?? 'ロール';
    }
    return '';
  }

  // アプリ通知情報取得
  function getAppNotification(n: Notification): { header: string | null; body: string; icon: string | null } | null {
    if (n.type === 'app' && 'body' in n) {
      const a = n as { body: string; header: string | null; icon: string | null };
      return { header: a.header, body: a.body, icon: a.icon };
    }
    return null;
  }

  // エクスポート種別ラベル
  const exportEntityLabels: Record<string, string> = {
    antenna: 'アンテナ',
    blocking: 'ブロックリスト',
    clip: 'クリップ',
    customEmoji: 'カスタム絵文字',
    favorite: 'お気に入り',
    following: 'フォローリスト',
    muting: 'ミュートリスト',
    note: 'ノート',
    userList: 'ユーザーリスト',
  };

  function getExportEntityLabel(n: Notification): string {
    if (n.type === 'exportCompleted' && 'exportedEntity' in n) {
      const entity = (n as { exportedEntity: string }).exportedEntity;
      return exportEntityLabels[entity] ?? entity;
    }
    return '';
  }

  // 実績名ラベル (主要なものだけ日本語化)
  function getAchievementLabel(n: Notification): string {
    if (n.type === 'achievementEarned' && 'achievement' in n) {
      const name = (n as { achievement: string }).achievement;
      const map: Record<string, string> = {
        notes1: 'はじめてのノート',
        notes10: '10ノート達成',
        notes100: '100ノート達成',
        notes500: '500ノート達成',
        notes1000: '1000ノート達成',
        notes10000: '10000ノート達成',
        follow: 'はじめてのフォロー',
        followers1: '1人のフォロワー',
        followers10: '10人のフォロワー',
        followers50: '50人のフォロワー',
        followers100: '100人のフォロワー',
        followers300: '300人のフォロワー',
        followers500: '500人のフォロワー',
        followers1000: '1000人のフォロワー',
        login3: '3日連続ログイン',
        login7: '7日連続ログイン',
        login30: '30日連続ログイン',
        login100: '100日連続ログイン',
        tutorialCompleted: 'チュートリアル完了',
        iLoveMisskey: 'Misskeyが好き',
      };
      return map[name] ?? name;
    }
    return '';
  }

  // チャット招待情報取得
  function getChatRoomName(n: Notification): string {
    if (n.type === 'chatRoomInvitationReceived' && 'invitation' in n) {
      const inv = (n as { invitation: { room?: { name?: string } } }).invitation;
      return inv?.room?.name ?? 'チャットルーム';
    }
    return '';
  }

  // 絵文字マップ (カスタム絵文字名 → URL) — ローカルサーバーのカスタム絵文字
  const emojiMap = $derived(getEmojiMap('', runtime.emojis));

  // ノートのreactionEmojisを取得 (リモートサーバー絵文字URLを含む)
  function getNoteReactionEmojis(n: Notification): Record<string, string> {
    if ('note' in n && n.note) {
      const note = n.note as entities.Note & { reactionEmojis?: Record<string, string> };
      return note.reactionEmojis ?? {};
    }
    return {};
  }

  // ユーザーの絵文字マップを取得 (ローカル + ユーザー固有)
  function getUserEmojiMap(user: entities.UserLite | entities.UserDetailed): Record<string, string> {
    return {
      ...emojiMap,
      ...(user.emojis as Record<string, string> | undefined ?? {}),
    };
  }

  function isCustomEmoji(reaction: string): boolean {
    return reaction.startsWith(':') && reaction.endsWith(':');
  }

  function getCustomEmojiName(reaction: string): string {
    return reaction.slice(1, -1).split('@')[0];
  }

  // リアクション絵文字URL取得 — ローカル絵文字マップ + ノートのreactionEmojis の順で解決
  function getEmojiUrl(reaction: string, noteReactionEmojis: Record<string, string> = {}): string | null {
    const name = getCustomEmojiName(reaction);
    const fullName = reaction.slice(1, -1);
    // noteReactionEmojis を優先 (リモートサーバーの絵文字URLが含まれる)
    return (
      noteReactionEmojis[name] ??
      noteReactionEmojis[fullName] ??
      noteReactionEmojis[reaction] ??
      emojiMap[name] ??
      emojiMap[fullName] ??
      emojiMap[reaction] ??
      null
    );
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
          {@const groupedReactions = getGroupedReactions(notification)}
          {@const groupedUsers = getGroupedRenoteUsers(notification)}
          {@const appNotif = getAppNotification(notification)}
          {@const noteReactionEmojis = getNoteReactionEmojis(notification)}
          <li class="flex gap-2 px-3 py-2 hover:bg-base-100 transition-colors">
            <!-- 種別アイコン -->
            <div class="flex flex-col items-center shrink-0 gap-1 pt-0.5">
              <!-- appアイコンがある場合はそちらを優先 -->
              {#if appNotif?.icon}
                <img src={appNotif.icon} alt="" class="w-4 h-4 rounded" />
              {:else}
                <NotifIcon class="w-3.5 h-3.5 {meta.colorClass}" aria-hidden="true" />
              {/if}
              {#if user}
                <Avatar url={user.avatarUrl} size="1.5rem" alt={user.name ?? user.username} />
              {:else if groupedUsers.length > 0}
                <Avatar url={groupedUsers[0].avatarUrl} size="1.5rem" alt={groupedUsers[0].name ?? groupedUsers[0].username} />
              {:else if groupedReactions.length > 0}
                <Avatar url={groupedReactions[0].user.avatarUrl} size="1.5rem" alt={groupedReactions[0].user.name ?? groupedReactions[0].user.username} />
              {/if}
            </div>

            <!-- 通知内容 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1 flex-wrap">
                <!-- ユーザー名 (カスタム絵文字対応) -->
                {#if user}
                  <span class="text-xs font-semibold text-base-content truncate max-w-[8rem]">
                    <MfmRenderer text={user.name || user.username} emojis={getUserEmojiMap(user)} isInline emojiHeight="1em" />
                  </span>
                {:else if groupedUsers.length > 0}
                  <span class="text-xs font-semibold text-base-content truncate max-w-[8rem]">
                    <MfmRenderer text={groupedUsers[0].name || groupedUsers[0].username} emojis={getUserEmojiMap(groupedUsers[0])} isInline emojiHeight="1em" />
                  </span>
                  {#if groupedUsers.length > 1}
                    <span class="text-xs text-base-content/50">他{groupedUsers.length - 1}人</span>
                  {/if}
                {:else if groupedReactions.length > 0}
                  <span class="text-xs font-semibold text-base-content truncate max-w-[8rem]">
                    <MfmRenderer text={groupedReactions[0].user.name || groupedReactions[0].user.username} emojis={getUserEmojiMap(groupedReactions[0].user)} isInline emojiHeight="1em" />
                  </span>
                  {#if groupedReactions.length > 1}
                    <span class="text-xs text-base-content/50">他{groupedReactions.length - 1}人</span>
                  {/if}
                {/if}
                <!-- 種別ラベル -->
                <span class="text-xs text-base-content/60">{meta.label}</span>
              </div>

              <!-- リアクション絵文字 (単体) — noteReactionEmojisでリモート絵文字URLも解決 -->
              {#if reaction}
                <div class="text-sm mt-0.5" aria-label={reaction}>
                  {#if isCustomEmoji(reaction)}
                    {@const emojiUrl = getEmojiUrl(reaction, noteReactionEmojis)}
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

              <!-- グループ化リアクション絵文字一覧 — noteReactionEmojisでリモート絵文字URLも解決 -->
              {#if groupedReactions.length > 0}
                <div class="flex flex-wrap gap-0.5 mt-0.5">
                  {#each groupedReactions.slice(0, 5) as gr (gr.reaction + gr.user.id)}
                    <span class="text-sm" aria-label={gr.reaction}>
                      {#if isCustomEmoji(gr.reaction)}
                        {@const emojiUrl = getEmojiUrl(gr.reaction, noteReactionEmojis)}
                        {#if emojiUrl}
                          <EmojiRenderer name={getCustomEmojiName(gr.reaction)} url={emojiUrl} height="1.25em" />
                        {:else}
                          <span class="text-xs">{getCustomEmojiName(gr.reaction)}</span>
                        {/if}
                      {:else}
                        <EmojiRenderer emoji={gr.reaction} height="1.25em" />
                      {/if}
                    </span>
                  {/each}
                  {#if groupedReactions.length > 5}
                    <span class="text-[10px] text-base-content/50 self-center">+{groupedReactions.length - 5}</span>
                  {/if}
                </div>
              {/if}

              <!-- フォローリクエスト承認メッセージ -->
              {#if notification.type === 'followRequestAccepted'}
                {@const msg = getFollowRequestMessage(notification)}
                {#if msg}
                  <p class="text-xs text-base-content/50 mt-0.5 line-clamp-2 break-all">{msg}</p>
                {/if}
              {/if}

              <!-- ロール名 -->
              {#if notification.type === 'roleAssigned'}
                <p class="text-xs text-base-content/70 mt-0.5 font-medium">{getRoleName(notification)}</p>
              {/if}

              <!-- 実績名 -->
              {#if notification.type === 'achievementEarned'}
                <p class="text-xs text-base-content/70 mt-0.5 font-medium">{getAchievementLabel(notification)}</p>
              {/if}

              <!-- エクスポート種別 -->
              {#if notification.type === 'exportCompleted'}
                <p class="text-xs text-base-content/70 mt-0.5">{getExportEntityLabel(notification)}</p>
              {/if}

              <!-- チャットルーム名 -->
              {#if notification.type === 'chatRoomInvitationReceived'}
                <p class="text-xs text-base-content/70 mt-0.5">{getChatRoomName(notification)}</p>
              {/if}

              <!-- アプリ通知 -->
              {#if appNotif}
                {#if appNotif.header}
                  <p class="text-xs font-semibold text-base-content mt-0.5">{appNotif.header}</p>
                {/if}
                <p class="text-xs text-base-content/50 mt-0.5 line-clamp-2 break-all">{appNotif.body}</p>
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
