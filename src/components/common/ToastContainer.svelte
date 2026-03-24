<script lang="ts">
  import {
    type Toast,
    subscribeToasts,
    dismissToast,
  } from '$lib/utils/error';
  import { X } from 'lucide-svelte';

  let toasts = $state<Toast[]>([]);

  $effect(() => {
    const unsubscribe = subscribeToasts((t) => {
      toasts = t;
    });
    return unsubscribe;
  });

  const TOAST_CLASS: Record<string, string> = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error',
  };
</script>

{#if toasts.length > 0}
  <div class="toast toast-start toast-bottom z-[9999] pointer-events-none">
    {#each toasts as toast (toast.id)}
      <div
        class="alert {TOAST_CLASS[toast.type] ?? 'alert-info'} shadow-lg pointer-events-auto max-w-sm text-sm"
        role="alert"
      >
        <span class="flex-1 break-words">{toast.message}</span>
        <button
          class="btn btn-ghost btn-xs btn-square"
          onclick={() => dismissToast(toast.id)}
          aria-label="閉じる"
        >
          <X class="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
    {/each}
  </div>
{/if}
