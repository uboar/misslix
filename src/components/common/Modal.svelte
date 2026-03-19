<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    open: boolean;
    onclose: () => void;
    title?: string;
    children: Snippet;
  };

  let { open, onclose, title, children }: Props = $props();

  let dialogEl = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (!dialogEl) return;
    if (open) {
      if (!dialogEl.open) dialogEl.showModal();
    } else {
      if (dialogEl.open) dialogEl.close();
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onclose();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl) {
      onclose();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialogEl}
  class="modal"
  onkeydown={handleKeydown}
  onclick={handleBackdropClick}
>
  <div class="modal-box max-h-[90vh] overflow-y-auto">
    {#if title}
      <h3 class="text-lg font-bold mb-4">{title}</h3>
    {/if}
    <button
      class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
      onclick={onclose}
      aria-label="閉じる"
    >
      ✕
    </button>
    {@render children()}
  </div>
</dialog>
