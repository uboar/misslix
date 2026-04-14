<script lang="ts">
  import type { entities } from 'misskey-js';
  import EmojiPickerPopup from '$components/composer/EmojiPickerPopup.svelte';

  type EmojiDetailed = entities.EmojiDetailed;

  type Props = {
    deck: string[];
    emojis: Record<string, string>;
    accountEmojis: EmojiDetailed[];
    onselect: (reaction: string) => void;
    onclose: () => void;
    positionStyle?: string;
    timelineId?: number;
  };

  const { deck, emojis, accountEmojis, onselect, onclose, positionStyle = '', timelineId }: Props = $props();

  // EmojiPickerPopup は bare name (カスタム) または Unicode 文字を渡す。
  // ReactionButton が期待する形式に変換: カスタム絵文字は :name: 形式、Unicode はそのまま。
  function handlePickerSelect(nameOrChar: string) {
    const isUnicode = /[^\x00-\x7F]/.test(nameOrChar);
    onselect(isUnicode ? nameOrChar : `:${nameOrChar}:`);
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onclose();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="reaction-deck-backdrop fixed inset-0 z-40"
  onclick={handleBackdropClick}
>
  <div
    class="reaction-deck fixed z-50"
    style={positionStyle}
  >
    <EmojiPickerPopup
      {accountEmojis}
      {deck}
      {emojis}
      {timelineId}
      onselect={handlePickerSelect}
      onclose={onclose}
    />
  </div>
</div>
