<script lang="ts">
  type Props = {
    url?: string | null;
    size?: string;
    alt?: string;
    class?: string;
  };

  let { url, size = '2rem', alt = '', class: extraClass = '' }: Props = $props();

  // フォールバック: アバターURLがない場合のプレースホルダー
  const fallbackUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23888'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M20 21a8 8 0 1 0-16 0'/%3E%3C/svg%3E`;
</script>

<img
  src={url ?? fallbackUrl}
  {alt}
  loading="lazy"
  decoding="async"
  class="rounded-full object-cover shrink-0 bg-base-300 {extraClass}"
  style="width: {size}; height: {size};"
  onerror={(e) => {
    const img = e.currentTarget as HTMLImageElement;
    img.src = fallbackUrl;
  }}
/>
