<script lang="ts">
  type Props = {
    onpost?: () => void;
    onadd?: () => void;
    onsettings?: () => void;
  };

  let { onpost, onadd, onsettings }: Props = $props();
</script>

<header class="navbar bg-base-200 border-b border-base-300 min-h-12 px-3 gap-2 shrink-0 z-50">
  <!-- ロゴ / タイトル -->
  <div class="flex-1 flex items-center gap-2">
    <div class="flex items-center gap-1.5">
      <!-- 独自ロゴマーク: 3カラムを表すアイコン -->
      <svg
        class="w-6 h-6 text-primary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="5" height="18" rx="1" />
        <rect x="9.5" y="3" width="5" height="18" rx="1" />
        <rect x="17" y="3" width="5" height="18" rx="1" />
      </svg>
      <span class="text-base font-extrabold tracking-tight text-base-content select-none">
        Miss<span class="text-primary">LIX</span>
      </span>
    </div>
  </div>

  <!-- ボタン群 -->
  <div class="flex items-center gap-1">
    <!-- 投稿ボタン -->
    <button
      class="btn btn-primary btn-sm gap-1.5"
      onclick={onpost}
      aria-label="新規投稿"
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span class="hidden sm:inline text-xs font-semibold">投稿</span>
    </button>

    <!-- カラム追加ボタン -->
    <button
      class="btn btn-ghost btn-sm gap-1.5 text-base-content/70 hover:text-base-content"
      onclick={onadd}
      aria-label="カラムを追加"
      title="カラムを追加"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="18" rx="1" />
        <path d="M17.5 7v10M12.5 12h10" stroke-width="1.5" />
      </svg>
      <span class="hidden sm:inline text-xs">カラム追加</span>
    </button>

    <!-- 設定ボタン -->
    <button
      class="btn btn-ghost btn-sm btn-square text-base-content/70 hover:text-base-content"
      onclick={onsettings}
      aria-label="設定"
      title="設定"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  </div>
</header>
