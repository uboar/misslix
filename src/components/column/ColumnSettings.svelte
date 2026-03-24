<script lang="ts">
  import type { ColumnConfig, ColumnWidth, NoteDisplayConfig } from '$lib/types';
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import EmojiRenderer from '$lib/emoji/EmojiRenderer.svelte';

  type Props = {
    config: ColumnConfig;
    onclose: () => void;
    onremove?: () => void;
    emojis?: Record<string, string>;
  };

  let { config, onclose, onremove, emojis = {} }: Props = $props();

  // ローカル編集用コピー
  let customName = $state(config.customName ?? '');
  let width = $state<ColumnWidth>(config.width);
  let color = $state(config.color);
  let maxNotes = $state(config.maxNotes);
  let bufferSize = $state(config.bufferSize);
  let autoCollapse = $state(config.autoCollapse);
  let lowRate = $state(config.lowRate);
  let reactionDeckText = $state(config.reactionDeck.join(', '));

  // noteDisplay
  let mediaHidden = $state(config.noteDisplay.mediaHidden);
  let mediaSize = $state(config.noteDisplay.mediaSize);
  let reactionsHidden = $state(config.noteDisplay.reactionsHidden);
  let reactionSize = $state(config.noteDisplay.reactionSize);
  let cwExpanded = $state(config.noteDisplay.cwExpanded);
  let nsfwShown = $state(config.noteDisplay.nsfwShown);
  let collapseEnabled = $state(config.noteDisplay.collapseEnabled);
  let collapseHeight = $state(config.noteDisplay.collapseHeight);

  const WIDTH_OPTIONS: { value: ColumnWidth; label: string }[] = [
    { value: 'sm', label: 'sm (12rem)' },
    { value: 'md', label: 'md (24rem)' },
    { value: 'lg', label: 'lg (36rem)' },
    { value: 'xl', label: 'xl (48rem)' },
    { value: 'full', label: 'full (100vw)' },
  ];

  // リアクションデッキのパース済み配列
  const parsedDeck = $derived(
    reactionDeckText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  );

  function isCustomEmoji(reaction: string): boolean {
    return reaction.startsWith(':') && reaction.endsWith(':') && reaction.length > 2;
  }

  function getCustomEmojiName(reaction: string): string {
    return reaction.slice(1, -1).split('@')[0];
  }

  function getDeckEmojiUrl(reaction: string): string | null {
    if (!isCustomEmoji(reaction)) return null;
    const name = getCustomEmojiName(reaction);
    return emojis[name] ?? emojis[reaction] ?? null;
  }

  function save() {
    const reactionDeck = parsedDeck;

    const noteDisplay: NoteDisplayConfig = {
      mediaHidden,
      mediaSize,
      reactionsHidden,
      reactionSize,
      cwExpanded,
      nsfwShown,
      collapseEnabled,
      collapseHeight,
    };

    timelineStore.updateColumn(config.id, {
      customName: customName.trim() || undefined,
      width,
      color,
      maxNotes,
      bufferSize,
      autoCollapse,
      lowRate,
      reactionDeck,
      noteDisplay,
    });

    onclose();
  }
</script>

