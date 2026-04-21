import { type ColumnConfig, DEFAULT_NOTE_DISPLAY, DEFAULT_FETCH_OPTIONS } from '$lib/types';
import { loadFromStorage, saveToStorage } from '$lib/utils/storage';
import { migrateColumns } from '$lib/utils/migration';

const STORAGE_KEY = 'timelines';

class TimelineStore {
  columns = $state<ColumnConfig[]>([]);

  constructor() {
    this.restore();
  }

  restore() {
    this.columns = migrateColumns(loadFromStorage<unknown>(STORAGE_KEY, null));
  }

  persist() {
    saveToStorage(STORAGE_KEY, this.columns);
  }

  addColumn(column: ColumnConfig) {
    this.columns.push(column);
    this.persist();
  }

  removeColumn(id: number) {
    this.columns = this.columns.filter((c) => c.id !== id);
    this.persist();
  }

  updateColumn(id: number, partial: Partial<ColumnConfig>) {
    const idx = this.columns.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const current = this.columns[idx];
      const widthChanged = partial.width !== undefined && partial.width !== current.width;
      const customWidthProvided = Object.prototype.hasOwnProperty.call(partial, 'customWidth');
      const next = { ...current, ...partial };

      // 幅プリセットを変更した場合は、明示指定がない限りドラッグ幅を解除してプリセットを反映する。
      if (widthChanged && !customWidthProvided) {
        next.customWidth = undefined;
      }

      this.columns[idx] = next;
      this.persist();
    }
  }

  moveColumn(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= this.columns.length || toIndex >= this.columns.length) return;
    const [moved] = this.columns.splice(fromIndex, 1);
    this.columns.splice(toIndex, 0, moved);
    this.persist();
  }

  createDefaultColumn(
    accountId: number,
    channel: ColumnConfig['channel'],
    channelName: string,
    opts?: Partial<ColumnConfig>,
  ): ColumnConfig {
    return {
      id: Date.now(),
      accountId,
      channel,
      channelName,
      color: '#86b300',
      width: 'md',
      maxNotes: 100,
      bufferSize: 250,
      collapsed: false,
      autoCollapse: false,
      lowRate: false,
      reactionDeck: [],
      noteDisplay: { ...DEFAULT_NOTE_DISPLAY },
      fetchOptions: { ...DEFAULT_FETCH_OPTIONS },
      ...opts,
    };
  }
}

export const timelineStore = new TimelineStore();
