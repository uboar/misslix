<script lang="ts">
  type Props = {
    size?: 'xs' | 'sm' | 'md' | 'lg';
    class?: string;
  };

  let { size = 'sm', class: extraClass = '' }: Props = $props();

  const sizeMap: Record<string, string> = {
    xs: 'loading-xs',
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg',
  };

  const sizeClass = $derived(sizeMap[size] ?? 'loading-sm');
</script>

<span
  class="loading loading-spinner {sizeClass} text-base-content/40 {extraClass}"
  role="status"
  aria-label="読み込み中"
></span>
