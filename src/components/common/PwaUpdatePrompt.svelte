<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte';
  import { RefreshCw, X } from 'lucide-svelte';

  const { needRefresh, updateServiceWorker } = useRegisterSW();

  function update() {
    updateServiceWorker(true);
  }

  function dismiss() {
    needRefresh.set(false);
  }
</script>

{#if $needRefresh}
  <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-base-200 border border-base-300 rounded-xl shadow-lg px-4 py-3 text-sm">
    <span class="text-base-content/80">アップデートが利用可能です</span>
    <button class="btn btn-primary btn-xs gap-1" onclick={update}>
      <RefreshCw size={12} />
      更新
    </button>
    <button class="btn btn-ghost btn-xs btn-square" onclick={dismiss} aria-label="閉じる">
      <X size={14} />
    </button>
  </div>
{/if}
