<script lang="ts">
  import type { entities } from 'misskey-js';
  import EmojiRenderer from '$lib/emoji/EmojiRenderer.svelte';
  import { getReactionHistory, addReactionHistory } from '$lib/utils/reactionHistory';
  import { unicodeEmojiGroups, allUnicodeEmojis } from '$lib/emoji/unicodeEmojiData';

  type EmojiDetailed = entities.EmojiDetailed;

  type Props = {
    /** アカウントが持つカスタム絵文字リスト */
    accountEmojis: EmojiDetailed[];
    /** リアクションデッキ (カラム設定から) */
    deck?: string[];
    /** 絵文字URLマップ (カスタム絵文字名 -> URL) */
    emojis?: Record<string, string>;
    /** 絵文字選択時コールバック (絵文字名のみ、コロンなし。Unicode絵文字はそのまま文字) */
    onselect: (name: string) => void;
    /** 閉じる時コールバック */
    onclose?: () => void;
  };

  const {
    accountEmojis,
    deck = [],
    emojis = {},
    onselect,
    onclose,
  }: Props = $props();

  let searchQuery = $state('');
  let searchInputEl = $state<HTMLInputElement | null>(null);

  // タブ切り替え: 'custom' | 'unicode'
  let activeTab = $state<'custom' | 'unicode'>('custom');
  // Unicode絵文字カテゴリ
  let activeGroupIndex = $state(0);

  // 無限スクロール用
  const PAGE_SIZE = 60;
  let displayCount = $state(PAGE_SIZE);
  let scrollEl = $state<HTMLDivElement | null>(null);

  // リアクション履歴
  const reactionHistory = $derived(getReactionHistory());

  // カスタム絵文字かどうか判定 (:name: 形式)
  function isCustomEmoji(reaction: string): boolean {
    return reaction.startsWith(':') && reaction.endsWith(':');
  }

  function getCustomEmojiName(reaction: string): string {
    return reaction.slice(1, -1).split('@')[0];
  }

  // デッキ/履歴の絵文字URLを取得
  function getDeckEmojiUrl(reaction: string): string | null {
    if (!isCustomEmoji(reaction)) return null;
    const name = getCustomEmojiName(reaction);
    return emojis[name] ?? emojis[reaction] ?? null;
  }

  // カスタム絵文字の検索結果
  const customSearchResults = $derived(
    searchQuery.trim().length === 0
      ? []
      : (() => {
          const q = searchQuery.trim().toLowerCase();
          const filtered = accountEmojis.filter((e) => {
            return (
              e.name.toLowerCase().includes(q) ||
              (e.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
              (e.category ?? '').toLowerCase().includes(q)
            );
          });
          // 完全一致する絵文字を先頭に移動
          const exactIndex = filtered.findIndex((e) => e.name.toLowerCase() === q);
          if (exactIndex > 0) {
            const exact = filtered.splice(exactIndex, 1);
            filtered.unshift(exact[0]);
          }
          return filtered;
        })()
  );

  // Unicode絵文字の検索結果
  const unicodeSearchResults = $derived(
    searchQuery.trim().length === 0
      ? []
      : (() => {
          const q = searchQuery.trim().toLowerCase();
          return allUnicodeEmojis
            .filter((e) => e.name.includes(q) || e.slug.includes(q))
            .slice(0, 50);
        })()
  );

  // 後方互換: searchResults は customSearchResults を指す (既存ロジック用)
  const searchResults = $derived(customSearchResults);

  // 完全一致する絵文字があるか (Enterキー送信判定用) - カスタム絵文字のみ
  const exactMatch = $derived(
    customSearchResults.length > 0 &&
      customSearchResults[0].name.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const isSearching = $derived(searchQuery.trim().length > 0);

  // 表示する絵文字リスト (無限スクロール対応)
  const displayedEmojis = $derived(accountEmojis.slice(0, displayCount));
  const hasMore = $derived(displayCount < accountEmojis.length);

  // 現在のUnicodeカテゴリの絵文字 (無限スクロール対応)
  const currentGroup = $derived(unicodeEmojiGroups[activeGroupIndex]);
  const displayedUnicodeEmojis = $derived(currentGroup?.emojis.slice(0, displayCount) ?? []);
  const hasMoreUnicode = $derived(displayCount < (currentGroup?.emojis.length ?? 0));

  function handleSelect(name: string) {
    // 履歴に追加 (:name: 形式で保存)
    addReactionHistory(`:${name}:`);
    onselect(name);
  }

  function handleUnicodeSelect(char: string) {
    // Unicode絵文字は文字そのままで保存・送信
    addReactionHistory(char);
    onselect(char);
  }

  function handleDeckSelect(reaction: string) {
    const name = isCustomEmoji(reaction) ? getCustomEmojiName(reaction) : reaction;
    addReactionHistory(isCustomEmoji(reaction) ? reaction : `:${reaction}:`);
    onselect(name);
  }

  function handleHistorySelect(reaction: string) {
    if (isCustomEmoji(reaction)) {
      const name = getCustomEmojiName(reaction);
      addReactionHistory(reaction);
      onselect(name);
    } else {
      // Unicode絵文字は名前として渡す (テキストに挿入)
      addReactionHistory(reaction);
      onselect(reaction);
    }
  }

  // スクロールハンドラ (無限スクロール)
  function handleScroll() {
    if (!scrollEl) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollEl;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      if (activeTab === 'custom' && hasMore) {
        displayCount = Math.min(displayCount + PAGE_SIZE, accountEmojis.length);
      } else if (activeTab === 'unicode' && hasMoreUnicode) {
        displayCount = Math.min(displayCount + PAGE_SIZE, currentGroup.emojis.length);
      }
    }
  }

  // 検索クエリ/タブ/カテゴリが変わったらスクロール位置をリセット
  $effect(() => {
    searchQuery; activeTab; activeGroupIndex; // 依存
    displayCount = PAGE_SIZE;
    if (scrollEl) scrollEl.scrollTop = 0;
  });

  // マウント時に検索フォームにフォーカス
  $effect(() => {
    if (searchInputEl) {
      searchInputEl.focus();
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onclose?.();
    } else if (e.key === 'Enter' && exactMatch && activeTab === 'custom') {
      e.preventDefault();
      handleSelect(searchResults[0].name);
    }
  }

  function switchGroup(index: number) {
    activeGroupIndex = index;
  }
</script>

<div
  class="emoji-picker-popup flex flex-col border border-base-300 rounded-lg bg-base-100 shadow-xl"
  style="width: 100%; max-width: min(22rem, calc(100vw - 1rem)); max-height: 22rem;"
  role="dialog"
  aria-label="絵文字ピッカー"
  onkeydown={handleKeydown}
>
  <!-- 検索フォーム -->
  <div class="px-2 pt-2 pb-1 shrink-0">
    <input
      bind:this={searchInputEl}
      bind:value={searchQuery}
      type="text"
      placeholder="絵文字を検索..."
      class="input input-sm input-bordered w-full text-xs"
      aria-label="絵文字検索"
    />
  </div>

  <!-- タブ (検索中は非表示) -->
  {#if !isSearching}
    <div class="flex shrink-0 border-b border-base-300 px-2">
      <button
        class="px-3 py-1 text-xs font-medium border-b-2 transition-colors {activeTab === 'custom' ? 'border-primary text-primary' : 'border-transparent text-base-content/50 hover:text-base-content/80'}"
        onclick={() => { activeTab = 'custom'; }}
      >
        カスタム
      </button>
      <button
        class="px-3 py-1 text-xs font-medium border-b-2 transition-colors {activeTab === 'unicode' ? 'border-primary text-primary' : 'border-transparent text-base-content/50 hover:text-base-content/80'}"
        onclick={() => { activeTab = 'unicode'; }}
      >
        Unicode
      </button>
    </div>
  {/if}

  <!-- スクロール領域 -->
  <div
    bind:this={scrollEl}
    class="flex-1 overflow-y-auto px-2 pb-2"
    onscroll={handleScroll}
  >
    {#if isSearching}
      <!-- 検索結果: カスタム絵文字 -->
      {#if customSearchResults.length === 0 && unicodeSearchResults.length === 0}
        <div class="text-xs text-base-content/40 text-center py-4">
          一致する絵文字がありません
        </div>
      {:else}
        {#if customSearchResults.length > 0}
          <div class="text-[0.6rem] text-base-content/40 mb-1 px-0.5 pt-1 flex items-center gap-1">
            <span>カスタム絵文字 ({customSearchResults.length}件)</span>
            {#if exactMatch}
              <span class="text-primary/70">· Enterで送信</span>
            {/if}
          </div>
          <div class="flex flex-wrap gap-0.5 mb-2">
            {#each customSearchResults as emoji, i (emoji.name)}
              <button
                class="emoji-btn flex items-center justify-center w-8 h-8 rounded transition-colors duration-100 {i === 0 && exactMatch ? 'bg-primary/20 hover:bg-primary/30 ring-1 ring-primary/50' : 'hover:bg-base-200'}"
                title="{i === 0 && exactMatch ? '↵ ' : ''}:{emoji.name}:"
                aria-label=":{emoji.name}:"
                onclick={() => handleSelect(emoji.name)}
              >
                {#if emoji.url}
                  <EmojiRenderer name={emoji.name} url={emoji.url} height="1.4em" />
                {:else}
                  <span class="text-[0.6rem] truncate px-0.5">{emoji.name}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        <!-- 検索結果: Unicode絵文字 -->
        {#if unicodeSearchResults.length > 0}
          <div class="text-[0.6rem] text-base-content/40 mb-1 px-0.5 pt-1">
            Unicode絵文字 ({unicodeSearchResults.length}件)
          </div>
          <div class="flex flex-wrap gap-0.5">
            {#each unicodeSearchResults as entry (entry.emoji)}
              <button
                class="emoji-btn flex items-center justify-center w-8 h-8 rounded hover:bg-base-200 transition-colors duration-100"
                title={entry.name}
                aria-label={entry.name}
                onclick={() => handleUnicodeSelect(entry.emoji)}
              >
                <EmojiRenderer emoji={entry.emoji} height="1.4em" />
              </button>
            {/each}
          </div>
        {/if}
      {/if}

    {:else if activeTab === 'custom'}
      <!-- カスタム絵文字タブ -->

      <!-- デッキ -->
      {#if deck.length > 0}
        <div class="text-[0.6rem] text-base-content/40 mb-1 px-0.5 pt-1">デッキ</div>
        <div class="flex flex-wrap gap-0.5 mb-2">
          {#each deck as reaction (reaction)}
            {@const url = getDeckEmojiUrl(reaction)}
            {@const name = isCustomEmoji(reaction) ? getCustomEmojiName(reaction) : null}
            <button
              class="emoji-btn flex items-center justify-center w-8 h-8 rounded hover:bg-base-200 transition-colors duration-100"
              title={reaction}
              aria-label={reaction}
              onclick={() => handleDeckSelect(reaction)}
            >
              {#if url && name}
                <EmojiRenderer {name} {url} height="1.4em" />
              {:else if isCustomEmoji(reaction)}
                <span class="text-[0.6rem] leading-none truncate px-0.5 max-w-8">{name}</span>
              {:else}
                <EmojiRenderer emoji={reaction} height="1.4em" />
              {/if}
            </button>
          {/each}
        </div>
      {/if}

      <!-- 履歴 -->
      {#if reactionHistory.length > 0}
        <div class="text-[0.6rem] text-base-content/40 mb-1 px-0.5">履歴</div>
        <div class="flex flex-wrap gap-0.5 mb-2">
          {#each reactionHistory as reaction (reaction)}
            {@const url = getDeckEmojiUrl(reaction)}
            {@const name = isCustomEmoji(reaction) ? getCustomEmojiName(reaction) : null}
            <button
              class="emoji-btn flex items-center justify-center w-8 h-8 rounded hover:bg-base-200 transition-colors duration-100"
              title={reaction}
              aria-label={reaction}
              onclick={() => handleHistorySelect(reaction)}
            >
              {#if url && name}
                <EmojiRenderer {name} {url} height="1.4em" />
              {:else if isCustomEmoji(reaction)}
                <span class="text-[0.6rem] leading-none truncate px-0.5 max-w-8">{name}</span>
              {:else}
                <EmojiRenderer emoji={reaction} height="1.4em" />
              {/if}
            </button>
          {/each}
        </div>
      {/if}

      <!-- ローカル絵文字 (無限スクロール) -->
      {#if displayedEmojis.length > 0}
        <div class="text-[0.6rem] text-base-content/40 mb-1 px-0.5">ローカル絵文字</div>
        <div class="flex flex-wrap gap-0.5">
          {#each displayedEmojis as emoji (emoji.name)}
            <button
              class="emoji-btn flex items-center justify-center w-8 h-8 rounded hover:bg-base-200 transition-colors duration-100"
              title=":{emoji.name}:"
              aria-label=":{emoji.name}:"
              onclick={() => handleSelect(emoji.name)}
            >
              {#if emoji.url}
                <EmojiRenderer name={emoji.name} url={emoji.url} height="1.4em" />
              {:else}
                <span class="text-[0.6rem] truncate px-0.5">{emoji.name}</span>
              {/if}
            </button>
          {/each}
          {#if hasMore}
            <div class="w-full text-center py-1">
              <span class="text-[0.6rem] text-base-content/30">スクロールして続きを表示...</span>
            </div>
          {/if}
        </div>
      {:else if deck.length === 0 && reactionHistory.length === 0}
        <div class="text-xs text-base-content/40 text-center py-4">
          カスタム絵文字がありません
        </div>
      {/if}

    {:else}
      <!-- Unicode絵文字タブ -->

      <!-- カテゴリ選択バー -->
      <div class="flex gap-0.5 py-1 shrink-0 overflow-x-auto scrollbar-none">
        {#each unicodeEmojiGroups as group, i (group.slug)}
          <button
            class="flex-none flex items-center justify-center w-7 h-7 rounded text-base transition-colors duration-100 {activeGroupIndex === i ? 'bg-primary/20 ring-1 ring-primary/40' : 'hover:bg-base-200'}"
            title={group.name}
            aria-label={group.name}
            onclick={() => switchGroup(i)}
          >
            {group.icon}
          </button>
        {/each}
      </div>

      <!-- カテゴリ名 -->
      <div class="text-[0.6rem] text-base-content/40 mb-1 px-0.5">
        {currentGroup?.name ?? ''}
      </div>

      <!-- Unicode絵文字グリッド (無限スクロール) -->
      <div class="flex flex-wrap gap-0.5">
        {#each displayedUnicodeEmojis as entry (entry.emoji)}
          <button
            class="emoji-btn flex items-center justify-center w-8 h-8 rounded hover:bg-base-200 transition-colors duration-100"
            title={entry.name}
            aria-label={entry.name}
            onclick={() => handleUnicodeSelect(entry.emoji)}
          >
            <EmojiRenderer emoji={entry.emoji} height="1.4em" />
          </button>
        {/each}
        {#if hasMoreUnicode}
          <div class="w-full text-center py-1">
            <span class="text-[0.6rem] text-base-content/30">スクロールして続きを表示...</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .emoji-btn {
    cursor: pointer;
  }

  .scrollbar-none {
    scrollbar-width: none;
  }
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
</style>
