<script lang="ts">
  import type { AccountRuntime } from '$lib/types';
  import ReactionDeck from './ReactionDeck.svelte';

  type Props = {
    noteId: string;
    myReaction: string | null;
    runtime: AccountRuntime;
    reactionDeck: string[];
    emojis: Record<string, string>;
    onreacted?: (reaction: string | null) => void;
  };

  const {
    noteId,
    myReaction,
    runtime,
    reactionDeck,
    emojis,
    onreacted,
  }: Props = $props();

  // デッキ表示状態
  let deckVisible = $state(false);

  // アニメーション状態
  let animating = $state(false);

  // API呼び出し中フラグ
  let busy = $state(false);

  // ボタン要素の参照 (デッキの位置計算用)
  let buttonEl = $state<HTMLButtonElement | null>(null);

  // デッキのスタイル (ボタン下に表示)
  let deckStyle = $state('');

  function computeDeckPosition() {
    if (!buttonEl) {
      deckStyle = 'bottom: 2rem; left: 0;';
      return;
    }
    const rect = buttonEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // ボタン下に十分スペースがあるか確認 (デッキ高さ約220px)
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top: string;
    let left: string;

    if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
      top = `${rect.bottom + 4}px`;
    } else {
      top = `${rect.top - 224}px`;
    }

    // 右端にはみ出さないように調整
    const leftPx = Math.min(rect.left, viewportWidth - 330);
    left = `${Math.max(0, leftPx)}px`;

    deckStyle = `top: ${top}; left: ${left};`;
  }

  function handleButtonClick() {
    if (busy) return;

    if (myReaction) {
      // 既にリアクション済み → 削除
      deleteReaction();
    } else {
      // デッキを表示
      computeDeckPosition();
      deckVisible = true;
    }
  }

  async function addReaction(reaction: string) {
    if (busy) return;
    busy = true;
    deckVisible = false;

    try {
      await runtime.cli.request('notes/reactions/create', {
        noteId,
        reaction,
      });

      // アニメーション
      animating = true;
      setTimeout(() => { animating = false; }, 600);

      onreacted?.(reaction);
    } catch (err) {
      console.error('[ReactionButton] リアクション追加失敗:', err);
    } finally {
      busy = false;
    }
  }

  async function deleteReaction() {
    if (busy) return;
    busy = true;

    try {
      await runtime.cli.request('notes/reactions/delete', {
        noteId,
      });

      onreacted?.(null);
    } catch (err) {
      console.error('[ReactionButton] リアクション削除失敗:', err);
    } finally {
      busy = false;
    }
  }

  function handleDeckSelect(reaction: string) {
    addReaction(reaction);
  }

  function handleDeckClose() {
    deckVisible = false;
  }
</script>

<!-- リアクション追加ボタン -->
<button
  bind:this={buttonEl}
  class="reaction-add-btn inline-flex items-center justify-center w-6 h-6 rounded
    text-base-content/30 hover:text-base-content/60 hover:bg-base-200
    transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
    {myReaction ? 'text-primary/70 hover:text-error/70 bg-primary/10 hover:bg-error/10' : ''}
    {animating ? 'scale-125' : 'scale-100'}
  "
  title={myReaction ? `${myReaction} を削除` : 'リアクションを追加'}
  aria-label={myReaction ? `リアクション ${myReaction} を削除` : 'リアクションを追加'}
  aria-pressed={!!myReaction}
  aria-expanded={deckVisible}
  disabled={busy}
  onclick={handleButtonClick}
>
  {#if busy}
    <!-- ローディングスピナー -->
    <svg
      class="w-3.5 h-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      aria-hidden="true"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke-linecap="round"
      />
    </svg>
  {:else if myReaction}
    <!-- リアクション済みアイコン (削除を示す) -->
    <svg
      class="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  {:else}
    <!-- 未リアクション: + アイコン -->
    <svg
      class="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v8M8 12h8" stroke-linecap="round"/>
    </svg>
  {/if}
</button>

<!-- リアクションデッキ (ポップアップ) -->
{#if deckVisible}
  <div class="reaction-deck-wrapper" style={deckStyle}>
    <ReactionDeck
      deck={reactionDeck}
      {emojis}
      accountEmojis={runtime.emojis}
      onselect={handleDeckSelect}
      onclose={handleDeckClose}
    />
  </div>
{/if}

<style>
  .reaction-add-btn {
    transition: transform 150ms ease, color 150ms ease, background-color 150ms ease;
  }

  .reaction-deck-wrapper {
    position: fixed;
    z-index: 50;
  }
</style>
