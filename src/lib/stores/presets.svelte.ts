import { type ColumnPreset } from '$lib/types';
import { loadFromStorage, saveToStorage } from '$lib/utils/storage';

const STORAGE_KEY = 'column_presets';

class PresetStore {
  presets = $state<ColumnPreset[]>([]);

  constructor() {
    this.restore();
  }

  restore() {
    this.presets = loadFromStorage<ColumnPreset[]>(STORAGE_KEY, []);
  }

  persist() {
    saveToStorage(STORAGE_KEY, this.presets);
  }

  savePreset(name: string, columns: import('$lib/types').ColumnConfig[]) {
    const preset: ColumnPreset = {
      id: crypto.randomUUID(),
      name,
      columns: $state.snapshot(columns) as import('$lib/types').ColumnConfig[],
      createdAt: Date.now(),
    };
    this.presets.push(preset);
    this.persist();
    return preset;
  }

  deletePreset(id: string) {
    this.presets = this.presets.filter((p) => p.id !== id);
    this.persist();
  }

  getPreset(id: string): ColumnPreset | undefined {
    return this.presets.find((p) => p.id === id);
  }
}

export const presetStore = new PresetStore();
