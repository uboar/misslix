<script lang="ts">
  import type { ColumnConfig } from '$lib/types';

  type Props = {
    config: ColumnConfig;
  };

  let { config }: Props = $props();
</script>

<!-- カラムフッター: Phase 5/6で通知・リプライ・リアクションボタンを追加 -->
<div
  class="column-footer shrink-0 flex items-center justify-between px-2 bg-base-200 border-t border-base-300 min-h-8"
  style="--accent: {config.color};"
>
  <!-- 左スロット: 通知インジケータ等 (Phase 6で接続) -->
  <div class="flex items-center gap-1">
    <!-- Phase 6: 未読通知バッジをここに表示 -->
  </div>

  <!-- 右スロット: アクションボタン (Phase 5で接続) -->
  <div class="flex items-center gap-1">
    <!-- Phase 5: リプライ・リアクションボタンをここに追加 -->
  </div>
</div>
