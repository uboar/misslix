<script lang="ts">
  import twemoji from '@discordapp/twemoji';

  type Props = {
    name?: string;
    url?: string;
    emoji?: string;
    height?: string;
  };

  const { name, url, emoji, height = '1.5em' }: Props = $props();

  // Unicode絵文字の画像ロード失敗フラグ
  let emojiImgFailed = $state(false);

  function getTwemojiUrl(char: string): string {
    const codepoint = twemoji.convert.toCodePoint(char);
    return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codepoint}.svg`;
  }

  // emoji が変わったらフラグをリセット
  $effect(() => {
    emoji; // 依存
    emojiImgFailed = false;
  });
</script>

{#if url}
  <img
    src={url}
    alt={name ? `:${name}:` : ''}
    title={name ? `:${name}:` : ''}
    style="height: {height}; width: auto; vertical-align: middle; display: inline;"
  />
{:else if emoji}
  {#if emojiImgFailed}
    <!-- 画像ロード失敗時はUnicode文字をそのまま表示 -->
    <span
      aria-label={emoji}
      style="font-size: {height}; line-height: 1; vertical-align: middle; display: inline;"
    >{emoji}</span>
  {:else}
    <!-- twemojiはSVGで正方形なので width = height で展開防止 -->
    <img
      src={getTwemojiUrl(emoji)}
      alt={emoji}
      title={emoji}
      style="height: {height}; width: {height}; vertical-align: middle; display: inline;"
      onerror={() => { emojiImgFailed = true; }}
    />
  {/if}
{/if}
