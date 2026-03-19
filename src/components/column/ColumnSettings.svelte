<script lang="ts">
  import type { ColumnConfig, ColumnWidth, NoteDisplayConfig } from '$lib/types';
  import { timelineStore } from '$lib/stores/timelines.svelte';

  type Props = {
    config: ColumnConfig;
    onclose: () => void;
  };

  let { config, onclose }: Props = $props();

  // ローカル編集用コピー
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

  function save() {
    const reactionDeck = reactionDeckText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

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

    <div class="form-control">
      <label class="label cursor-pointer py-1" for="col-auto-collapse">
        <span class="label-text">自動折り畳み</span>
        <input
          id="col-auto-collapse"
          type="checkbox"
          class="toggle toggle-sm toggle-primary"
          bind:checked={autoCollapse}
        />
      </label>
    </div>

    <div class="form-control">
      <label class="label cursor-pointer py-1" for="col-low-rate">
        <span class="label-text">低レートモード (Misskey.io向け)</span>
        <input
          id="col-low-rate"
          type="checkbox"
          class="toggle toggle-sm toggle-primary"
          bind:checked={lowRate}
        />
      </label>
    </div>
  </section>

  <div class="divider my-1"></div>

  <!-- ノート表示 -->
  <section class="space-y-3">
    <h5 class="font-semibold text-base-content/70 uppercase text-xs tracking-wide">ノート表示</h5>

    <div class="form-control">
      <label class="label cursor-pointer py-1" for="col-media-hidden">
        <span class="label-text">メディアを非表示</span>
        <input id="col-media-hidden" type="checkbox" class="toggle toggle-sm" bind:checked={mediaHidden} />
      </label>
    </div>

    {#if !mediaHidden}
      <div class="form-control pl-4">
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

    <div class="form-control">
      <label class="label cursor-pointer py-1" for="col-reactions-hidden">
        <span class="label-text">リアクションを非表示</span>
        <input id="col-reactions-hidden" type="checkbox" class="toggle toggle-sm" bind:checked={reactionsHidden} />
      </label>
    </div>

    {#if !reactionsHidden}
      <div class="form-control pl-4">
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

    <div class="form-control">
      <label class="label cursor-pointer py-1" for="col-cw-expanded">
        <span class="label-text">CWを自動展開</span>
        <input id="col-cw-expanded" type="checkbox" class="toggle toggle-sm" bind:checked={cwExpanded} />
      </label>
    </div>

    <div class="form-control">
      <label class="label cursor-pointer py-1" for="col-nsfw-shown">
        <span class="label-text">NSFWコンテンツを表示</span>
        <input id="col-nsfw-shown" type="checkbox" class="toggle toggle-sm" bind:checked={nsfwShown} />
      </label>
    </div>

    <div class="form-control">
      <label class="label cursor-pointer py-1" for="col-collapse-enabled">
        <span class="label-text">長いノートを折り畳む</span>
        <input id="col-collapse-enabled" type="checkbox" class="toggle toggle-sm" bind:checked={collapseEnabled} />
      </label>
    </div>

    {#if collapseEnabled}
      <div class="form-control pl-4">
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
  </section>

  <div class="divider my-1"></div>

  <!-- リアクションデッキ -->
  <section>
    <h5 class="font-semibold text-base-content/70 uppercase text-xs tracking-wide mb-2">リアクションデッキ</h5>
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
  </section>

  <!-- 操作ボタン -->
  <div class="flex gap-2 pt-2">
    <button class="btn btn-primary btn-sm flex-1" onclick={save}>保存</button>
    <button class="btn btn-ghost btn-sm" onclick={onclose}>キャンセル</button>
  </div>
</div>
