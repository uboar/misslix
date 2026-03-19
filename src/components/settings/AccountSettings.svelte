<script lang="ts">
  import { accountStore } from '$lib/stores/accounts.svelte';
  import { clearCachedEmojiMap, clearAllCachedEmojiMaps } from '$lib/emoji/cache';

  let clearingId = $state<number | null>(null);
  let clearingAll = $state(false);
  let statusMessage = $state('');

  async function clearCache(id: number, hostUrl: string) {
    clearingId = id;
    statusMessage = '';
    try {
      await clearCachedEmojiMap(hostUrl);
      statusMessage = `${hostUrl} のキャッシュをクリアしました`;
    } catch (e) {
      statusMessage = 'キャッシュクリアに失敗しました';
    } finally {
      clearingId = null;
    }
  }

  async function clearAll() {
    clearingAll = true;
    statusMessage = '';
    try {
      await clearAllCachedEmojiMaps();
      statusMessage = '全アカウントのキャッシュをクリアしました';
    } catch (e) {
      statusMessage = 'キャッシュクリアに失敗しました';
    } finally {
      clearingAll = false;
    }
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h4 class="font-semibold">絵文字キャッシュ管理</h4>
    <button
      class="btn btn-sm btn-outline btn-warning"
      onclick={clearAll}
      disabled={clearingAll}
    >
      {#if clearingAll}
        <span class="loading loading-spinner loading-xs"></span>
      {/if}
      全キャッシュクリア
    </button>
  </div>

  {#if statusMessage}
    <div class="alert alert-success py-2 text-sm">
      <span>{statusMessage}</span>
    </div>
  {/if}

  {#if accountStore.accounts.length === 0}
    <p class="text-base-content/40 text-sm">アカウントがありません</p>
  {:else}
    <ul class="space-y-2">
      {#each accountStore.accounts as account (account.id)}
        <li class="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2">
          <div class="min-w-0">
            <span class="font-medium text-sm">@{account.userName}</span>
            <span class="text-base-content/50 text-xs ml-2 truncate">{account.hostUrl}</span>
          </div>
          <button
            class="btn btn-xs btn-outline shrink-0"
            onclick={() => clearCache(account.id, account.hostUrl)}
            disabled={clearingId === account.id}
          >
            {#if clearingId === account.id}
              <span class="loading loading-spinner loading-xs"></span>
            {/if}
            キャッシュクリア
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
