<script lang="ts">
  import { onMount } from 'svelte';
  import type { ColumnConfig, AccountRuntime, MergeSourceDef } from '$lib/types';
  import { COLUMN_WIDTH_MAP } from '$lib/types';
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import { connectTimeline } from '$lib/api/streaming';
  import type { TimelineConnection, NoteUpdatedData } from '$lib/api/streaming';
  import { MergeNoteStore } from '$lib/stores/mergeNotes.svelte';
  import ColumnHeader from './ColumnHeader.svelte';
  import MergeColumnFooter from './MergeColumnFooter.svelte';
  import MergeNoteList from '../timeline/MergeNoteList.svelte';
  import ColumnSettings from './ColumnSettings.svelte';
  import { ChevronRight, X } from 'lucide-svelte';

  type Props = {
    config: ColumnConfig;
    runtimes: Map<number, AccountRuntime>;
    ondragstart?: (e: DragEvent) => void;
    ondragend?: (e: DragEvent) => void;
    ondragover?: (e: DragEvent) => void;
    ondragleave?: (e: DragEvent) => void;
    ondrop?: (e: DragEvent) => void;
    dropIndicator?: 'left' | 'right' | null;
  };

  let { config, runtimes, ondragstart, ondragend, ondragover, ondragleave, ondrop, dropIndicator = null }: Props = $props();

  // マージノートストア
  const mergeStore = new MergeNoteStore(config.maxNotes);

  // ソースカラム定義
  const sourceColumns = $derived(config.sourceColumns ?? []);

  // タイムライン共通のリアクション・投稿アカウント
  const firstAccountId = $derived(sourceColumns[0]?.accountId);
  let selectedAccountId = $state<number | undefined>(undefined);
  const effectiveSelectedAccountId = $derived(
    selectedAccountId !== undefined ? selectedAccountId : firstAccountId
  );

  // 全ソースのアカウントuserIdリスト (リアクション判定用)
  const accountUserIds = $derived(
    sourceColumns
      .map(s => runtimes.get(s.accountId)?.userId)
      .filter((id): id is string => !!id)
  );

  // NoteList参照
  let noteList = $state<ReturnType<typeof MergeNoteList> | null>(null);

  // 設定パネル
  let settingsOpen = $state(false);

  // 折り畳み状態
  let collapsed = $derived(config.collapsed);
  const COLLAPSED_WIDTH = '3rem';
  const MIN_WIDTH_PX = 128;

  let columnWidth = $derived(
    collapsed
      ? COLLAPSED_WIDTH
      : config.customWidth != null
        ? `${config.customWidth}px`
        : COLUMN_WIDTH_MAP[config.width]
  );

  /** HEX背景色に対してコントラストの取れるテキスト色を返す */
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

  const collapsedTextColor = $derived(getContrastTextColor(config.color));

  // ─── リサイズ処理 ───
  let isResizing = $state(false);
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  function handleResizePointerDown(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeStartX = e.clientX;
    const el = (e.currentTarget as HTMLElement).parentElement!;
    resizeStartWidth = el.getBoundingClientRect().width;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleResizePointerMove(e: PointerEvent) {
    if (!isResizing) return;
    const dx = e.clientX - resizeStartX;
    const newWidth = Math.max(MIN_WIDTH_PX, resizeStartWidth + dx);
    timelineStore.updateColumn(config.id, { customWidth: Math.round(newWidth) });
  }

  function handleResizePointerUp(e: PointerEvent) {
    if (!isResizing) return;
    isResizing = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  // ドラッグ制御
  let wasDragged = $state(false);

  function handleDragStartWrapper(e: DragEvent) {
    wasDragged = false;
    ondragstart?.(e);
  }

  function handleDragEndWrapper(e: DragEvent) {
    wasDragged = true;
    ondragend?.(e);
    setTimeout(() => { wasDragged = false; }, 0);
  }

  function handleToggle() {
    if (wasDragged) return;
    timelineStore.updateColumn(config.id, { collapsed: !config.collapsed });
  }

  function handleRemove() {
    timelineStore.removeColumn(config.id);
  }

  // ソースラベル生成
  function getSourceLabel(source: MergeSourceDef): string {
    const account = accountStore.findById(source.accountId);
    const host = account?.hostUrl?.replace(/^https?:\/\//, '') ?? '?';
    return `${source.channelName}@${host}`;
  }

  function getAccountHostUrl(source: MergeSourceDef): string {
    return accountStore.findById(source.accountId)?.hostUrl ?? '';
  }

  // ─── ストリーミング接続管理 ───
  let connections = $state<TimelineConnection[]>([]);

  $effect(() => {
    if (collapsed) return;

    const newConnections: TimelineConnection[] = [];

    for (const source of sourceColumns) {
      const runtime = runtimes.get(source.accountId);
      if (!runtime) continue;
      if (source.channel === 'mergeTimeline') continue;

      // ソース用の仮ColumnConfig構築
      const sourceConfig: ColumnConfig = {
        ...config,
        accountId: source.accountId,
        channel: source.channel,
        channelId: source.channelId,
        channelName: source.channelName,
      };

      const label = getSourceLabel(source);
      const hostUrl = getAccountHostUrl(source);

      const conn = connectTimeline(runtime, sourceConfig, {
        onNote(note) {
          const added = mergeStore.addNote(note, label, source.accountId, source.color, hostUrl);
          if (added) {
            conn.subNote(note.id);
          }
        },
        onNoteUpdated(data: NoteUpdatedData) {
          if (data.type === 'deleted') {
            mergeStore.removeNote(data.id);
          } else if (data.type === 'reacted') {
            const body = data.body as { reaction: string; emoji?: { name: string; url: string }; userId: string };
            mergeStore.applyReaction(data.id, body.reaction, body.emoji, body.userId, accountUserIds);
          } else if (data.type === 'unreacted') {
            const body = data.body as { reaction: string; userId: string };
            mergeStore.applyUnreaction(data.id, body.reaction, body.userId, accountUserIds);
          }
        },
      });

      newConnections.push(conn);
    }

    connections = newConnections;

    return () => {
      for (const conn of newConnections) conn.disconnect();
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="column flex flex-col h-full border-r border-base-300 bg-base-100 overflow-hidden shrink-0 relative"
  class:transition-all={!isResizing}
  class:duration-200={!isResizing}
  class:ease-in-out={!isResizing}
  class:opacity-50={dropIndicator !== null}
  style="width: {columnWidth}; min-width: {columnWidth};"
  role="region"
  aria-label={config.customName || 'マージタイムライン'}
  {ondragover}
  {ondragleave}
  {ondrop}
>
  {#if collapsed}
    <div class="flex flex-col items-center w-full h-full overflow-hidden" style="background-color: {config.color}; color: {collapsedTextColor};">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex flex-col items-center flex-1 py-2 gap-2 w-full overflow-hidden cursor-pointer transition-colors"
        style="background-color: {config.color};"
        draggable="true"
        ondragstart={handleDragStartWrapper}
        ondragend={handleDragEndWrapper}
        onclick={handleToggle}
        title="展開"
      >
        <ChevronRight class="w-3 h-3 shrink-0 opacity-70" aria-hidden="true" style="color: {collapsedTextColor};" />
        <div
          class="flex-1 flex items-center justify-center overflow-hidden"
          style="writing-mode: vertical-rl; text-orientation: mixed;"
        >
          <span
            class="text-xs font-semibold select-none truncate opacity-90"
            title={config.customName || 'マージTL'}
            style="max-height: 12rem; color: {collapsedTextColor};"
          >
            {config.customName || 'マージTL'}
          </span>
        </div>
        <button
          class="btn btn-ghost btn-xs btn-square opacity-50 hover:opacity-100"
          style="color: {collapsedTextColor};"
          onclick={(e) => { e.stopPropagation(); handleRemove(); }}
          aria-label="カラムを削除"
          title="カラムを削除"
        >
          <X class="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  {:else}
    <ColumnHeader {config} onremove={handleRemove} ontoggle={handleToggle} onrefresh={() => noteList?.refresh()} ondragstart={handleDragStartWrapper} ondragend={handleDragEndWrapper} onsettingstoggle={() => (settingsOpen = !settingsOpen)} />

    <MergeNoteList
      bind:this={noteList}
      store={mergeStore}
      {config}
      {runtimes}
      timelineAccountId={effectiveSelectedAccountId}
      onnotesloaded={(noteIds) => {
        for (const conn of connections) {
          for (const id of noteIds) {
            conn.subNote(id);
          }
        }
      }}
    />

    <MergeColumnFooter
      {config}
      {runtimes}
      selectedAccountId={effectiveSelectedAccountId}
      onselect={(id) => { selectedAccountId = id; }}
    />

    <!-- カラム設定パネル -->
    {#if settingsOpen}
      <div class="absolute inset-0 z-50 bg-base-100 overflow-y-auto flex flex-col">
        <ColumnSettings {config} onclose={() => (settingsOpen = false)} onremove={handleRemove} />
      </div>
    {/if}
  {/if}

  <!-- リサイズハンドル -->
  {#if !collapsed}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="resize-handle absolute top-0 right-0 w-2 h-full z-20 cursor-col-resize flex items-stretch"
      onpointerdown={handleResizePointerDown}
      onpointermove={handleResizePointerMove}
      onpointerup={handleResizePointerUp}
    >
      <div
        class="w-px ml-auto h-full transition-opacity duration-150 opacity-0 hover:opacity-50"
        class:opacity-80={isResizing}
        style="background-color: oklch(var(--p));"
      ></div>
    </div>
  {/if}
</div>
