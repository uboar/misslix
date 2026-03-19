<script lang="ts">
  type Props = {
    reactions: Record<string, number>;
    myReaction?: string | null;
    emojis?: Record<string, string>;
    reactionSize?: number;
    onreact?: (reaction: string) => void;
  };

  let {
    reactions,
    myReaction = null,
    emojis = {},
    reactionSize = 24,
    onreact,
  }: Props = $props();

  // リアクションをカウント降順でソート
  const sortedReactions = $derived(
    Object.entries(reactions)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
  );

  // カスタム絵文字かどうか判定 (:name: 形式)
  function isCustomEmoji(reaction: string): boolean {
    return reaction.startsWith(':') && reaction.endsWith(':');
  }

  function getCustomEmojiName(reaction: string): string {
    // :name@.:  や :name: 形式に対応
    return reaction.slice(1, -1).split('@')[0];
  }

  // カスタム絵文字URL取得
  function getEmojiUrl(reaction: string): string | null {
    const name = getCustomEmojiName(reaction);   // 'neko' (サーバー名strip)
    const fullName = reaction.slice(1, -1);       // 'neko@misskey.io' (コロンなし・サーバー名つき)
    return emojis[name] ?? emojis[fullName] ?? emojis[reaction] ?? null;
  }

  function handleClick(reaction: string) {
    onreact?.(reaction);
  }
</script>

{#if sortedReactions.length > 0}
  <div class="note-reactions flex flex-wrap gap-0.5 mt-1.5" aria-label="リアクション">
    {#each sortedReactions as [reaction, count]}
      {@const isMine = myReaction === reaction}
      {@const emojiUrl = isCustomEmoji(reaction) ? getEmojiUrl(reaction) : null}

      <button
        class="reaction-badge inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[0.6rem] font-medium transition-all duration-150 border
          {isMine
            ? 'bg-primary/20 border-primary/50 text-primary hover:bg-primary/30'
            : 'bg-base-200/80 border-base-300/50 text-base-content/70 hover:bg-base-300 hover:border-base-400/50'
          }"
        onclick={() => handleClick(reaction)}
        aria-label="{reaction} {count}件{isMine ? ' (自分がリアクション済み)' : ''}"
        aria-pressed={isMine}
      >
        <!-- 絵文字表示 -->
        <span class="reaction-emoji shrink-0" aria-hidden="true">
          {#if emojiUrl}
            <!-- カスタム絵文字: EmojiRenderer integration point -->
            <!-- TODO: replace with <EmojiRenderer name={getCustomEmojiName(reaction)} {emojis} /> -->
            <img
              src={emojiUrl}
              alt={getCustomEmojiName(reaction)}
              class="inline-block object-contain align-middle"
              style="height: {Math.min(reactionSize, 16)}px; width: auto;"
              loading="lazy"
            />
          {:else if isCustomEmoji(reaction)}
            <!-- カスタム絵文字URLが見つからない場合はテキスト表示 -->
            <span class="text-[0.65rem]">{getCustomEmojiName(reaction)}</span>
          {:else}
            <!-- Unicode絵文字 -->
            <span class="text-[0.75rem] leading-none">{reaction}</span>
          {/if}
        </span>

        <!-- カウント -->
        <span class="reaction-count tabular-nums leading-none">{count}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .reaction-badge {
    line-height: 1;
  }
</style>
