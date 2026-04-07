<script lang="ts">
  import type { AccountRuntime } from '$lib/types';
  import NotificationItem from './NotificationItem.svelte';
  import { X } from 'lucide-svelte';

  type Props = {
    runtime: AccountRuntime;
    onclose?: () => void;
    hideHeader?: boolean;
  };

  let { runtime, onclose, hideHeader = false }: Props = $props();
</script>

<!-- 通知パネル本体 -->
<div
  class="notification-panel flex flex-col bg-base-200 border border-base-300 rounded-lg shadow-xl overflow-hidden"
  style="width: 20rem; max-width: min(20rem, calc(100vw - 1rem)); max-height: 24rem;"
  role="dialog"
  aria-label="通知パネル"
>
  <!-- パネルヘッダー -->
  {#if !hideHeader}
    <div class="flex items-center justify-between px-3 py-2 bg-base-300 shrink-0">
      <span class="text-sm font-semibold text-base-content">通知</span>
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
  {/if}

  <!-- 通知リスト -->
  <div class="flex-1 overflow-y-auto">
    {#if runtime.notifState.notifications.length === 0}
      <div class="flex items-center justify-center h-20 text-base-content/40 text-sm">
        通知はありません
      </div>
    {:else}
      <ul class="divide-y divide-base-300">
        {#each runtime.notifState.notifications as notification (notification.id)}
          <NotificationItem {notification} {runtime} />
        {/each}
      </ul>
    {/if}
  </div>
</div>
