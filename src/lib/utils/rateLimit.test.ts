import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isMisskeyIo,
  getRemainingCooldown,
  recordPost,
  clearCooldowns,
} from './rateLimit';

describe('isMisskeyIo', () => {
  it("'misskey.io' → true を返す", () => {
    expect(isMisskeyIo('misskey.io')).toBe(true);
  });

  it("'https://misskey.io' → true を返す", () => {
    expect(isMisskeyIo('https://misskey.io')).toBe(true);
  });

  it("'https://misskey.io/' → true を返す（末尾スラッシュを正規化）", () => {
    expect(isMisskeyIo('https://misskey.io/')).toBe(true);
  });

  it("'other.instance.com' → false を返す", () => {
    expect(isMisskeyIo('other.instance.com')).toBe(false);
  });

  it("'https://other.misskey.io' → false を返す", () => {
    expect(isMisskeyIo('https://other.misskey.io')).toBe(false);
  });

  it("空文字列 → false を返す", () => {
    expect(isMisskeyIo('')).toBe(false);
  });

  it("'http://misskey.io' → false を返す（https でないプロトコル）", () => {
    expect(isMisskeyIo('http://misskey.io')).toBe(false);
  });
});

describe('getRemainingCooldown / recordPost / clearCooldowns', () => {
  beforeEach(() => {
    clearCooldowns();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getRemainingCooldown', () => {
    it('未記録のアカウントは 0 を返す', () => {
      expect(getRemainingCooldown(1, 3000)).toBe(0);
    });

    it('recordPost 直後は 0 より大きい値を返す', () => {
      recordPost(42);
      const remaining = getRemainingCooldown(42, 3000);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(3000);
    });

    it('クールダウン時間を超えた後は 0 を返す', () => {
      recordPost(10);
      vi.advanceTimersByTime(3001);
      expect(getRemainingCooldown(10, 3000)).toBe(0);
    });

    it('クールダウン時間ちょうどでは 0 を返す', () => {
      recordPost(10);
      vi.advanceTimersByTime(3000);
      expect(getRemainingCooldown(10, 3000)).toBe(0);
    });

    it('カスタムクールダウン時間が適用される', () => {
      recordPost(99);
      vi.advanceTimersByTime(500);
      const remaining = getRemainingCooldown(99, 1000);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(500);
    });

    it('異なるアカウント ID は独立して管理される', () => {
      recordPost(1);
      vi.advanceTimersByTime(3001);
      recordPost(2);

      expect(getRemainingCooldown(1, 3000)).toBe(0);
      expect(getRemainingCooldown(2, 3000)).toBeGreaterThan(0);
    });
  });

  describe('recordPost', () => {
    it('呼び出し後に getRemainingCooldown が正の値を返す', () => {
      recordPost(5);
      expect(getRemainingCooldown(5, 3000)).toBeGreaterThan(0);
    });

    it('同一アカウントへの再呼び出しで時刻が更新される', () => {
      recordPost(7);
      vi.advanceTimersByTime(2000);
      recordPost(7);
      // 再記録後はクールダウンがリセットされる
      const remaining = getRemainingCooldown(7, 3000);
      expect(remaining).toBeGreaterThan(2000 - 100); // 約3000ms 残っているはず
    });
  });

  describe('clearCooldowns', () => {
    it('クリア後に getRemainingCooldown が 0 を返す', () => {
      recordPost(1);
      recordPost(2);
      clearCooldowns();
      expect(getRemainingCooldown(1, 3000)).toBe(0);
      expect(getRemainingCooldown(2, 3000)).toBe(0);
    });

    it('クリア後に recordPost が再び機能する', () => {
      recordPost(3);
      clearCooldowns();
      recordPost(3);
      expect(getRemainingCooldown(3, 3000)).toBeGreaterThan(0);
    });
  });
});