<div class="space-y-4 text-sm">
  <!-- 表示 -->
  <section class="space-y-3">
    <h5 class="font-semibold text-base-content/70 uppercase text-xs tracking-wide">表示</h5>

    <div class="form-control">
      <label class="label py-1" for="col-custom-name">
        <span class="label-text">カラム名</span>
      </label>
      <input
        id="col-custom-name"
        type="text"
        class="input input-bordered input-sm w-full"
        placeholder={config.channelName}
        bind:value={customName}
      />
    </div>

    <div class="form-control">
      <label class="label py-1" for="col-width">
        <span class="label-text">幅</span>
      </label>
      <select id="col-width" class="select select-bordered select-sm w-full" bind:value={width}>
        {#each WIDTH_OPTIONS as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>

    <div class="form-control">
      <label class="label py-1" for="col-color">
        <span class="label-text">アクセントカラー</span>
      </label>
      <div class="flex items-center gap-2">
        <input
          id="col-color"
          type="color"
          class="w-10 h-8 rounded border border-base-300 cursor-pointer bg-transparent"
          bind:value={color}
        />
        <span class="font-mono text-xs text-base-content/60">{color}</span>
      </div>
    </div>
  </section>

  <div class="divider my-1"></div>

  <!-- パフォーマンス -->
  <section class="space-y-3">
    <h5 class="font-semibold text-base-content/70 uppercase text-xs tracking-wide">パフォーマンス</h5>

    <div class="form-control">
      <label class="label py-1" for="col-max-notes">
        <span class="label-text">最大表示件数</span>
      </label>
      <input
        id="col-max-notes"
        type="number"
        class="input input-bordered input-sm w-full"
        min="10"
        max="1000"
        step="10"
        bind:value={maxNotes}
      />
    </div>

    <div class="form-control">
      <label class="label py-1" for="col-buffer">
        <span class="label-text">バッファサイズ</span>
      </label>
      <input
        id="col-buffer"
        type="number"
        class="input input-bordered input-sm w-full"
        min="50"
        max="2000"
        step="50"
        bind:value={bufferSize}
      />
    </div>

    <div class="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0">
      <label class="label-text py-1.5 cursor-pointer select-none" for="col-auto-collapse">自動折り畳み</label>
      <input
        id="col-auto-collapse"
        type="checkbox"
        class="toggle toggle-sm toggle-primary"
        bind:checked={autoCollapse}
      />

      <label class="label-text py-1.5 cursor-pointer select-none" for="col-low-rate">低レートモード (Misskey.io向け)</label>
      <input
        id="col-low-rate"
        type="checkbox"
        class="toggle toggle-sm toggle-primary"
        bind:checked={lowRate}
      />
    </div>
  </section>

  <div class="divider my-1"></div>

  <!-- ノート表示 -->
  <section class="space-y-3">
    <h5 class="font-semibold text-base-content/70 uppercase text-xs tracking-wide">ノート表示</h5>

    <!-- メディア -->
    <div class="space-y-1">
      <div class="grid grid-cols-[1fr_auto] items-center gap-x-3">
        <label class="label-text py-1.5 cursor-pointer select-none" for="col-media-hidden">メディアを非表示</label>
        <input id="col-media-hidden" type="checkbox" class="toggle toggle-sm" bind:checked={mediaHidden} />
      </div>
      {#if !mediaHidden}
        <div class="pl-4">
          <label class="label py-1" for="col-media-size">
            <span class="label-text text-base-content/70">メディアサイズ (px)</span>
          </label>
          <input
            id="col-media-size"
            type="number"
            class="input input-bordered input-sm w-full"
            min="50"
            max="800"
            step="10"
            bind:value={mediaSize}
          />
        </div>
      {/if}
    </div>

    <div class="divider my-0.5"></div>

    <!-- リアクション -->
    <div class="space-y-1">
      <div class="grid grid-cols-[1fr_auto] items-center gap-x-3">
        <label class="label-text py-1.5 cursor-pointer select-none" for="col-reactions-hidden">リアクションを非表示</label>
        <input id="col-reactions-hidden" type="checkbox" class="toggle toggle-sm" bind:checked={reactionsHidden} />
      </div>
      {#if !reactionsHidden}
        <div class="pl-4">
          <label class="label py-1" for="col-reaction-size">
            <span class="label-text text-base-content/70">リアクションサイズ (px)</span>
          </label>
          <input
            id="col-reaction-size"
            type="number"
            class="input input-bordered input-sm w-full"
            min="12"
            max="64"
            step="4"
            bind:value={reactionSize}
          />
        </div>
      {/if}
    </div>

    <div class="divider my-0.5"></div>

    <!-- その他 -->
    <div class="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0">
      <label class="label-text py-1.5 cursor-pointer select-none" for="col-cw-expanded">CWを自動展開</label>
      <input id="col-cw-expanded" type="checkbox" class="toggle toggle-sm" bind:checked={cwExpanded} />

      <label class="label-text py-1.5 cursor-pointer select-none" for="col-nsfw-shown">NSFWコンテンツを表示</label>
      <input id="col-nsfw-shown" type="checkbox" class="toggle toggle-sm" bind:checked={nsfwShown} />

      <label class="label-text py-1.5 cursor-pointer select-none" for="col-collapse-enabled">長いノートを折り畳む</label>
      <input id="col-collapse-enabled" type="checkbox" class="toggle toggle-sm" bind:checked={collapseEnabled} />

      {#if collapseEnabled}
        <div class="col-span-2 pl-4 pt-1">
          <label class="label py-1" for="col-collapse-height">
            <span class="label-text text-base-content/70">折り畳み高さ (px)</span>
          </label>
          <input
            id="col-collapse-height"
            type="number"
            class="input input-bordered input-sm w-full"
            min="100"
            max="2000"
            step="50"
            bind:value={collapseHeight}
          />
        </div>
      {/if}
    </div>
  </section>

  <div class="divider my-1"></div>

  <!-- リアクションデッキ -->
  <section class="space-y-3">
    <h5 class="font-semibold text-base-content/70 uppercase text-xs tracking-wide">リアクションデッキ</h5>

    <div class="form-control">
      <label class="label py-1" for="col-reaction-deck">
        <span class="label-text">絵文字 (カンマ区切り)</span>
      </label>
      <input
        id="col-reaction-deck"
        type="text"
        class="input input-bordered input-sm w-full"
        placeholder=":like:, :misskey:, ..."
        bind:value={reactionDeckText}
      />
    </div>

    <!-- プレビュー -->
    {#if parsedDeck.length > 0}
      <div>
        <div class="text-[0.65rem] text-base-content/40 mb-1.5">プレビュー</div>
        <div class="flex flex-wrap gap-1">
          {#each parsedDeck as reaction}
            {@const url = getDeckEmojiUrl(reaction)}
            {@const name = isCustomEmoji(reaction) ? getCustomEmojiName(reaction) : null}
            <div
              class="flex items-center justify-center w-8 h-8 rounded border border-base-300 bg-base-200"
              title={reaction}
            >
              {#if url && name}
                <EmojiRenderer {name} {url} height="1.4em" />
              {:else if name}
                <span class="text-[0.55rem] leading-none truncate px-0.5 max-w-8 text-base-content/60">{name}</span>
              {:else}
                <EmojiRenderer emoji={reaction} height="1.4em" />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <!-- 操作ボタン -->
  <div class="flex gap-2 pt-2">
    <button class="btn btn-primary btn-sm flex-1" onclick={save}>保存</button>
    <button class="btn btn-ghost btn-sm" onclick={onclose}>キャンセル</button>
  </div>

  {#if onremove}
    <div class="divider my-1"></div>
    <div class="pt-1">
      <button class="btn btn-error btn-sm w-full" onclick={onremove}>このカラムを削除</button>
    </div>
  {/if}
</div>
