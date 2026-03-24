<script lang="ts">
  import { presetStore } from '$lib/stores/presets.svelte';
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import { showToast } from '$lib/utils/error';

  type Props = {
    open: boolean;
    onclose: () => void;
    initialTab?: 'save' | 'load';
  };

  let { open, onclose, initialTab = 'load' }: Props = $props();

  let tab = $state<'save' | 'load'>(initialTab);

  $effect(() => {
    if (open) tab = initialTab;
  });
  let saveName = $state('');
  let confirmDeleteId = $state<string | null>(null);

  function handleSave() {
    const name = saveName.trim();
    if (!name) return;
    if (timelineStore.columns.length === 0) {
      showToast('保存するカラムがありません', 'warning');
      return;
    }
    presetStore.savePreset(name, timelineStore.columns);
    showToast(`プリセット「${name}」を保存しました`, 'success');
    saveName = '';
    tab = 'load';
  }

  function handleLoad(id: string) {
    const preset = presetStore.getPreset(id);
    if (!preset) return;
    // Assign new IDs to avoid conflicts
    const now = Date.now();
    const columns = preset.columns.map((col, i) => ({
      ...col,
      id: now + i,
    }));
    timelineStore.columns = columns;
    timelineStore.persist();
    showToast(`プリセット「${preset.name}」を読み込みました`, 'success');
    onclose();
  }

  function handleDelete(id: string) {
    const preset = presetStore.getPreset(id);
    if (!preset) return;
    presetStore.deletePreset(id);
    showToast(`プリセット「${preset.name}」を削除しました`, 'info');
    confirmDeleteId = null;
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <dialog
    class="modal modal-open"
    onkeydown={handleKeydown}
  >
    <div class="modal-box w-full max-w-md">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold">カラムプリセット</h3>
        <button class="btn btn-ghost btn-sm btn-circle" onclick={onclose} aria-label="閉じる">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <!-- タブ -->
      <div role="tablist" class="tabs tabs-bordered mb-4">
        <button
          role="tab"
          class="tab"
          class:tab-active={tab === 'load'}
          onclick={() => tab = 'load'}
        >
          呼び出し
        </button>
        <button
          role="tab"
          class="tab"
          class:tab-active={tab === 'save'}
          onclick={() => tab = 'save'}
        >
          保存
        </button>
      </div>

      {#if tab === 'save'}
        <!-- 保存タブ -->
        <div class="space-y-3">
          <p class="text-sm text-base-content/70">
            現在のカラム構成（{timelineStore.columns.length}件）をプリセットとして保存します。
          </p>
          <div class="flex gap-2">
            <input
              type="text"
              class="input input-bordered flex-1 input-sm"
              placeholder="プリセット名を入力..."
              bind:value={saveName}
              onkeydown={(e) => e.key === 'Enter' && handleSave()}
              maxlength={50}
            />
            <button
              class="btn btn-primary btn-sm"
              onclick={handleSave}
              disabled={!saveName.trim() || timelineStore.columns.length === 0}
            >
              保存
            </button>
          </div>
        </div>
      {:else}
        <!-- 呼び出しタブ -->
        {#if presetStore.presets.length === 0}
          <p class="text-sm text-base-content/50 text-center py-8">
            保存されたプリセットはありません
          </p>
        {:else}
          <ul class="space-y-2 max-h-80 overflow-y-auto">
            {#each presetStore.presets as preset (preset.id)}
              <li class="flex items-center gap-2 p-2 rounded-lg bg-base-200">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{preset.name}</p>
                  <p class="text-xs text-base-content/50">
                    {preset.columns.length}カラム · {formatDate(preset.createdAt)}
                  </p>
                </div>
                {#if confirmDeleteId === preset.id}
                  <button
                    class="btn btn-error btn-xs"
                    onclick={() => handleDelete(preset.id)}
                  >
                    削除確認
                  </button>
                  <button
                    class="btn btn-ghost btn-xs"
                    onclick={() => confirmDeleteId = null}
                  >
                    キャンセル
                  </button>
                {:else}
                  <button
                    class="btn btn-primary btn-xs"
                    onclick={() => handleLoad(preset.id)}
                  >
                    読込
                  </button>
                  <button
                    class="btn btn-ghost btn-xs text-error"
                    onclick={() => confirmDeleteId = preset.id}
                    aria-label="削除"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </div>
    <button class="modal-backdrop" onclick={onclose} aria-label="閉じる"></button>
  </dialog>
{/if}
