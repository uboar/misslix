<script lang="ts">
  import { accountStore } from '$lib/stores/accounts.svelte';
  import { initAccountRuntime } from '$lib/api/client';
  import type { AccountRuntime } from '$lib/types';
  import { showApiError } from '$lib/utils/error';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import Navbar from './components/layout/Navbar.svelte';
  import ColumnContainer from './components/layout/ColumnContainer.svelte';
  import AddColumnModal from './components/column/AddColumnModal.svelte';
  import SettingsModal from './components/settings/SettingsModal.svelte';
  import PostModal from './components/composer/PostModal.svelte';
  import ToastContainer from './components/common/ToastContainer.svelte';

  // ── モーダル状態 ──
  let addColumnOpen = $state(false);
  let settingsOpen = $state(false);
  let postModalOpen = $state(false);

  // ── ランタイム管理 ──
  let runtimes = $state<Map<number, AccountRuntime>>(new Map());
  let initializing = $state(true);

  // 起動時アカウント復元・ランタイム初期化
  async function initRuntimes() {
    initializing = true;
    const accounts = accountStore.activeAccounts;
    const entries = await Promise.allSettled(
      accounts.map(async (account) => {
        const runtime = await initAccountRuntime(account);
        return [account.id, runtime] as const;
      })
    );
    const newMap = new Map<number, AccountRuntime>();
    for (let i = 0; i < entries.length; i++) {
      const result = entries[i];
      if (result.status === 'fulfilled') {
        newMap.set(result.value[0], result.value[1]);
      } else {
        showApiError(result.reason, `@${accounts[i].userName} の初期化`);
      }
    }
    runtimes = newMap;
    initializing = false;
  }

  // テーマ適用
  $effect(() => {
    document.documentElement.setAttribute('data-theme', settingsStore.theme);
  });

  // 初期化実行
  initRuntimes();
</script>

<div class="h-full flex flex-col bg-base-100 text-base-content">
  <Navbar
    onpost={() => postModalOpen = true}
    onadd={() => addColumnOpen = true}
    onsettings={() => settingsOpen = true}
  />

  {#if initializing && accountStore.accounts.length > 0}
    <main class="flex-1 flex items-center justify-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </main>
  {:else}
    <ColumnContainer onadd={() => addColumnOpen = true} {runtimes} />
  {/if}

  <AddColumnModal open={addColumnOpen} onclose={() => addColumnOpen = false} />
  <SettingsModal open={settingsOpen} onclose={() => settingsOpen = false} />
  <PostModal open={postModalOpen} onclose={() => postModalOpen = false} {runtimes} />
  <ToastContainer />
</div>
