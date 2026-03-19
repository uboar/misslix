<script lang="ts">
  import type { ColumnConfig, AccountRuntime } from '$lib/types';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import NotificationPanel from '$components/notification/NotificationPanel.svelte';

  type Props = {
    config: ColumnConfig;
    runtime?: AccountRuntime;
  };

  let { config, runtime }: Props = $props();

  // 通知パネルの開閉状態
  let panelOpen = $state(false);

  // 通知パネルを囲む要素 (パネル外クリック検出用)
  let wrapperEl = $state<HTMLDivElement | null>(null);

  // 通知リスナーのセットアップ
  $effect(() => {
    if (!runtime) return;

    const conn = runtime.mainConnection;
    if (!conn) return;

    // misskey-js の ChannelConnection は EventEmitter 相当
    // 'notification' イベントをリッスンする
    function onNotification(notification: unknown) {
      if (!runtime) return;
      const buffer = settingsStore.settings.notificationBuffer;
      // 先頭に追加してバッファサイズ制御
      runtime.notifications = [
        notification as import('misskey-js').entities.Notification,
        ...runtime.notifications,
      ].slice(0, buffer);
      runtime.hasUnread = true;
    }

    // @ts-expect-error ChannelConnection の型定義が on() を持たない場合のフォールバック
    conn.on('notification', onNotification);

    return () => {
      // @ts-expect-error
      conn.off('notification', onNotification);
    };
  });

  // パネルを開く: 未読フラグをクリア
  function openPanel() {
    panelOpen = true;
    if (runtime) {
      runtime.hasUnread = false;
    }
  }

  function closePanel() {
    panelOpen = false;
  }

  function togglePanel() {
    if (panelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  // パネル外クリックで閉じる
  $effect(() => {
    if (!panelOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (wrapperEl && !wrapperEl.contains(e.target as Node)) {
        closePanel();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });
</script>

<!-- カラムフッター -->
<div
  class="column-footer shrink-0 flex items-center justify-between px-2 bg-base-200 border-t border-base-300 min-h-8"
  style="--accent: {config.color};"
>
  <!-- 左スロット: 通知ベルアイコン + 未読バッジ -->
  <div class="flex items-center gap-1" bind:this={wrapperEl}>
    {#if runtime}
      <!-- 通知パネルポップアップ (dropdown-top 相当) -->
      <div class="relative">
        <!-- ベルアイコンボタン -->
        <button
          class="btn btn-ghost btn-xs btn-square relative"
          onclick={togglePanel}
          aria-label="通知{runtime.hasUnread ? ' (未読あり)' : ''}"
          title="通知"
        >
          <svg class="w-3.5 h-3.5 text-base-content/70" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
          <!-- 未読インジケータ (赤い丸) -->
          {#if runtime.hasUnread}
            <span
              class="absolute top-0 right-0 w-2 h-2 rounded-full bg-error"
              aria-label="未読通知あり"
            ></span>
          {/if}
        </button>

        <!-- 通知パネル (上方向にポップアップ) -->
        {#if panelOpen}
          <div class="absolute bottom-full left-0 mb-1 z-50">
            <NotificationPanel {runtime} onclose={closePanel} />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- 右スロット: アクションボタン (Phase 5で接続済み) -->
  <div class="flex items-center gap-1">
    <!-- 将来の拡張用スロット -->
  </div>
</div>
