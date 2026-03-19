import { type SettingsType, DEFAULT_SETTINGS } from '$lib/types';
import { loadFromStorage, saveToStorage } from '$lib/utils/storage';

const STORAGE_KEY = 'settings';

class SettingsStore {
  settings = $state<SettingsType>(DEFAULT_SETTINGS);

  constructor() {
    this.restore();
  }

  restore() {
    this.settings = loadFromStorage<SettingsType>(STORAGE_KEY, DEFAULT_SETTINGS);
  }

  persist() {
    saveToStorage(STORAGE_KEY, this.settings);
  }

  update(partial: Partial<SettingsType>) {
    this.settings = { ...this.settings, ...partial };
    this.persist();
  }

  get theme() {
    return this.settings.theme;
  }

  set theme(value: string) {
    this.settings.theme = value;
    this.persist();
  }
}

export const settingsStore = new SettingsStore();
