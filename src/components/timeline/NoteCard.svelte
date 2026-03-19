<script lang="ts">
  import type { entities } from 'misskey-js';
  import type { ColumnConfig } from '$lib/types';
  import NoteCard from './NoteCard.svelte';
  import NoteUser from './NoteUser.svelte';
  import NoteBody from './NoteBody.svelte';
  import NoteMedia from './NoteMedia.svelte';
  import NoteReactions from './NoteReactions.svelte';

  type Props = {
    note: entities.Note;
    config: ColumnConfig;
    emojis?: Record<string, string>;
    hostUrl?: string;
    muteUsers?: string[];
    muteWords?: string[];
    depth?: number;       // 再帰深度 (Renote/リプライ)
  };

  let {
    note,
    config,
    emojis = {},
    hostUrl,
    muteUsers = [],
    muteWords = [],
    depth = 0,
  }: Props = $props();

  const maxDepth = 2;  // 再帰上限

  // 純Renote判定: renoteがあり、自分のテキストがない
  const isPureRenote = $derived(!!note.renote && !note.text && !note.cw);

  // 表示するノート本体 (純Renoteの場合は元ノート)
  const displayNote = $derived(isPureRenote ? (note.renote as entities.Note) : note);

  // Renoteした人 (純Renoteの場合)
  const renoteUser = $derived(isPureRenote ? note.user : null);

  // 引用Renote: テキストあり + renoteあり
  const isQuote = $derived(!!note.renote && (!!note.text || !!note.cw));

  // ミュート判定 (シンプル実装。後でmute.tsに置き換え)
  const isMuted = $derived((() => {
    const author = displayNote.user;
    const handle = author.host
      ? `${author.username}@${author.host}`
      : author.username;

    // ユーザーミュート
    if (muteUsers.some(m => m === handle || m === author.username)) {
      return true;
    }

    // ワードミュート
    const text = (displayNote.text ?? '') + (displayNote.cw ?? '');
    if (muteWords.some(w => {
      try {
        return new RegExp(w).test(text);
      } catch {
        return text.includes(w);
      }
    })) {
      return true;
    }

    return false;
  })());

  // ミュート折り畳み状態
  let muteExpanded = $state(false);

  // メディアファイル
  const mediaFiles = $derived(displayNote.files ?? []);
  const hasMedia = $derived(mediaFiles.length > 0 && !config.noteDisplay.mediaHidden);

  // リアクション
  const reactions = $derived(displayNote.reactions ?? {});
  const hasReactions = $derived(Object.keys(reactions).length > 0 && !config.noteDisplay.reactionsHidden);
  const myReaction = $derived(displayNote.myReaction ?? null);

  // リアクション絵文字マップ: note.reactionEmojis (APIから取得)
  const reactionEmojis = $derived({
    ...emojis,
    ...(displayNote as entities.Note & { reactionEmojis?: Record<string, string> }).reactionEmojis,
  });

  // リプライ表示
  const hasReply = $derived(!!displayNote.reply && depth < maxDepth);

  // 日付フォーマット (シンプル実装。後でdate.tsに置き換え)
  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return '今';
      if (mins < 60) return `${mins}分`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}時間`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}日`;
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  const createdAt = $derived(formatDate(displayNote.createdAt));

  // リアクションハンドラ
  function handleReact(reaction: string) {
    // Phase 5で接続
  }
</script>

<article
  class="note-card group relative px-3 py-2.5 border-b border-base-300/60
    hover:bg-base-200/40 transition-colors duration-100 cursor-default"
  data-note-id={note.id}
  aria-label="ノート by {displayNote.user.username}"
>
  <!-- アクセントライン (カラムカラー) -->
  {#if depth === 0}
    <div
      class="absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-30 transition-opacity duration-200"
      style="background-color: {config.color};"
      aria-hidden="true"
    ></div>
  {/if}

  <!-- ミュート折り畳み表示 -->
  {#if isMuted && !muteExpanded}
    <div class="flex items-center gap-2 text-base-content/30">
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round"/>
      </svg>
      <span class="text-[0.6rem]">ミュート中のノート</span>
      <button
        class="text-[0.6rem] text-base-content/30 hover:text-base-content/50 underline transition-colors ml-auto"
        onclick={() => { muteExpanded = true; }}
      >
        表示
      </button>
    </div>

  {:else}
    <!-- 純Renoteバー -->
    {#if isPureRenote && renoteUser}
      <div class="renote-bar flex items-center gap-1 mb-1.5 text-[0.6rem] text-base-content/40">
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M17 1l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 11V9a4 4 0 014-4h14" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 23l-4-4 4-4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M21 13v2a4 4 0 01-4 4H3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="truncate">
          <span class="font-semibold text-base-content/50">{renoteUser.name || renoteUser.username}</span> がRenote
        </span>
      </div>
    {/if}

    <!-- リプライ表示 (再帰) -->
    {#if hasReply && displayNote.reply}
      <div class="reply-context mb-2 pl-2 border-l-2 border-base-300/40 opacity-70">
        <NoteCard
          note={displayNote.reply as entities.Note}
          {config}
          {emojis}
          {hostUrl}
          {muteUsers}
          {muteWords}
          depth={depth + 1}
        />
      </div>
    {/if}

    <!-- メインコンテンツ -->
    <div class="flex gap-2 min-w-0">
      <!-- アバター -->
      <div class="shrink-0">
        <NoteUser user={displayNote.user} {hostUrl} compact={depth > 0} />
      </div>

      <!-- 右側コンテンツ -->
      <!-- (NoteUserが横並びなのでここは縦レイアウトを別div で) -->
    </div>

    <!-- ユーザー + タイムスタンプ行 -->
    <div class="flex items-start gap-2 min-w-0 mb-1">
      <div class="flex-1 min-w-0">
        <NoteUser user={displayNote.user} {hostUrl} compact={depth > 0} />
      </div>

      <!-- タイムスタンプ -->
      <time
        class="text-[0.6rem] text-base-content/30 shrink-0 mt-0.5"
        datetime={displayNote.createdAt}
        title={new Date(displayNote.createdAt).toLocaleString('ja-JP')}
      >
        {createdAt}
      </time>
    </div>

    <!-- 本文 -->
    <NoteBody note={displayNote} {config} {emojis} />

    <!-- 引用Renote -->
    {#if isQuote && note.renote && depth < maxDepth}
      <div class="quote-block mt-2 rounded-md border border-base-300/60 bg-base-200/40 p-2 overflow-hidden">
        <NoteCard
          note={note.renote as entities.Note}
          {config}
          {emojis}
          {hostUrl}
          {muteUsers}
          {muteWords}
          depth={depth + 1}
        />
      </div>
    {/if}

    <!-- メディア -->
    {#if hasMedia}
      <NoteMedia files={mediaFiles} {config} />
    {/if}

    <!-- リアクション -->
    {#if hasReactions}
      <NoteReactions
        {reactions}
        {myReaction}
        emojis={reactionEmojis}
        reactionSize={config.noteDisplay.reactionSize}
        onreact={handleReact}
      />
    {/if}

  {/if}
</article>

<style>
  /* 引用Renote内はカードのボーダーを非表示 */
  .quote-block :global(.note-card) {
    border-bottom: none;
    padding: 0;
  }

  .quote-block :global(.note-card:hover) {
    background-color: transparent;
  }
</style>
