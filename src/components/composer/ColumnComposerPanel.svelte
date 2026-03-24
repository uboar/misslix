<script lang="ts">
  import type { ColumnConfig, AccountRuntime, Visibility } from '$lib/types';
  import InlineComposer from './InlineComposer.svelte';
  import { SquarePen, X, MessageSquare } from 'lucide-svelte';

  type Props = {
    config: ColumnConfig;
    runtime: AccountRuntime;
    onclose?: () => void;
  };

  let { config, runtime, onclose }: Props = $props();

  // カラム設定からデフォルト公開範囲を決定
  // channel タイプのカラムならチャンネルへの投稿を初期化、
  // defaultVisibility が設定されていればそれを使う
  const isChannelColumn = $derived(config.channel === 'channel');

  // channelId と channelName はカラム設定から引き継ぐ
  const initialChannelId = $derived(
    isChannelColumn ? (config.channelId ?? undefined) : undefined,
  );

  // デフォルト公開範囲: カラム設定 > channel列はpublic > public
  const initialVisibility = $derived<Visibility>(
    config.defaultVisibility ?? 'public',
  );

  const initialLocalOnly = $derived(config.defaultLocalOnly ?? false);
</script>

<!-- 投稿コンポーザーパネル本体 -->
<div
  class="column-composer-panel flex flex-col bg-base-200 border border-base-300 rounded-lg shadow-xl overflow-hidden"
  style="width: 22rem; max-width: min(22rem, calc(100vw - 1rem)); max-height: 32rem;"
  role="dialog"
  aria-label="ノート投稿"
>
  <!-- パネルヘッダー -->
  <div class="flex items-center justify-between px-3 py-2 bg-base-300 shrink-0">
    <div class="flex items-center gap-1.5">
      <!-- ペンアイコン -->
      <SquarePen class="w-3.5 h-3.5 text-primary" aria-hidden="true" />
      <span class="text-sm font-semibold text-base-content">
        {#if isChannelColumn && config.channelId}
          #{config.customName ?? config.channelName} に投稿
        {:else}
          ノートを投稿
        {/if}
      </span>
    </div>
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

  <!-- チャンネル表示バッジ (チャンネルカラムの場合) -->
  {#if isChannelColumn && config.channelId}
    <div class="flex items-center gap-1.5 px-3 py-1.5 bg-base-200 border-b border-base-300 shrink-0">
      <MessageSquare class="w-3 h-3 text-base-content/50" aria-hidden="true" />
      <span class="text-xs text-base-content/60 truncate">
        チャンネル: {config.customName ?? config.channelName}
      </span>
    </div>
  {/if}

  <!-- InlineComposer -->
  <div class="flex-1 overflow-y-auto">
    <InlineComposer
      {runtime}
      channelId={initialChannelId}
      defaultVisibility={initialVisibility}
      defaultLocalOnly={initialLocalOnly}
      reactionDeck={config.reactionDeck}
      oncomplete={onclose}
      oncancel={onclose}
    />
  </div>
</div>
