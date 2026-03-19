<script lang="ts">
  import type { entities } from 'misskey-js';
  import EmojiRenderer from '$lib/emoji/EmojiRenderer.svelte';

  type EmojiDetailed = entities.EmojiDetailed;

  type Props = {
    deck: string[];
    emojis: Record<string, string>;
    accountEmojis: EmojiDetailed[];
    onselect: (reaction: string) => void;
    onclose: () => void;
  };

  const { deck, emojis, accountEmojis, onselect, onclose }: Props = $props();

  let searchQuery = $state('');
  let searchInputEl = $state<HTMLInputElement | null>(null);

  // カスタム絵文字かどうか判定 (:name: 形式)
  function isCustomEmoji(reaction: string): boolean {
    return reaction.startsWith(':') && reaction.endsWith(':');
  }

  function getCustomEmojiName(reaction: string): string {
    return reaction.slice(1, -1).split('@')[0];
  }

  // デッキの絵文字URLを取得
  function getDeckEmojiUrl(reaction: string): string | null {
    if (!isCustomEmoji(reaction)) return null;
    const name = getCustomEmojiName(reaction);
    return emojis[name] ?? emojis[reaction] ?? null;
  }

  // 絵文字検索: accountEmojisから検索
  const searchResults = $derived(
    searchQuery.trim().length === 0
      ? []
      : accountEmojis
          .filter((e) => {
            const q = searchQuery.toLowerCase();
            return (
              e.name.toLowerCase().includes(q) ||
              (e.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
              (e.category ?? '').toLowerCase().includes(q)
            );
          })
          .slice(0, 30)
  );

  // デッキ表示: 検索中は検索結果、そうでなければデッキ配列
  const isSearching = $derived(searchQuery.trim().length > 0);

  function handleSelect(reaction: string) {
    onselect(reaction);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onclose();
    }
  }

  // クリック外で閉じる
  function handleBackdropClick(e: MouseEvent) {
    // backdrop自体がクリックされた場合のみ閉じる
    if (e.target === e.currentTarget) {
      onclose();
    }
  }

  // マウント時に検索フォームにフォーカス
  $effect(() => {
    if (searchInputEl) {
      searchInputEl.focus();
    }
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="reaction-deck-backdrop fixed inset-0 z-40"
  onclick={handleBackdropClick}
>
  <div
    class="reaction-deck absolute z-50 rounded-lg shadow-xl border border-base-300 bg-base-100 p-2"
    style="min-width: 220px; max-width: 320px;"
    role="dialog"
    aria-label="リアクション選択"
    onkeydown={handleKeydown}
  >
    <!-- 検索フォーム -->
    <div class="mb-2">
      <input
        bind:this={searchInputEl}
        bind:value={searchQuery}
        type="text"
        placeholder="絵文字を検索..."
        class="input input-sm input-bordered w-full text-xs"
        aria-label="絵文字検索"
      />
    </div>

    <!-- デッキまたは検索結果 -->
    {#if isSearching}
      <!-- 検索結果 -->
      <div class="search-results">
        {#if searchResults.length === 0}
          <div class="text-xs text-base-content/40 text-center py-3">
            一致する絵文字がありません
          </div>
        {:else}
          <div class="text-[0.6rem] text-base-content/40 mb-1 px-0.5">
            検索結果 ({searchResults.length}件)
          </div>
          <div class="flex flex-wrap gap-0.5 max-h-48 overflow-y-auto">
            {#each searchResults as emoji}
              <button
                class="emoji-btn flex items-center justify-center w-8 h-8 rounded hover:bg-base-200 transition-colors duration-100"
                title=":{emoji.name}:"
                aria-label=":{emoji.name}:"
                onclick={() => handleSelect(`:${emoji.name}:`)}
              >
                {#if emoji.url}
                  <EmojiRenderer name={emoji.name} url={emoji.url} height="1.4em" />
                {:else}
                  <span class="text-sm">{emoji.name}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <!-- デッキ表示 -->
      {#if deck.length === 0}
        <div class="text-xs text-base-content/40 text-center py-3">
          リアクションデッキが未設定です
        </div>
      {:else}
        <div class="text-[0.6rem] text-base-content/40 mb-1 px-0.5">クイック選択</div>
        <div class="flex flex-wrap gap-0.5">
          {#each deck as reaction}
            {@const emojiUrl = getDeckEmojiUrl(reaction)}
            {@const emojiName = isCustomEmoji(reaction) ? getCustomEmojiName(reaction) : null}
            <button
              class="emoji-btn flex items-center justify-center w-8 h-8 rounded hover:bg-base-200 transition-colors duration-100"
              title={reaction}
              aria-label={reaction}
              onclick={() => handleSelect(reaction)}
            >
              {#if emojiUrl && emojiName}
                <EmojiRenderer name={emojiName} url={emojiUrl} height="1.4em" />
              {:else if isCustomEmoji(reaction)}
                <!-- URLが見つからないカスタム絵文字 -->
                <span class="text-[0.6rem] leading-none truncate px-0.5 max-w-8">
                  {emojiName}
                </span>
              {:else}
                <!-- Unicode絵文字: twemojiでレンダリング -->
                <EmojiRenderer emoji={reaction} height="1.4em" />
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- 閉じるボタン -->
    <div class="mt-2 pt-1.5 border-t border-base-300/50 flex justify-end">
      <button
        class="btn btn-ghost btn-xs text-xs text-base-content/50"
        onclick={onclose}
        aria-label="閉じる"
      >
        閉じる
      </button>
    </div>
  </div>
</div>

<style>
  .emoji-btn {
    cursor: pointer;
  }
</style>
