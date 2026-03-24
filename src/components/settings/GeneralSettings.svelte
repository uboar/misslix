<script lang="ts">
  import { settingsStore } from '$lib/stores/settings.svelte';

  const BUILTIN_THEMES = [
    'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'synthwave',
    'retro', 'cyberpunk', 'valentine', 'halloween', 'garden', 'forest', 'aqua',
    'lofi', 'pastel', 'fantasy', 'wireframe', 'luxury', 'dracula', 'cmyk',
    'autumn', 'business', 'acid', 'lemonade', 'night', 'coffee', 'winter',
    'dim', 'nord', 'sunset', 'caramellatte', 'abyss', 'silk',
  ] as const;

  const CUSTOM_THEME_VALUE = 'custom';

  let settings = $derived(settingsStore.settings);

  let customJsonInput = $state(settingsStore.settings.customThemeJson);
  let customJsonError = $state('');

  function onThemeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    settingsStore.update({ theme: value });
  }

  function validateAndApplyCustomJson() {
    const raw = customJsonInput.trim();
    if (!raw) {
      customJsonError = 'JSONを入力してください。';
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      // 最低限のバリデーション：少なくとも1つのCSS変数が含まれているか
      const hasVars = Object.keys(parsed).some(k => k.startsWith('--'));
      if (!hasVars) {
        customJsonError = 'daisyUI テーマのCSS変数（--color-* など）が見つかりません。';
        return;
      }
      customJsonError = '';
      settingsStore.update({ theme: CUSTOM_THEME_VALUE, customThemeJson: raw });
    } catch {
      customJsonError = 'JSONの形式が正しくありません。';
    }
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
      value={settings.theme === CUSTOM_THEME_VALUE ? CUSTOM_THEME_VALUE : settings.theme}
      onchange={onThemeChange}
    >
      {#each BUILTIN_THEMES as theme (theme)}
        <option value={theme}>{theme}</option>
      {/each}
      <option value={CUSTOM_THEME_VALUE}>カスタム（JSON）</option>
    </select>
  </div>

  <!-- カスタムテーマJSON入力（カスタム選択時のみ表示） -->
  {#if settings.theme === CUSTOM_THEME_VALUE}
    <div class="form-control">
      <label class="label" for="custom-theme-json">
        <span class="label-text font-medium">カスタムテーマ JSON</span>
      </label>
      <!-- テーマクリエイター誘導バナー -->
      <div class="alert alert-info mb-2 py-2 px-3 text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
        </svg>
        <span>
          <a
            href="https://daisyui.com/theme-generator"
            target="_blank"
            rel="noopener noreferrer"
            class="link link-hover font-medium"
          >daisyUI テーマクリエイター</a>
          でテーマを作成し、「Export as JSON」でコピーして貼り付けてください。
        </span>
      </div>
      <textarea
        id="custom-theme-json"
        class="textarea textarea-bordered w-full font-mono text-xs"
        rows={8}
        placeholder={`{\n  "color-scheme": "dark",\n  "--color-base-100": "oklch(20% 0.02 260)",\n  "--color-primary": "oklch(65% 0.2 270)",\n  ...\n}`}
        bind:value={customJsonInput}
      ></textarea>
      {#if customJsonError}
        <div class="label">
          <span class="label-text-alt text-error">{customJsonError}</span>
        </div>
      {/if}
      <button
        class="btn btn-primary btn-sm mt-2 w-full"
        onclick={validateAndApplyCustomJson}
      >
        テーマを適用
      </button>
    </div>
  {/if}

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
