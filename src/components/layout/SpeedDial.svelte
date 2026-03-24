<script lang="ts">
  import { Plus, Settings, Trash2, Save } from 'lucide-svelte';

  type Props = {
    onpost?: () => void;
    onadd?: () => void;
    onsettings?: () => void;
    onpreset?: () => void;
    onclearcolumns?: () => void;
  };

  let { onpost, onadd, onsettings, onpreset, onclearcolumns }: Props = $props();

  let open = $state(false);

  function toggle() {
    open = !open;
  }

  function handleAction(fn?: () => void) {
    open = false;
    fn?.();
  }

  function handleBackdropClick() {
    open = false;
  }
</script>

<!-- バックドロップ -->
{#if open}
  <button
    class="fixed inset-0 z-40"
    onclick={handleBackdropClick}
    aria-label="閉じる"
    tabindex="-1"
  ></button>
{/if}

<!-- Speed Dial -->
<!-- flex-col-reverse のため、HTML上の先頭が視覚的に最下部 (FAB寄り) になる -->
<!-- 視覚順: 設定 / 全クリア / プリセット / カラム追加 / 投稿 / [FAB] -->
<div class="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
  {#if open}
    <!-- 設定 (視覚的に最上部) -->
    <div class="flex items-center gap-2">
      <span class="bg-base-300 text-base-content text-xs px-2 py-1 rounded-lg shadow whitespace-nowrap select-none">設定</span>
      <button
        class="btn btn-circle btn-sm btn-ghost bg-base-200 shadow"
        onclick={() => handleAction(onsettings)}
        aria-label="設定"
      >
        <Settings class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>

    <!-- 全クリア -->
    <div class="flex items-center gap-2">
      <span class="bg-base-300 text-base-content text-xs px-2 py-1 rounded-lg shadow whitespace-nowrap select-none">全クリア</span>
      <button
        class="btn btn-circle btn-sm btn-ghost bg-base-200 shadow text-error"
        onclick={() => handleAction(onclearcolumns)}
        aria-label="全カラムをクリア"
      >
        <Trash2 class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>

    <!-- プリセット -->
    <div class="flex items-center gap-2">
      <span class="bg-base-300 text-base-content text-xs px-2 py-1 rounded-lg shadow whitespace-nowrap select-none">プリセット</span>
      <button
        class="btn btn-circle btn-sm btn-ghost bg-base-200 shadow"
        onclick={() => handleAction(onpreset)}
        aria-label="プリセット"
      >
        <Save class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>

    <!-- カラム追加 -->
    <div class="flex items-center gap-2">
      <span class="bg-base-300 text-base-content text-xs px-2 py-1 rounded-lg shadow whitespace-nowrap select-none">カラム追加</span>
      <button
        class="btn btn-circle btn-sm btn-ghost bg-base-200 shadow"
        onclick={() => handleAction(onadd)}
        aria-label="カラムを追加"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="3" width="7" height="18" rx="1" />
          <rect x="14" y="3" width="7" height="18" rx="1" />
          <path d="M17.5 7v10M12.5 12h10" stroke-width="1.5" />
        </svg>
      </button>
    </div>

    <!-- 投稿 (視覚的にFABの直上) -->
    <div class="flex items-center gap-2">
      <span class="bg-base-300 text-base-content text-xs px-2 py-1 rounded-lg shadow whitespace-nowrap select-none">投稿</span>
      <button
        class="btn btn-circle btn-sm btn-primary shadow"
        onclick={() => handleAction(onpost)}
        aria-label="新規投稿"
      >
        <Plus class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  {/if}

  <!-- メインFABボタン -->
  <button
    class="btn btn-circle btn-primary shadow-lg"
    class:rotate-45={open}
    onclick={toggle}
    aria-label={open ? '閉じる' : 'メニューを開く'}
    aria-expanded={open}
    style="transition: transform 0.2s ease;"
  >
    <Plus class="w-6 h-6" aria-hidden="true" />
  </button>
</div>
