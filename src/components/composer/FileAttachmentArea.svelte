<script lang="ts">
  import { Paperclip, X, FileIcon } from 'lucide-svelte';

  type Props = {
    files: File[];
    onchange: (files: File[]) => void;
    disabled?: boolean;
    maxFiles?: number;
  };

  let { files, onchange, disabled = false, maxFiles = 16 }: Props = $props();

  let fileInputEl = $state<HTMLInputElement | null>(null);
  let dragOver = $state(false);

  // ファイルごとのプレビューURL (image/* のみ)
  let previewUrls = $state<(string | null)[]>([]);

  $effect(() => {
    // 古い URL を解放
    previewUrls.forEach((url) => url && URL.revokeObjectURL(url));
    // 新しい URL を生成
    previewUrls = files.map((f) =>
      f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    );
    return () => {
      previewUrls.forEach((url) => url && URL.revokeObjectURL(url));
    };
  });

  function addFiles(newFiles: FileList | File[]) {
    const arr = Array.from(newFiles);
    const merged = [...files, ...arr].slice(0, maxFiles);
    onchange(merged);
  }

  function removeFile(index: number) {
    onchange(files.filter((_, i) => i !== index));
  }

  function handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      addFiles(input.files);
    }
    input.value = '';
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (disabled) return;
    const dropped = e.dataTransfer?.files;
    if (dropped && dropped.length > 0) {
      addFiles(dropped);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
</script>

<!-- ファイル選択ボタン + ドロップゾーン -->
<div
  class="flex flex-col gap-2"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="region"
  aria-label="ファイル添付エリア"
>
  <!-- 添付ボタン -->
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="btn btn-ghost btn-xs gap-1 {dragOver ? 'btn-active' : ''}"
      title="ファイルを添付"
      onclick={() => fileInputEl?.click()}
      {disabled}
    >
      <Paperclip class="w-3.5 h-3.5" aria-hidden="true" />
      <span class="text-xs">添付</span>
    </button>
    {#if files.length > 0}
      <span class="text-xs text-base-content/50">{files.length}/{maxFiles}</span>
    {/if}
    {#if dragOver}
      <span class="text-xs text-primary">ドロップしてください</span>
    {/if}
  </div>

  <!-- 添付ファイルプレビュー -->
  {#if files.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each files as file, i (i)}
        <div class="relative group">
          {#if previewUrls[i]}
            <!-- 画像プレビュー -->
            <img
              src={previewUrls[i]}
              alt={file.name}
              class="w-16 h-16 object-cover rounded border border-base-300"
            />
          {:else}
            <!-- 非画像ファイル -->
            <div
              class="w-16 h-16 flex flex-col items-center justify-center rounded border border-base-300 bg-base-200 p-1"
              title={file.name}
            >
              <FileIcon class="w-5 h-5 text-base-content/50" aria-hidden="true" />
              <span class="text-[10px] text-base-content/50 text-center truncate w-full leading-tight mt-0.5">
                {file.name.split('.').pop()?.toUpperCase() ?? 'FILE'}
              </span>
              <span class="text-[9px] text-base-content/40">{formatSize(file.size)}</span>
            </div>
          {/if}
          <!-- 削除ボタン -->
          <button
            type="button"
            class="absolute -top-1.5 -right-1.5 btn btn-circle btn-error btn-xs opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 min-h-0 p-0"
            onclick={() => removeFile(i)}
            title="削除"
            aria-label="{file.name}を削除"
          >
            <X class="w-2.5 h-2.5" aria-hidden="true" />
          </button>
          <!-- ファイル名ツールチップ（ホバー時） -->
          <div class="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 pointer-events-none">
            <div class="bg-base-300 text-base-content text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap max-w-32 truncate shadow">
              {file.name}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- 非表示のファイル入力 -->
<input
  bind:this={fileInputEl}
  type="file"
  class="hidden"
  multiple
  {disabled}
  onchange={handleInputChange}
/>
