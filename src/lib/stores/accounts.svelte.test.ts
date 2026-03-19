import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Account } from '$lib/types';

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 1,
    userName: 'testuser',
    hostUrl: 'https://example.com',
    token: 'tok_abc',
    ok: true,
    ...overrides,
  };
}

describe('AccountStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  async function getStore() {
    const { accountStore } = await import('./accounts.svelte');
    return accountStore;
  }

  it('initialises with empty array when localStorage is empty', async () => {
    const store = await getStore();
    expect(store.accounts).toEqual([]);
  });

  it('restores accounts from localStorage', async () => {
    const saved = [makeAccount({ id: 1 }), makeAccount({ id: 2, userName: 'user2' })];
    localStorage.setItem('misslix:accounts', JSON.stringify(saved));
    const store = await getStore();
    expect(store.accounts).toHaveLength(2);
    expect(store.accounts[1].userName).toBe('user2');
  });

  it('addAccount() appends and persists', async () => {
    const store = await getStore();
    store.addAccount(makeAccount({ id: 10 }));
    expect(store.accounts).toHaveLength(1);
    expect(store.accounts[0].id).toBe(10);
    const persisted = JSON.parse(localStorage.getItem('misslix:accounts')!);
    expect(persisted).toHaveLength(1);
  });

  it('removeAccount() filters by id and persists', async () => {
    const store = await getStore();
    store.addAccount(makeAccount({ id: 1 }));
    store.addAccount(makeAccount({ id: 2 }));
    store.removeAccount(1);
    expect(store.accounts).toHaveLength(1);
    expect(store.accounts[0].id).toBe(2);
  });

  it('findById() returns correct account or undefined', async () => {
    const store = await getStore();
    store.addAccount(makeAccount({ id: 5, userName: 'found' }));
    expect(store.findById(5)?.userName).toBe('found');
    expect(store.findById(999)).toBeUndefined();
  });

  it('updateAccount() merges partial and persists', async () => {
    const store = await getStore();
    store.addAccount(makeAccount({ id: 1, userName: 'old' }));
    store.updateAccount(1, { userName: 'new' });
    expect(store.accounts[0].userName).toBe('new');
    const persisted = JSON.parse(localStorage.getItem('misslix:accounts')!);
    expect(persisted[0].userName).toBe('new');
  });

  it('updateAccount() does nothing for non-existent id', async () => {
    const store = await getStore();
    store.addAccount(makeAccount({ id: 1 }));
    store.updateAccount(999, { userName: 'ghost' });
    expect(store.accounts).toHaveLength(1);
    expect(store.accounts[0].userName).toBe('testuser');
  });

  it('activeAccounts returns only accounts with ok=true', async () => {
    const store = await getStore();
    store.addAccount(makeAccount({ id: 1, ok: true }));
    store.addAccount(makeAccount({ id: 2, ok: false }));
    store.addAccount(makeAccount({ id: 3, ok: true }));
    const active = store.activeAccounts;
    expect(active).toHaveLength(2);
    expect(active.map((a) => a.id)).toEqual([1, 3]);
  });
});
