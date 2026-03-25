<script lang="ts">
  import { Plus, Settings, Columns2 } from 'lucide-svelte';

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
      <Plus class="w-3.5 h-3.5" aria-hidden="true" />
      <span class="hidden sm:inline text-xs font-semibold">投稿</span>
    </button>

    <!-- カラム追加ボタン -->
    <button
      class="btn btn-ghost btn-sm gap-1.5 text-base-content/70 hover:text-base-content"
      onclick={onadd}
      aria-label="カラムを追加"
      title="カラムを追加"
    >
      <Columns2 class="w-4 h-4" aria-hidden="true" />

      <span class="hidden sm:inline text-xs">カラム追加</span>
    </button>

    <!-- 設定ボタン -->
    <button
      class="btn btn-ghost btn-sm btn-square text-base-content/70 hover:text-base-content"
      onclick={onsettings}
      aria-label="設定"
      title="設定"
    >
      <Settings class="w-4 h-4" aria-hidden="true" />
    </button>
  </div>
</header>
