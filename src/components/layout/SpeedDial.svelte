<script lang="ts">
  type Props = {
    onpost?: () => void;
    onadd?: () => void;
    onsettings?: () => void;
  };

  let { onpost, onadd, onsettings }: Props = $props();

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
<div class="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
  <!-- アクションボタン群 -->
  {#if open}
    <!-- 設定 -->
    <div class="flex items-center gap-2">
      <span class="bg-base-300 text-base-content text-xs px-2 py-1 rounded-lg shadow whitespace-nowrap select-none">設定</span>
      <button
        class="btn btn-circle btn-sm btn-ghost bg-base-200 shadow"
        onclick={() => handleAction(onsettings)}
        aria-label="設定"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
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

    <!-- 投稿 -->
    <div class="flex items-center gap-2">
      <span class="bg-base-300 text-base-content text-xs px-2 py-1 rounded-lg shadow whitespace-nowrap select-none">投稿</span>
      <button
        class="btn btn-circle btn-sm btn-primary shadow"
        onclick={() => handleAction(onpost)}
        aria-label="新規投稿"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
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
    <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke-linecap="round" />
    </svg>
  </button>
</div>
