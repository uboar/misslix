<script lang="ts">
  import type { entities } from 'misskey-js';
  import type { ColumnConfig, AccountRuntime } from '$lib/types';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { checkMute } from '$lib/utils/mute';
  import { formatShortTime } from '$lib/utils/date';
  import { addReactionHistory } from '$lib/utils/reactionHistory';
  import MfmRenderer from '$lib/mfm/MfmRenderer.svelte';
  import NoteCard from './NoteCard.svelte';
  import NoteUser from './NoteUser.svelte';
  import NoteBody from './NoteBody.svelte';
  import NoteMedia from './NoteMedia.svelte';
  import NoteReactions from './NoteReactions.svelte';
  import ReactionButton from '$components/reaction/ReactionButton.svelte';
  import NoteMoreMenu from './NoteMoreMenu.svelte';
  import InlineComposer from '$components/composer/InlineComposer.svelte';
  import UserDetailModal from '$components/user/UserDetailModal.svelte';
  import ReactionAccountPicker from '$components/reaction/ReactionAccountPicker.svelte';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import { EyeOff, Repeat2, MessageSquare, Loader2, MoreHorizontal } from 'lucide-svelte';

  type Props = {
    note: entities.Note;
    config: ColumnConfig;
    emojis?: Record<string, string>;
    hostUrl?: string;
    muteUsers?: string[];
    muteWords?: string[];
    depth?: number;
    runtime?: AccountRuntime;
    sourceLabel?: string;
    sourceColor?: string;
    availableRuntimes?: Map<number, AccountRuntime>;
    sourceAccountId?: number;
  };

  let {
    note,
    config,
    emojis = {},
    hostUrl,
    muteUsers = [],
    muteWords = [],
    depth = 0,
    runtime,
    sourceLabel,
    sourceColor,
    availableRuntimes,
    sourceAccountId,
  }: Props = $props();

  const maxDepth = 2;  // 再帰上限

  // マージTL: リアクション送信用アカウント選択
  let selectedReactionAccountId = $state<number | undefined>(sourceAccountId);
  const effectiveRuntime = $derived(
    availableRuntimes && selectedReactionAccountId != null
      ? availableRuntimes.get(selectedReactionAccountId) ?? runtime
      : runtime
  );
  const effectiveHostUrl = $derived(
    availableRuntimes && selectedReactionAccountId != null
      ? accountStore.findById(selectedReactionAccountId)?.hostUrl?.replace(/^https?:\/\//, '') ?? hostUrl
      : hostUrl
  );

  // 純Renote判定: renoteがあり、自分のテキストがない
  const isPureRenote = $derived(!!note.renote && !note.text && !note.cw);

  // 表示するノート本体 (純Renoteの場合は元ノート)
  const displayNote = $derived(isPureRenote ? (note.renote as entities.Note) : note);

  // Renoteした人 (純Renoteの場合)
  const renoteUser = $derived(isPureRenote ? note.user : null);

  // Renoteユーザーの絵文字マップ
  const renoteUserEmojis = $derived({
    ...emojis,
    ...(renoteUser?.emojis as Record<string, string> | undefined ?? {}),
  });

  // 引用Renote: テキストあり + renoteあり
  const isQuote = $derived(!!note.renote && (!!note.text || !!note.cw));

  // ミュート判定
  const muteReason = $derived(checkMute(displayNote, muteUsers, muteWords));
  const isMuted = $derived(!!muteReason);

  // ミュート折り畳み状態
  let muteExpanded = $state(false);

  // メディアファイル
  const mediaFiles = $derived(displayNote.files ?? []);
  const hasMedia = $derived(mediaFiles.length > 0 && !config.noteDisplay.mediaHidden);

  // リアクション
  const reactions = $derived(displayNote.reactions ?? {});
  const hasReactions = $derived(Object.keys(reactions).length > 0 && !config.noteDisplay.reactionsHidden);
  const myReaction = $derived(displayNote.myReaction ?? null);

  // チャンネル情報
  const noteChannel = $derived(
    (displayNote as entities.Note & { channel?: { id: string; name: string; color: string; isSensitive: boolean; allowRenoteToExternal: boolean; userId: string | null } | null }).channel ?? null
  );
  const hasChannel = $derived(!!noteChannel);

  // ノート絵文字マップ: ローカル + ノート付属の絵文字 (リモートサーバーの絵文字を含む)
  const noteEmojis = $derived({
    ...emojis,
    ...(displayNote.emojis as Record<string, string> | undefined ?? {}),
  });

  // リアクション絵文字マップ: note.reactionEmojis (APIから取得)
  const reactionEmojis = $derived({
    ...noteEmojis,
    ...(displayNote as entities.Note & { reactionEmojis?: Record<string, string> }).reactionEmojis,
  });

  // リプライ表示
  const hasReply = $derived(!!displayNote.reply && depth < maxDepth);

  const createdAt = $derived(formatShortTime(displayNote.createdAt));

  // 既存リアクションバッジクリック → トグル
  function handleReact(reaction: string) {
    if (!runtime) return;

    if (myReaction === reaction) {
      // 自分のリアクションを解除
      runtime.cli.request('notes/reactions/delete', { noteId: displayNote.id }).catch((err) => {
        console.error('[NoteCard] リアクション削除失敗:', err);
      });
    } else if (!myReaction) {
      // 新規リアクション追加
      runtime.cli.request('notes/reactions/create', { noteId: displayNote.id, reaction }).catch((err) => {
        console.error('[NoteCard] リアクション追加失敗:', err);
      });
      addReactionHistory(reaction);
    }
  }

  // ReactionButton経由のリアクション完了コールバック
  function handleReacted(reaction: string | null) {
    if (reaction) {
      addReactionHistory(reaction);
    }
  }

  // ── ツールバー状態 ──

  // リプライ / 引用リノート用インラインコンポーザー
  let composerMode = $state<'reply' | 'quote' | null>(null);

  // リノートメニュー
  let renoteMenuVisible = $state(false);
  let renoteMenuStyle = $state('');
  let renoteBusy = $state(false);

  // その他メニュー
  let moreMenuVisible = $state(false);
  let moreMenuStyle = $state('');

  function computePopupPosition(mouseX: number, mouseY: number): string {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - mouseY;
    const top = spaceBelow >= 200 ? `${mouseY + 4}px` : `${mouseY - 200}px`;
    const left = `${Math.max(0, Math.min(mouseX, viewportWidth - 240))}px`;
    return `top: ${top}; left: ${left};`;
  }

  // リプライ
  function handleReply() {
    composerMode = composerMode === 'reply' ? null : 'reply';
  }

  // リノートメニュー表示
  function handleRenoteClick(e: MouseEvent) {
    renoteMenuStyle = computePopupPosition(e.clientX, e.clientY);
    renoteMenuVisible = true;
  }

  // 純リノート実行
  async function doRenote() {
    if (!runtime || renoteBusy) return;
    renoteBusy = true;
    renoteMenuVisible = false;
    try {
      await (runtime.cli as any).request('notes/create', {
        renoteId: displayNote.id,
      });
    } catch (err) {
      console.error('[NoteCard] Renote失敗:', err);
    } finally {
      renoteBusy = false;
    }
  }

  // 引用リノート
  function doQuote() {
    renoteMenuVisible = false;
    composerMode = composerMode === 'quote' ? null : 'quote';
  }

  // その他メニュー表示
  function handleMoreClick(e: MouseEvent) {
    moreMenuStyle = computePopupPosition(e.clientX, e.clientY);
    moreMenuVisible = true;
  }

  // コンポーザー完了/キャンセル
  function handleComposerComplete() {
    composerMode = null;
  }

  function handleComposerCancel() {
    composerMode = null;
  }

  // ユーザー詳細モーダル
  let userModalOpen = $state(false);
  let userModalTarget = $state<entities.UserLite | null>(null);

  function handleUserClick(user: entities.UserLite) {
    userModalTarget = user;
    userModalOpen = true;
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

  <!-- マージTL: ソースラベルバッジ -->
  {#if sourceLabel && depth === 0}
    <div class="mb-1">
      <span
        class="inline-block text-[0.55rem] leading-tight px-1.5 py-0.5 rounded-full text-white/90 font-medium"
        style="background-color: {sourceColor ?? config.color};"
      >
        {sourceLabel}
      </span>
    </div>
  {/if}

  <!-- ミュート折り畳み表示 -->
  {#if isMuted && !muteExpanded}
    <div class="flex items-center gap-2 text-base-content/30">
      <EyeOff class="w-3 h-3" aria-hidden="true" />
      <span class="text-[0.6rem]">{muteReason ?? 'ミュート中のノート'}</span>
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
        <Repeat2 class="w-3 h-3 shrink-0" aria-hidden="true" />
        <span class="truncate">
          <span class="font-semibold text-base-content/50">
            <MfmRenderer text={renoteUser.name || renoteUser.username} emojis={renoteUserEmojis} isInline />
          </span> がRenote
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
          {runtime}
        />
      </div>
    {/if}

    <!-- ユーザー + タイムスタンプ行 -->
    <div class="flex items-start gap-2 min-w-0 mb-1">
      <div class="flex-1 min-w-0">
        <NoteUser user={displayNote.user} {hostUrl} compact={depth > 0} {emojis} onclick={handleUserClick} />
      </div>

      <!-- タイムスタンプ (クリックで元ノートを開く) -->
      <a
        class="text-[0.6rem] text-base-content/30 shrink-0 mt-0.5 hover:text-base-content/60 hover:underline transition-colors"
        href="{hostUrl}/notes/{displayNote.id}"
        target="_blank"
        rel="noopener noreferrer"
        title={new Date(displayNote.createdAt).toLocaleString('ja-JP')}
        onclick={(e) => e.stopPropagation()}
      >
        <time datetime={displayNote.createdAt}>
          {createdAt}
        </time>
      </a>
    </div>

    <!-- 本文 (チャンネル・公開範囲・ローカルのみは NoteBody 内で横並び表示) -->
    <NoteBody
      note={displayNote}
      {config}
      emojis={noteEmojis}
      channel={depth === 0 && hasChannel ? noteChannel : null}
      {hostUrl}
    />

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
          {runtime}
        />
      </div>
    {/if}

    <!-- メディア -->
    {#if hasMedia}
      <NoteMedia files={mediaFiles} {config} mediaDisplayMode={settingsStore.settings.mediaDisplayMode} />
    {/if}

    <!-- リアクション表示 -->
    {#if hasReactions}
      <NoteReactions
        {reactions}
        {myReaction}
        emojis={reactionEmojis}
        reactionSize={config.noteDisplay.reactionSize}
        onreact={handleReact}
      />
    {/if}

    <!-- ツールバー (depth=0のみ) -->
    {#if depth === 0 && (runtime || effectiveRuntime)}
      <div class="note-tabs flex items-center gap-1 mt-1.5 pt-1 border-t border-base-300/30">
        <!-- リプライボタン -->
        <button
          class="toolbar-btn inline-flex items-center justify-center w-6 h-6 rounded
            text-base-content/30 hover:text-info/70 hover:bg-info/10
            transition-all duration-150
            {composerMode === 'reply' ? 'text-info/70 bg-info/10' : ''}"
          title="リプライ"
          aria-label="リプライ"
          onclick={handleReply}
        >
          <MessageSquare class="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <!-- リノートボタン -->
        <button
          class="toolbar-btn inline-flex items-center justify-center w-6 h-6 rounded
            text-base-content/30 hover:text-success/70 hover:bg-success/10
            transition-all duration-150
            {renoteMenuVisible || composerMode === 'quote' ? 'text-success/70 bg-success/10' : ''}
            {renoteBusy ? 'opacity-40 cursor-not-allowed' : ''}"
          title="リノート"
          aria-label="リノート"
          disabled={renoteBusy}
          onclick={handleRenoteClick}
        >
          {#if renoteBusy}
            <Loader2 class="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          {:else}
            <Repeat2 class="w-3.5 h-3.5" aria-hidden="true" />
          {/if}
        </button>

        <!-- リアクションボタン -->
        {#if effectiveRuntime}
          <ReactionButton
            noteId={displayNote.id}
            {myReaction}
            runtime={effectiveRuntime}
            reactionDeck={config.reactionDeck}
            emojis={reactionEmojis}
            onreacted={handleReacted}
          />
        {:else if runtime}
          <ReactionButton
            noteId={displayNote.id}
            {myReaction}
            {runtime}
            reactionDeck={config.reactionDeck}
            emojis={reactionEmojis}
            onreacted={handleReacted}
          />
        {/if}

        <!-- マージTL: アカウント選択ピッカー -->
        {#if availableRuntimes && availableRuntimes.size > 1}
          <ReactionAccountPicker
            runtimes={availableRuntimes}
            selectedAccountId={selectedReactionAccountId ?? sourceAccountId ?? config.accountId}
            onselect={(id) => { selectedReactionAccountId = id; }}
          />
        {/if}

        <!-- スペーサー -->
        <div class="flex-1"></div>

        <!-- その他ボタン -->
        <button
          class="toolbar-btn inline-flex items-center justify-center w-6 h-6 rounded
            text-base-content/30 hover:text-base-content/60 hover:bg-base-200
            transition-all duration-150
            {moreMenuVisible ? 'text-base-content/60 bg-base-200' : ''}"
          title="その他"
          aria-label="その他"
          onclick={handleMoreClick}
        >
          <MoreHorizontal class="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <!-- リノートメニュー -->
      {#if renoteMenuVisible}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="fixed inset-0 z-40" onclick={() => { renoteMenuVisible = false; }}>
          <div
            class="fixed z-50 rounded-lg shadow-xl border border-base-300 bg-base-100 py-1"
            style="min-width: 160px; {renoteMenuStyle}"
            role="menu"
            aria-label="リノートメニュー"
            onkeydown={(e) => { if (e.key === 'Escape') renoteMenuVisible = false; }}
          >
            <button
              class="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-base-200 transition-colors"
              onclick={doRenote}
              role="menuitem"
            >
              <Repeat2 class="w-3.5 h-3.5 shrink-0 text-success/60" aria-hidden="true" />
              Renote
            </button>
            <button
              class="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-base-200 transition-colors"
              onclick={doQuote}
              role="menuitem"
            >
              <MessageSquare class="w-3.5 h-3.5 shrink-0 text-success/60" aria-hidden="true" />
              引用Renote
            </button>
          </div>
        </div>
      {/if}

      <!-- その他メニュー -->
      {#if moreMenuVisible}
        <NoteMoreMenu
          noteId={displayNote.id}
          noteText={displayNote.text ?? null}
          hostUrl={hostUrl ?? ''}
          runtime={(effectiveRuntime ?? runtime)!}
          positionStyle={moreMenuStyle}
          onclose={() => { moreMenuVisible = false; }}
        />
      {/if}

      <!-- インラインコンポーザー (リプライ / 引用Renote) -->
      {#if composerMode === 'reply'}
        <div class="mt-1.5">
          <InlineComposer
            runtime={(effectiveRuntime ?? runtime)!}
            replyId={displayNote.id}
            replyNote={displayNote}
            oncomplete={handleComposerComplete}
            oncancel={handleComposerCancel}
          />
        </div>
      {:else if composerMode === 'quote'}
        <div class="mt-1.5">
          <InlineComposer
            runtime={(effectiveRuntime ?? runtime)!}
            renoteId={displayNote.id}
            renoteNote={displayNote}
            oncomplete={handleComposerComplete}
            oncancel={handleComposerCancel}
          />
        </div>
      {/if}
    {/if}

  {/if}

  <!-- ユーザー詳細モーダル -->
  {#if userModalTarget}
    <UserDetailModal
      open={userModalOpen}
      onclose={() => { userModalOpen = false; }}
      user={userModalTarget}
      {runtime}
      {hostUrl}
      emojis={noteEmojis}
      accountId={sourceAccountId ?? (config.accountId >= 0 ? config.accountId : undefined)}
    />
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

  .toolbar-btn {
    transition: transform 150ms ease, color 150ms ease, background-color 150ms ease;
  }
</style>
