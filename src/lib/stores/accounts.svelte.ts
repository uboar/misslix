import type { Account } from '$lib/types';
import { loadFromStorage, saveToStorage } from '$lib/utils/storage';
import { migrateAccounts } from '$lib/utils/migration';

const STORAGE_KEY = 'accounts';

class AccountStore {
  accounts = $state<Account[]>([]);

  get activeAccounts() {
    return this.accounts.filter((a) => a.ok);
  }

  constructor() {
    this.restore();
  }

  restore() {
    this.accounts = migrateAccounts(loadFromStorage<unknown>(STORAGE_KEY, null));
  }

  persist() {
    saveToStorage(STORAGE_KEY, this.accounts);
  }

  addAccount(account: Account) {
    this.accounts.push(account);
    this.persist();
  }

  removeAccount(id: number) {
    this.accounts = this.accounts.filter((a) => a.id !== id);
    this.persist();
  }

  findById(id: number): Account | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  updateAccount(id: number, partial: Partial<Account>) {
    const idx = this.accounts.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.accounts[idx] = { ...this.accounts[idx], ...partial };
      this.persist();
    }
  }
}

export const accountStore = new AccountStore();
