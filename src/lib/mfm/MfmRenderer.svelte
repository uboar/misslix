<script lang="ts">
  import type { MfmNode } from 'mfm-js';
  import { parseMfm, parseMfmPlain } from './parser.js';
  import EmojiRenderer from '../emoji/EmojiRenderer.svelte';

  type Props = {
    text: string;
    emojis?: Record<string, string>;
    emojiHeight?: string;
    isInline?: boolean;
  };

  const {
    text,
    emojis = {},
    emojiHeight = '1.5em',
    isInline = false,
  }: Props = $props();

  const nodes = $derived(
    isInline
      ? (parseMfmPlain(text) as MfmNode[])
      : parseMfm(text),
  );

  // MFM fn ノードのスタイルを計算する
  function getFnStyle(name: string, args: Record<string, string | true>): string {
    switch (name) {
      case 'x2':
        return 'font-size: 2em;';
      case 'x3':
        return 'font-size: 3em;';
      case 'x4':
        return 'font-size: 4em;';
      case 'fg': {
        const color = args['color'];
        return color && color !== true ? `color: #${color};` : '';
      }
      case 'bg': {
        const color = args['color'];
        return color && color !== true ? `background-color: #${color};` : '';
      }
      case 'rotate': {
        const deg = args['deg'];
        return deg && deg !== true ? `transform: rotate(${deg}deg); display: inline-block;` : '';
      }
      case 'flip': {
        const v = 'v' in args;
        const h = 'h' in args;
        if (v && h) return 'transform: scale(-1, -1); display: inline-block;';
        if (v) return 'transform: scaleY(-1); display: inline-block;';
        return 'transform: scaleX(-1); display: inline-block;';
      }
      case 'font': {
        if ('serif' in args) return 'font-family: serif;';
        if ('monospace' in args) return 'font-family: monospace;';
        if ('cursive' in args) return 'font-family: cursive;';
        if ('fantasy' in args) return 'font-family: fantasy;';
        if ('emoji' in args) return 'font-family: emoji;';
        if ('math' in args) return 'font-family: math;';
        return '';
      }
      default:
        return '';
    }
  }

  function isFnBlur(name: string): boolean {
    return name === 'blur';
  }

  function textToHtml(t: string): string {
    return t
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
</script>

{#snippet renderNodes(nodeList: MfmNode[])}
  {#each nodeList as node}
    {@render renderNode(node)}
  {/each}
{/snippet}

{#snippet renderNode(node: MfmNode)}
  {#if node.type === 'text'}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html textToHtml(node.props.text)}
  {:else if node.type === 'plain'}
    {#each node.children as child}{@render renderNode(child)}{/each}
  {:else if node.type === 'bold'}
    <strong>{#each node.children as child}{@render renderNode(child)}{/each}</strong>
  {:else if node.type === 'italic'}
    <em>{#each node.children as child}{@render renderNode(child)}{/each}</em>
  {:else if node.type === 'strike'}
    <del>{#each node.children as child}{@render renderNode(child)}{/each}</del>
  {:else if node.type === 'small'}
    <small style="opacity: 0.7;">{#each node.children as child}{@render renderNode(child)}{/each}</small>
  {:else if node.type === 'center'}
    <div style="text-align: center;">{#each node.children as child}{@render renderNode(child)}{/each}</div>
  {:else if node.type === 'quote'}
    <blockquote class="border-l-4 border-base-content/30 pl-3 my-1 opacity-70">
      {#each node.children as child}{@render renderNode(child)}{/each}
    </blockquote>
  {:else if node.type === 'inlineCode'}
    <code class="bg-base-300 rounded px-1 font-mono text-sm">{node.props.code}</code>
  {:else if node.type === 'blockCode'}
    <pre class="bg-base-300 rounded p-3 my-2 overflow-x-auto font-mono text-sm whitespace-pre"><code>{node.props.code}</code></pre>
  {:else if node.type === 'mathInline'}
    <code class="bg-base-300 rounded px-1 font-mono text-sm">{node.props.formula}</code>
  {:else if node.type === 'mathBlock'}
    <pre class="bg-base-300 rounded p-3 my-2 font-mono text-sm whitespace-pre"><code>{node.props.formula}</code></pre>
  {:else if node.type === 'mention'}
    {@const host = node.props.host ?? ''}
    {@const user = node.props.username}
    <a
      href={host ? `https://${host}/@${user}` : `/@${user}`}
      target="_blank"
      rel="noopener noreferrer"
      class="text-primary hover:underline"
    >@{user}{host ? `@${host}` : ''}</a>
  {:else if node.type === 'hashtag'}
    <a
      href={`/tags/${node.props.hashtag}`}
      class="text-primary hover:underline"
    >#{node.props.hashtag}</a>
  {:else if node.type === 'url'}
    <a
      href={node.props.url}
      target="_blank"
      rel="noopener noreferrer"
      class="text-primary hover:underline break-all"
    >{node.props.url}</a>
  {:else if node.type === 'link'}
    <a
      href={node.props.url}
      target="_blank"
      rel="noopener noreferrer"
      class="text-primary hover:underline"
    >{#each node.children as child}{@render renderNode(child)}{/each}</a>
  {:else if node.type === 'emojiCode'}
    {@const emojiUrl = emojis[node.props.name]}
    {#if emojiUrl}
      <EmojiRenderer name={node.props.name} url={emojiUrl} height={emojiHeight} />
    {:else}
      <span>:{node.props.name}:</span>
    {/if}
  {:else if node.type === 'unicodeEmoji'}
    <EmojiRenderer emoji={node.props.emoji} height={emojiHeight} />
  {:else if node.type === 'search'}
    <span class="flex items-center gap-2 my-1">
      <span>{node.props.query}</span>
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent(node.props.query)}`}
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-xs btn-outline"
      >検索</a>
    </span>
  {:else if node.type === 'fn'}
    {@const fnStyle = getFnStyle(node.props.name, node.props.args)}
    {#if isFnBlur(node.props.name)}
      <span
        class="mfm-blur"
        style="filter: blur(6px); display: inline-block; cursor: pointer; transition: filter 0.2s;"
        role="button"
        tabindex="0"
        onclick={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
        onkeydown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLElement).style.filter = 'none'; }}
      >{#each node.children as child}{@render renderNode(child)}{/each}</span>
    {:else if fnStyle}
      <span style={fnStyle}>{#each node.children as child}{@render renderNode(child)}{/each}</span>
    {:else}
      {#each node.children as child}{@render renderNode(child)}{/each}
    {/if}
  {/if}
{/snippet}

<span class="mfm-root">{@render renderNodes(nodes)}</span>
