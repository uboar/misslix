<script lang="ts">
  import twemoji from '@discordapp/twemoji';

  type Props = {
    name?: string;
    url?: string;
    emoji?: string;
    height?: string;
  };

  const { name, url, emoji, height = '1.5em' }: Props = $props();

  function getTwemojiUrl(char: string): string {
    const codepoint = twemoji.convert.toCodePoint(char);
    return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codepoint}.svg`;
  }
</script>

{#if url}
  <img
    src={url}
    alt={name ? `:${name}:` : ''}
    title={name ? `:${name}:` : ''}
    style="height: {height}; vertical-align: middle; display: inline;"
  />
{:else if emoji}
  <img
    src={getTwemojiUrl(emoji)}
    alt={emoji}
    title={emoji}
    style="height: {height}; vertical-align: middle; display: inline;"
  />
{/if}
