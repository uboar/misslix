import twemoji from '@discordapp/twemoji';

const TWEMOJI_OPTIONS = {
  base: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/',
  folder: 'svg',
  ext: '.svg',
  className: 'emoji',
  attributes: (_icon: string, _variant: string) => ({ style: 'height:1em;width:1em;vertical-align:-0.1em;display:inline;' }),
};

const SKIP_TAGS = new Set(['INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE', 'IMG', 'SVG', 'CODE']);

function processNode(node: Node): void {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (!SKIP_TAGS.has(el.tagName)) {
    twemoji.parse(el as HTMLElement, TWEMOJI_OPTIONS);
  }
}

export function setupGlobalTwemoji(): void {
  twemoji.parse(document.body, TWEMOJI_OPTIONS);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        processNode(node);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
