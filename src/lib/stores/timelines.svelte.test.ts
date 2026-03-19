import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_NOTE_DISPLAY, type ColumnConfig } from '$lib/types';

function makeColumn(overrides: Partial<ColumnConfig> = {}): ColumnConfig {
  return {
    id: 1,
    accountId: 1,
    channel: 'homeTimeline',
    channelName: 'Home',
    color: '#86b300',
    width: 'md',
    maxNotes: 100,
    bufferSize: 250,
    collapsed: false,
    autoCollapse: false,
    lowRate: false,
    reactionDeck: [],
    noteDisplay: { ...DEFAULT_NOTE_DISPLAY },
    ...overrides,
  };
}

describe('TimelineStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  async function getStore() {
    const { timelineStore } = await import('./timelines.svelte');
    return timelineStore;
  }

  it('initialises with empty array when localStorage is empty', async () => {
    const store = await getStore();
    expect(store.columns).toEqual([]);
  });

  it('restores columns from localStorage', async () => {
    const saved = [makeColumn({ id: 1 }), makeColumn({ id: 2, channelName: 'Local' })];
    localStorage.setItem('misslix:timelines', JSON.stringify(saved));
    const store = await getStore();
    expect(store.columns).toHaveLength(2);
  });

  it('addColumn() appends and persists', async () => {
    const store = await getStore();
    store.addColumn(makeColumn({ id: 10 }));
    expect(store.columns).toHaveLength(1);
    const persisted = JSON.parse(localStorage.getItem('misslix:timelines')!);
    expect(persisted).toHaveLength(1);
  });

  it('removeColumn() filters by id and persists', async () => {
    const store = await getStore();
    store.addColumn(makeColumn({ id: 1 }));
    store.addColumn(makeColumn({ id: 2 }));
    store.removeColumn(1);
    expect(store.columns).toHaveLength(1);
    expect(store.columns[0].id).toBe(2);
  });

  it('updateColumn() merges partial and persists', async () => {
    const store = await getStore();
    store.addColumn(makeColumn({ id: 1, channelName: 'Old' }));
    store.updateColumn(1, { channelName: 'New', color: '#ff0000' });
    expect(store.columns[0].channelName).toBe('New');
    expect(store.columns[0].color).toBe('#ff0000');
  });

  it('updateColumn() does nothing for non-existent id', async () => {
    const store = await getStore();
    store.addColumn(makeColumn({ id: 1 }));
    store.updateColumn(999, { channelName: 'Ghost' });
    expect(store.columns[0].channelName).toBe('Home');
  });

  it('moveColumn() swaps positions and persists', async () => {
    const store = await getStore();
    store.addColumn(makeColumn({ id: 1, channelName: 'A' }));
    store.addColumn(makeColumn({ id: 2, channelName: 'B' }));
    store.addColumn(makeColumn({ id: 3, channelName: 'C' }));
    store.moveColumn(0, 2);
    expect(store.columns.map((c) => c.channelName)).toEqual(['B', 'C', 'A']);
  });

  it('moveColumn() ignores out-of-range indices', async () => {
    const store = await getStore();
    store.addColumn(makeColumn({ id: 1 }));
    store.moveColumn(-1, 0);
    store.moveColumn(0, 5);
    expect(store.columns).toHaveLength(1);
  });

  it('createDefaultColumn() returns a column with correct defaults', async () => {
    const store = await getStore();
    const col = store.createDefaultColumn(42, 'localTimeline', 'Local');
    expect(col.accountId).toBe(42);
    expect(col.channel).toBe('localTimeline');
    expect(col.channelName).toBe('Local');
    expect(col.color).toBe('#86b300');
    expect(col.width).toBe('md');
    expect(col.maxNotes).toBe(100);
    expect(col.noteDisplay).toEqual(DEFAULT_NOTE_DISPLAY);
    expect(col.id).toBeGreaterThan(0);
  });

  it('createDefaultColumn() merges opts overrides', async () => {
    const store = await getStore();
    const col = store.createDefaultColumn(1, 'homeTimeline', 'Home', {
      color: '#000',
      width: 'lg',
    });
    expect(col.color).toBe('#000');
    expect(col.width).toBe('lg');
    expect(col.channelName).toBe('Home');
  });
});
