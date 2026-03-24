<script lang="ts">
  import type { ColumnConfig, ChannelType } from '$lib/types';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import ColumnSettings from './ColumnSettings.svelte';
  import { GripVertical, Settings, ChevronLeft } from 'lucide-svelte';

  type Props = {
    config: ColumnConfig;
    onremove?: () => void;
    ontoggle?: () => void;
    ondragstart?: (e: DragEvent) => void;
    ondragend?: (e: DragEvent) => void;
    emojis?: Record<string, string>;
  };

  let { config, onremove, ontoggle, ondragstart, ondragend, emojis = {} }: Props = $props();

  const account = $derived(accountStore.findById(config.accountId));
  const accountLabel = $derived(
    account
      ? `@${account.userName}@${account.hostUrl.replace(/^https?:\/\//, '')}`
      : null
  );

  let settingsOpen = $state(false);

  const CHANNEL_ICONS: Record<ChannelType, string> = {
    homeTimeline: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    localTimeline: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    hybridTimeline: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9',
    globalTimeline: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064',
    channel: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
    antenna: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
    userList: 'M4 6h16M4 10h16M4 14h16M4 18h16',
    roleTimeline: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  };
</script>

<div class="column-header shrink-0 flex flex-col" style="--accent: {config.color};">
  <!-- アクセントカラーバー -->
  <div class="accent-bar h-[3px] w-full" style="background-color: {config.color};"></div>

  <!-- ヘッダー本体 -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flex items-center gap-1 px-2 py-1.5 bg-base-200 border-b border-base-300 min-h-9"
    draggable="true"
    ondragstart={ondragstart}
    ondragend={ondragend}
  >
    <!-- ドラッグハンドル -->
    <GripVertical class="w-3 h-3 shrink-0 opacity-30 cursor-grab active:cursor-grabbing" aria-hidden="true" />

    <!-- チャンネルアイコン -->
    <svg
      class="w-3.5 h-3.5 shrink-0 opacity-70"
      style="color: {config.color};"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={CHANNEL_ICONS[config.channel] ?? CHANNEL_ICONS.homeTimeline} />
    </svg>

    <!-- タイムライン名 (クリックで折り畳みトグル) -->
    <button
      class="flex-1 flex items-baseline gap-1 min-w-0 select-none text-left cursor-pointer hover:text-base-content"
      title={config.customName
        ? `${config.customName} (${config.channelName})${accountLabel ? ` — ${accountLabel}` : ''}`
        : `${config.channelName}${accountLabel ? ` — ${accountLabel}` : ''}`}
      onclick={ontoggle}
    >
      <span class="text-xs font-semibold truncate text-base-content/90 shrink-0 max-w-full">
        {config.customName || config.channelName}
      </span>
      {#if accountLabel}
        <span class="text-[10px] font-normal text-base-content/30 truncate min-w-0">
          {accountLabel}
        </span>
      {/if}
    </button>

    <!-- 設定ボタン -->
    <button
      class="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-base-content"
      onclick={() => (settingsOpen = !settingsOpen)}
      aria-label="カラム設定"
      title="カラム設定"
    >
      <Settings class="w-3 h-3" aria-hidden="true" />
    </button>

    <!-- 折り畳みトグルボタン -->
    <button
      class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content"
      onclick={ontoggle}
      aria-label={config.collapsed ? '展開' : '折り畳み'}
      title={config.collapsed ? '展開' : '折り畳み'}
    >
      <ChevronLeft class="w-3 h-3 transition-transform duration-200 {config.collapsed ? 'rotate-180' : ''}" aria-hidden="true" />
    </button>

  </div>

  <!-- カラム設定パネル (インラインドロップダウン) -->
  {#if settingsOpen}
    <div class="bg-base-100 border-b border-base-300 px-3 py-3 overflow-y-auto max-h-[80vh] shadow-lg z-10">
      <ColumnSettings {config} onclose={() => (settingsOpen = false)} {onremove} {emojis} />
    </div>
  {/if}
</div>
