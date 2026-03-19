import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadFromStorage, saveToStorage, removeFromStorage } from './storage';

describe('storage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadFromStorage', () => {
    it('returns fallback when key does not exist', () => {
      expect(loadFromStorage('missing', 42)).toBe(42);
    });

    it('returns parsed value when key exists', () => {
      localStorage.setItem('misslix:greeting', JSON.stringify('hello'));
      expect(loadFromStorage('greeting', 'default')).toBe('hello');
    });

    it('returns parsed object when key exists', () => {
      const obj = { a: 1, b: [2, 3] };
      localStorage.setItem('misslix:obj', JSON.stringify(obj));
      expect(loadFromStorage('obj', {})).toEqual(obj);
    });

    it('returns fallback when stored value is invalid JSON', () => {
      localStorage.setItem('misslix:bad', '{not json}');
      expect(loadFromStorage('bad', 'fallback')).toBe('fallback');
    });

    it('uses "misslix:" prefix for keys', () => {
      localStorage.setItem('misslix:prefixed', JSON.stringify('yes'));
      // Without prefix should not find the value
      expect(localStorage.getItem('prefixed')).toBeNull();
      expect(loadFromStorage('prefixed', 'no')).toBe('yes');
    });
  });

  describe('saveToStorage', () => {
    it('saves a string value with prefix', () => {
      saveToStorage('key1', 'value1');
      expect(localStorage.getItem('misslix:key1')).toBe('"value1"');
    });

    it('saves an object value as JSON', () => {
      const data = { x: 10, y: [1, 2] };
      saveToStorage('data', data);
      expect(JSON.parse(localStorage.getItem('misslix:data')!)).toEqual(data);
    });

    it('saves a number value', () => {
      saveToStorage('num', 123);
      expect(loadFromStorage('num', 0)).toBe(123);
    });

    it('does not throw when localStorage is unavailable', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => saveToStorage('fail', 'data')).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('removeFromStorage', () => {
    it('removes an existing key', () => {
      saveToStorage('toRemove', 'exists');
      expect(loadFromStorage('toRemove', 'gone')).toBe('exists');
      removeFromStorage('toRemove');
      expect(loadFromStorage('toRemove', 'gone')).toBe('gone');
    });

    it('does not throw when key does not exist', () => {
      expect(() => removeFromStorage('nonexistent')).not.toThrow();
    });

    it('does not throw when localStorage is unavailable', () => {
      const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(() => removeFromStorage('any')).not.toThrow();
      spy.mockRestore();
    });
  });
});
