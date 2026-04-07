<script lang="ts">
  import type { ColumnConfig, ChannelType } from '$lib/types';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import ColumnSettings from './ColumnSettings.svelte';
  import { GripVertical, Settings, ChevronLeft, CircleDotDashed, Globe, Home, Users, Hash, Radio, List, ShieldCheck, Layers, RefreshCw, UserRound } from 'lucide-svelte';

  type Props = {
    config: ColumnConfig;
    onremove?: () => void;
    ontoggle?: () => void;
    onrefresh?: () => void;
    ondragstart?: (e: DragEvent) => void;
    ondragend?: (e: DragEvent) => void;
    emojis?: Record<string, string>;
  };

  let { config, onremove, ontoggle, onrefresh, ondragstart, ondragend, emojis = {} }: Props = $props();

  const isMerge = $derived(config.channel === 'mergeTimeline');
  const account = $derived(isMerge ? null : accountStore.findById(config.accountId));
  const accountLabel = $derived(
    isMerge
      ? `${config.sourceColumns?.length ?? 0}個のソース`
      : account
        ? `@${account.userName}@${account.hostUrl.replace(/^https?:\/\//, '')}`
        : null
  );

  let settingsOpen = $state(false);

  /**
   * HEX カラー文字列から相対輝度を計算し、
   * 背景が明るければ暗いテキスト色、暗ければ明るいテキスト色を返す。
   * WCAG 基準の相対輝度 (0.179 を閾値) を使用。
   */
  function getContrastTextColor(hex: string): string {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return 'rgba(255,255,255,0.9)';
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance > 0.179 ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)';
  }

  const headerTextColor = $derived(getContrastTextColor(config.color));
  const headerBg = $derived(config.color);

</script>

<div class="column-header shrink-0 flex flex-col" style="--accent: {config.color};">
  <!-- ヘッダー本体 (アクセントカラーを背景に適用) -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flex items-stretch gap-1 px-2 min-h-9"
    style="background-color: {headerBg}; color: {headerTextColor};"
    draggable="true"
    ondragstart={ondragstart}
    ondragend={ondragend}
  >
    <!-- ドラッグハンドル -->
    <GripVertical class="w-3 h-3 shrink-0 opacity-40 cursor-grab active:cursor-grabbing self-center" aria-hidden="true" />

    <!-- チャンネルアイコン -->
    {#if config.channel === 'mergeTimeline'}
      <Layers class="w-3.5 h-3.5 shrink-0 opacity-80 self-center" aria-hidden="true" />
    {:else if config.channel === 'hybridTimeline'}
      <CircleDotDashed class="w-3.5 h-3.5 shrink-0 opacity-80 self-center" aria-hidden="true" />
    {:else if config.channel === 'globalTimeline'}
      <Globe class="w-3.5 h-3.5 shrink-0 opacity-80 self-center" aria-hidden="true" />
    {:else if config.channel === 'localTimeline'}
      <Users class="w-3.5 h-3.5 shrink-0 opacity-80 self-center" aria-hidden="true" />
    {:else if config.channel === 'channel'}
      <Hash class="w-3.5 h-3.5 shrink-0 opacity-80 self-center" aria-hidden="true" />
    {:else if config.channel === 'antenna'}
      <Radio class="w-3.5 h-3.5 shrink-0 opacity-80 self-center" aria-hidden="true" />
    {:else if config.channel === 'userList'}
      <List class="w-3.5 h-3.5 shrink-0 opacity-80 self-center" aria-hidden="true" />
    {:else if config.channel === 'roleTimeline'}
      <ShieldCheck class="w-3.5 h-3.5 shrink-0 opacity-80 self-center" aria-hidden="true" />
    {:else if config.channel === 'userTimeline'}
      <UserRound class="w-3.5 h-3.5 shrink-0 opacity-80 self-center" aria-hidden="true" />
    {:else}
      <Home class="w-3.5 h-3.5 shrink-0 opacity-80 self-center" aria-hidden="true" />
    {/if}

    <!-- タイムライン名 (クリックで折り畳みトグル) -->
    <button
      class="flex-1 flex items-baseline gap-1 min-w-0 select-none text-left cursor-pointer self-center py-1.5"
      style="color: {headerTextColor};"
      title={config.customName
        ? `${config.customName} (${config.channelName})${accountLabel ? ` — ${accountLabel}` : ''}`
        : `${config.channelName}${accountLabel ? ` — ${accountLabel}` : ''}`}
      onclick={ontoggle}
    >
      <span class="text-xs font-semibold truncate shrink-0 max-w-full" style="color: {headerTextColor};">
        {config.customName || config.channelName}
      </span>
      {#if accountLabel}
        <span class="text-[10px] font-normal truncate min-w-0 opacity-60">
          {accountLabel}
        </span>
      {/if}
    </button>

    <!-- 更新ボタン -->
    {#if onrefresh}
      <button
        class="flex items-center justify-center px-1.5 opacity-60 hover:opacity-100 transition-opacity"
        style="color: {headerTextColor};"
        onclick={onrefresh}
        aria-label="タイムラインを更新"
        title="タイムラインを更新"
      >
        <RefreshCw class="w-3 h-3" aria-hidden="true" />
      </button>
    {/if}

    <!-- 設定ボタン -->
    <button
      class="flex items-center justify-center px-1.5 opacity-60 hover:opacity-100 transition-opacity"
      style="color: {headerTextColor};"
      onclick={() => (settingsOpen = !settingsOpen)}
      aria-label="カラム設定"
      title="カラム設定"
    >
      <Settings class="w-3 h-3" aria-hidden="true" />
    </button>

    <!-- 折り畳みトグルボタン -->
    <button
      class="flex items-center justify-center px-1.5 opacity-60 hover:opacity-100 transition-opacity"
      style="color: {headerTextColor};"
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
