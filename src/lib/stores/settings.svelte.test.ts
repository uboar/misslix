import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '$lib/types';

describe('SettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset module cache so each test gets a fresh store instance
    vi.resetModules();
  });

  async function getStore() {
    const { settingsStore } = await import('./settings.svelte');
    return settingsStore;
  }

  it('initialises with DEFAULT_SETTINGS when localStorage is empty', async () => {
    const store = await getStore();
    expect(store.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('restores settings from localStorage', async () => {
    const saved = { ...DEFAULT_SETTINGS, theme: 'light', emojiSpace: false };
    localStorage.setItem('misslix:settings', JSON.stringify(saved));
    const store = await getStore();
    expect(store.settings.theme).toBe('light');
    expect(store.settings.emojiSpace).toBe(false);
  });

  it('update() merges partial settings and persists', async () => {
    const store = await getStore();
    store.update({ theme: 'solarized', virtualScroll: false });
    expect(store.settings.theme).toBe('solarized');
    expect(store.settings.virtualScroll).toBe(false);
    // Verify persistence
    const persisted = JSON.parse(localStorage.getItem('misslix:settings')!);
    expect(persisted.theme).toBe('solarized');
  });

  it('theme getter returns current theme', async () => {
    const store = await getStore();
    expect(store.theme).toBe('dark');
  });

  it('theme setter updates and persists', async () => {
    const store = await getStore();
    store.theme = 'catppuccin';
    expect(store.theme).toBe('catppuccin');
    const persisted = JSON.parse(localStorage.getItem('misslix:settings')!);
    expect(persisted.theme).toBe('catppuccin');
  });

  it('persist() saves current state to localStorage', async () => {
    const store = await getStore();
    store.settings.notificationBuffer = 50;
    store.persist();
    const persisted = JSON.parse(localStorage.getItem('misslix:settings')!);
    expect(persisted.notificationBuffer).toBe(50);
  });
});
