<script lang="ts">
  import type { AccountRuntime } from '$lib/types';
  import ReactionDeck from './ReactionDeck.svelte';
  import { Heart, PlusCircle, Loader2 } from 'lucide-svelte';

  type Props = {
    noteId: string;
    myReaction: string | null;
    runtime: AccountRuntime;
    reactionDeck: string[];
    emojis: Record<string, string>;
    onreacted?: (reaction: string | null) => void;
    timelineId?: number;
  };

  const {
    noteId,
    myReaction,
    runtime,
    reactionDeck,
    emojis,
    onreacted,
    timelineId,
  }: Props = $props();

  // デッキ表示状態
  let deckVisible = $state(false);

  // アニメーション状態
  let animating = $state(false);

  // API呼び出し中フラグ
  let busy = $state(false);

  // デッキのスタイル (マウス位置に表示)
  let deckStyle = $state('');

  function computeDeckPosition(mouseX: number, mouseY: number) {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // マウス位置の下に十分スペースがあるか確認 (デッキ高さ約220px)
    const spaceBelow = viewportHeight - mouseY;
    const spaceAbove = mouseY;

    let top: string;
    let left: string;

    if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
      top = `${mouseY + 4}px`;
    } else {
      top = `${mouseY - 224}px`;
    }

    // 右端にはみ出さないように調整
    const leftPx = Math.min(mouseX, viewportWidth - 330);
    left = `${Math.max(0, leftPx)}px`;

    deckStyle = `top: ${top}; left: ${left};`;
  }

  function handleButtonClick(e: MouseEvent) {
    if (busy) return;

    if (myReaction) {
      // 既にリアクション済み → 削除
      deleteReaction();
    } else {
      // デッキをマウス位置に表示
      computeDeckPosition(e.clientX, e.clientY);
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
  class="reaction-add-btn flex-1 inline-flex items-center justify-center h-7 rounded
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
    <Loader2 class="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
  {:else if myReaction}
    <!-- リアクション済みアイコン (削除を示す) -->
    <Heart class="w-3.5 h-3.5" fill="currentColor" aria-hidden="true" />
  {:else}
    <!-- 未リアクション: + アイコン -->
    <PlusCircle class="w-3.5 h-3.5" aria-hidden="true" />
  {/if}
</button>

<!-- リアクションデッキ (ポップアップ) -->
{#if deckVisible}
  <ReactionDeck
    deck={reactionDeck}
    {emojis}
    accountEmojis={runtime.emojis}
    positionStyle={deckStyle}
    onselect={handleDeckSelect}
    onclose={handleDeckClose}
    {timelineId}
  />
{/if}

<style>
  .reaction-add-btn {
    transition: transform 150ms ease, color 150ms ease, background-color 150ms ease;
  }
</style>
