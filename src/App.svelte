<script lang="ts">
  import { accountStore } from '$lib/stores/accounts.svelte';
  import { initAccountRuntime } from '$lib/api/client';
  import type { AccountRuntime } from '$lib/types';
  import { showApiError } from '$lib/utils/error';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import SpeedDial from './components/layout/SpeedDial.svelte';
  import ColumnContainer from './components/layout/ColumnContainer.svelte';
  import AddColumnModal from './components/column/AddColumnModal.svelte';
  import PresetModal from './components/column/PresetModal.svelte';
  import SettingsModal from './components/settings/SettingsModal.svelte';
  import PostModal from './components/composer/PostModal.svelte';
  import ToastContainer from './components/common/ToastContainer.svelte';
  import PwaUpdatePrompt from './components/common/PwaUpdatePrompt.svelte';
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import { showToast } from '$lib/utils/error';

  // ── モーダル状態 ──
  let addColumnOpen = $state(false);
  let settingsOpen = $state(false);
  let postModalOpen = $state(false);
  let presetModalOpen = $state(false);
  let clearConfirmOpen = $state(false);

  function executeClearColumns() {
    timelineStore.columns = [];
    timelineStore.persist();
    showToast('全カラムをクリアしました', 'info');
    clearConfirmOpen = false;
  }

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
    const theme = settingsStore.theme;
    const customJson = settingsStore.settings.customThemeJson;

    if (theme === 'custom' && customJson) {
      try {
        let vars: Record<string, string> = {};

        if (customJson.trim().includes('{')) {
          // CSS形式: @plugin "daisyui/theme" { ... } または { ... }
          const blockMatch = customJson.match(/\{([\s\S]+)\}/);
          if (blockMatch) {
            for (const line of blockMatch[1].split(/[\n;]/)) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              const colonIdx = trimmed.indexOf(':');
              if (colonIdx === -1) continue;
              const key = trimmed.slice(0, colonIdx).trim();
              const value = trimmed.slice(colonIdx + 1).trim();
              if (key && value) vars[key] = value;
            }
          }
        } else {
          // JSON形式（後方互換）
          vars = JSON.parse(customJson) as Record<string, string>;
        }

        const root = document.documentElement;
        root.setAttribute('data-theme', 'custom');
        if (vars['color-scheme']) {
          root.style.setProperty('color-scheme', vars['color-scheme']);
        }
        for (const [key, value] of Object.entries(vars)) {
          if (key.startsWith('--')) {
            root.style.setProperty(key, value);
          }
        }
      } catch {
        // パースエラー時はフォールバック
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } else {
      // light/dark および組み込みテーマはカスタム変数をリセット
      const root = document.documentElement;
      root.style.removeProperty('color-scheme');
      // 以前に設定したカスタムCSS変数をクリア
      const style = root.style;
      const toRemove: string[] = [];
      for (let i = 0; i < style.length; i++) {
        const prop = style.item(i);
        if (prop.startsWith('--color-') || prop.startsWith('--radius-') || prop.startsWith('--size-') || prop.startsWith('--border') || prop.startsWith('--depth') || prop.startsWith('--noise')) {
          toRemove.push(prop);
        }
      }
      for (const prop of toRemove) {
        root.style.removeProperty(prop);
      }
      root.setAttribute('data-theme', theme);
    }
  });

  // 初期化実行
  initRuntimes();
</script>

<div class="h-full flex flex-col bg-base-100 text-base-content">
  {#if initializing && accountStore.accounts.length > 0}
    <main class="flex-1 flex items-center justify-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </main>
  {:else}
    <ColumnContainer onadd={() => addColumnOpen = true} {runtimes} />
  {/if}

  <SpeedDial
    onpost={() => postModalOpen = true}
    onadd={() => addColumnOpen = true}
    onsettings={() => settingsOpen = true}
    onpreset={() => presetModalOpen = true}
    onclearcolumns={() => clearConfirmOpen = true}
  />

  <AddColumnModal open={addColumnOpen} onclose={() => addColumnOpen = false} {runtimes} />
  <PresetModal open={presetModalOpen} onclose={() => presetModalOpen = false} />
  <SettingsModal open={settingsOpen} onclose={() => settingsOpen = false} />
  <PostModal open={postModalOpen} onclose={() => postModalOpen = false} {runtimes} />
  <!-- 全クリア確認モーダル -->
  {#if clearConfirmOpen}
    <dialog class="modal modal-open">
      <div class="modal-box max-w-sm">
        <h3 class="text-lg font-bold mb-2">全カラムをクリア</h3>
        <p class="text-sm text-base-content/70 mb-4">すべてのカラムを削除します。この操作は元に戻せません。</p>
        <div class="modal-action">
          <button class="btn btn-ghost" onclick={() => clearConfirmOpen = false}>キャンセル</button>
          <button class="btn btn-error" onclick={executeClearColumns}>削除する</button>
        </div>
      </div>
      <button class="modal-backdrop" onclick={() => clearConfirmOpen = false} aria-label="閉じる"></button>
    </dialog>
  {/if}

  <ToastContainer />
  <PwaUpdatePrompt />
</div>
