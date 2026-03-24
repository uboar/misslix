<script lang="ts">
  import { settingsStore } from '$lib/stores/settings.svelte';

  const THEMES = [
    'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'synthwave',
    'retro', 'cyberpunk', 'valentine', 'halloween', 'garden', 'forest', 'aqua',
    'lofi', 'pastel', 'fantasy', 'wireframe', 'luxury', 'dracula', 'cmyk',
    'autumn', 'business', 'acid', 'lemonade', 'night', 'coffee', 'winter',
    'dim', 'nord', 'sunset',
  ] as const;

  let settings = $derived(settingsStore.settings);

  function onThemeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    settingsStore.update({ theme: value });
    document.documentElement.setAttribute('data-theme', value);
  }

  function onEmojiSpaceChange(e: Event) {
    settingsStore.update({ emojiSpace: (e.target as HTMLInputElement).checked });
  }

  function onVirtualScrollChange(e: Event) {
    settingsStore.update({ virtualScroll: (e.target as HTMLInputElement).checked });
  }

  function onAutoFetchChange(e: Event) {
    settingsStore.update({ autoFetch: (e.target as HTMLInputElement).checked });
  }

  function onNotificationBufferChange(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(value) && value > 0) {
      settingsStore.update({ notificationBuffer: value });
    }
  }

  function onMediaDisplayModeChange(e: Event) {
    const value = (e.target as HTMLInputElement).checked ? 'grid' : 'carousel';
    settingsStore.update({ mediaDisplayMode: value as 'grid' | 'carousel' });
  }
</script>

<div class="space-y-5">
  <!-- テーマ選択 -->
  <div class="form-control">
    <label class="label" for="theme-select">
      <span class="label-text font-medium">テーマ</span>
    </label>
    <select
      id="theme-select"
      class="select select-bordered w-full"
      value={settings.theme}
      onchange={onThemeChange}
    >
      {#each THEMES as theme (theme)}
        <option value={theme}>{theme}</option>
      {/each}
    </select>
  </div>

  <div class="divider my-2"></div>

  <!-- 絵文字前後スペース -->
  <div class="form-control">
    <label class="label cursor-pointer" for="emoji-space-toggle">
      <span class="label-text">絵文字の前後にスペースを挿入</span>
      <input
        id="emoji-space-toggle"
        type="checkbox"
        class="toggle toggle-primary"
        checked={settings.emojiSpace}
        onchange={onEmojiSpaceChange}
      />
    </label>
  </div>

  <!-- バーチャルスクロール -->
  <div class="form-control">
    <label class="label cursor-pointer" for="virtual-scroll-toggle">
      <span class="label-text">バーチャルスクロール</span>
      <input
        id="virtual-scroll-toggle"
        type="checkbox"
        class="toggle toggle-primary"
        checked={settings.virtualScroll}
        onchange={onVirtualScrollChange}
      />
    </label>
  </div>

  <!-- 自動ノート読み込み -->
  <div class="form-control">
    <label class="label cursor-pointer" for="auto-fetch-toggle">
      <span class="label-text">自動ノート読み込み</span>
      <input
        id="auto-fetch-toggle"
        type="checkbox"
        class="toggle toggle-primary"
        checked={settings.autoFetch}
        onchange={onAutoFetchChange}
      />
    </label>
  </div>

  <!-- メディア表示モード -->
  <div class="form-control">
    <label class="label cursor-pointer" for="media-grid-toggle">
      <div class="flex flex-col gap-0.5">
        <span class="label-text">メディアをグリッド表示</span>
        <span class="text-[0.65rem] text-base-content/50">ONでX風のグリッド、OFFでカルーセル（従来）</span>
      </div>
      <input
        id="media-grid-toggle"
        type="checkbox"
        class="toggle toggle-primary"
        checked={settings.mediaDisplayMode !== 'carousel'}
        onchange={onMediaDisplayModeChange}
      />
    </label>
  </div>

  <div class="divider my-2"></div>

  <!-- 通知バッファサイズ -->
  <div class="form-control">
    <label class="label" for="notification-buffer-input">
      <span class="label-text font-medium">通知バッファサイズ</span>
      <span class="label-text-alt text-base-content/50">件</span>
    </label>
    <input
      id="notification-buffer-input"
      type="number"
      class="input input-bordered w-full"
      min="10"
      max="1000"
      step="10"
      value={settings.notificationBuffer}
      onchange={onNotificationBufferChange}
    />
  </div>
</div>
