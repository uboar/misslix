<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte';
  import { RefreshCw, X, Sparkles, ExternalLink } from 'lucide-svelte';

  const GITHUB_RELEASES_URL = 'https://github.com/uboar/misslix/releases';

  const { needRefresh, updateServiceWorker } = useRegisterSW();

  function update() {
    updateServiceWorker(true);
  }

  function dismiss() {
    needRefresh.set(false);
  }
</script>

{#if $needRefresh}
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <!-- Modal -->
    <div class="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
      <!-- Accent bar -->
      <div class="h-1.5 w-full bg-gradient-to-r from-primary via-secondary to-accent"></div>

      <!-- Close button -->
      <button
        class="absolute top-3 right-3 btn btn-ghost btn-xs btn-square"
        onclick={dismiss}
        aria-label="閉じる"
      >
        <X size={14} />
      </button>

      <div class="p-6 pt-5">
        <!-- Icon + heading -->
        <div class="flex items-center gap-3 mb-3">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <Sparkles size={20} />
          </div>
          <div>
            <p class="font-bold text-base text-base-content">アップデートが利用可能</p>
            <p class="text-xs text-base-content/60">新しいバージョンの MissLIX が準備できました</p>
          </div>
        </div>

        <!-- Release notes link -->
        <a
          href={GITHUB_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 text-xs text-primary hover:underline mb-5"
        >
          <ExternalLink size={12} />
          リリースノートを確認する
        </a>

        <!-- Actions -->
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm flex-1" onclick={dismiss}>
            後で
          </button>
          <button class="btn btn-primary btn-sm flex-1 gap-1.5" onclick={update}>
            <RefreshCw size={14} />
            今すぐ更新
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.93);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
